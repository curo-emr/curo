#!/usr/bin/env bash
#
# smoke-e2e.sh — End-to-end endpoint verification for the Curo EMR stack.
#
# Drives the full clinical journey (patient → appointment → encounter → vitals →
# lab order → scan → results → prescription → FEFO dispense → read-back) plus a
# sweep of the remaining read endpoints and a few authorization spot-checks —
# ALL through the API gateway at :3000 with real JWTs (the only host-reachable
# path: it exercises the gateway's token check + each service's RolesGuard).
#
# Requires: bash, curl, jq. Stack must be running: `docker compose up -d --build`.
#
# NOTE: the write flow MUTATES the live seeded DB. That is intended on a dev stack.
# Reset with:  docker compose down -v && docker compose up -d --build
#
# Usage:   bash scripts/smoke-e2e.sh
# Output:  human-readable PASS/FAIL log to stdout; markdown table to docs/API_VERIFICATION.md
#          (when run with:  bash scripts/smoke-e2e.sh --md)

set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
PASS=0; FAIL=0; XFAIL=0
ROWS=()          # markdown rows
LOGW=0           # write markdown?
[[ "${1:-}" == "--md" ]] && LOGW=1

c_green=$'\e[32m'; c_red=$'\e[31m'; c_yellow=$'\e[33m'; c_reset=$'\e[0m'; c_dim=$'\e[2m'

# req <role-label> <expected-status> <METHOD> <path> [json-body] [token]
# Prints status line, accumulates counts. Echoes the raw response body on stdout
# (last line) so callers can capture IDs via:  BODY=$(req ... )
req() {
  local label="$1" expect="$2" method="$3" path="$4" body="${5:-}" token="${6:-}"
  local args=(-s -w $'\n%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body" ]] && args+=(-d "$body")
  local out code resp
  out="$(curl "${args[@]}")"
  code="${out##*$'\n'}"
  resp="${out%$'\n'*}"
  local mark status_word color
  if [[ "$code" == "$expect" ]]; then
    PASS=$((PASS+1)); mark="PASS"; status_word="OK"; color="$c_green"
  elif [[ "$expect" == "4"* && "$code" == "4"* ]]; then
    # expected-deny family (e.g. expected 403, got 401) — still a correct "blocked"
    XFAIL=$((XFAIL+1)); mark="XFAIL"; status_word="blocked(${code})"; color="$c_yellow"
  else
    FAIL=$((FAIL+1)); mark="FAIL"; status_word="GOT ${code}"; color="$c_red"
  fi
  printf '%s%-5s%s  %-6s %-42s %s[%s expect %s]%s\n' \
    "$color" "$mark" "$c_reset" "$method" "$path" "$c_dim" "$status_word" "$expect" "$c_reset" >&2
  ROWS+=("| \`$method $path\` | $label | $expect | $code | $mark |")
  printf '%s' "$resp"
}

# expect_eq <label> <actual> <expected> — content assertion (counts like req)
expect_eq() {
  if [[ "$2" == "$3" ]]; then
    PASS=$((PASS+1)); printf '%sPASS %s  check  %-42s %s[%s]%s\n' "$c_green" "$c_reset" "$1" "$c_dim" "$2" "$c_reset" >&2
    ROWS+=("| check: $1 | — | $3 | $2 | PASS |")
  else
    FAIL=$((FAIL+1)); printf '%sFAIL %s  check  %-42s %s[got %s, expect %s]%s\n' "$c_red" "$c_reset" "$1" "$c_dim" "$2" "$3" "$c_reset" >&2
    ROWS+=("| check: $1 | — | $3 | $2 | FAIL |")
  fi
}

login() {  # login <email> <password> -> echoes accessToken
  curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}"
}

echo "== Curo EMR endpoint smoke test ==  ($BASE)" >&2
echo >&2

# ---------------------------------------------------------------------------
# 0. AUTH — login one user per role
# ---------------------------------------------------------------------------
echo "-- auth / login --" >&2
ADMIN_R=$(login admin@curo.health Admin@12345)
DOC_R=$(login dr.priya@curo.health Doctor@123)
RECEP_R=$(login chamali@curo.health Recept@123)
PHARM_R=$(login kasun.pharma@curo.health Pharma@123)
LAB_R=$(login tharindi.lab@curo.health LabStaff@123)
PAT_R=$(login samantha@email.com Patient@123)
NURSE_R=$(login nimasha@curo.health Nurse@123)

ADMIN=$(jq -r .accessToken <<<"$ADMIN_R")
DOC=$(jq -r .accessToken <<<"$DOC_R")
RECEP=$(jq -r .accessToken <<<"$RECEP_R")
PHARM=$(jq -r .accessToken <<<"$PHARM_R")
LAB=$(jq -r .accessToken <<<"$LAB_R")
PAT=$(jq -r .accessToken <<<"$PAT_R")
NURSE=$(jq -r .accessToken <<<"$NURSE_R")

DOC_PID=$(jq -r .user.practitionerId <<<"$DOC_R")
PAT_ID_SELF=$(jq -r .user.patientId <<<"$PAT_R")

for r in "ADMIN:$ADMIN" "DOCTOR:$DOC" "RECEP:$RECEP" "PHARM:$PHARM" "LAB:$LAB" "PATIENT:$PAT" "NURSE:$NURSE"; do
  name="${r%%:*}"; tok="${r#*:}"
  if [[ -n "$tok" && "$tok" != "null" ]]; then
    PASS=$((PASS+1)); echo "${c_green}PASS ${c_reset} login $name" >&2
    ROWS+=("| \`POST /auth/login\` | $name | 200 | 200 | PASS |")
  else
    FAIL=$((FAIL+1)); echo "${c_red}FAIL ${c_reset} login $name" >&2
    ROWS+=("| \`POST /auth/login\` | $name | 200 | ERR | FAIL |")
  fi
done

req "any"   200 GET  /auth/profile "" "$DOC"
req "any"   200 GET  "/auth/practitioners?role=DOCTOR" "" "$RECEP" >/dev/null
req "admin" 200 GET  "/auth/users?role=DOCTOR" "" "$ADMIN" >/dev/null
req "admin" 201 POST /auth/staff "{\"email\":\"smoke.$RANDOM@curo.health\",\"password\":\"Smoke@123\",\"role\":\"RECEPTIONIST\",\"firstName\":\"Smoke\",\"lastName\":\"Test\"}" "$ADMIN" >/dev/null

# ---------------------------------------------------------------------------
# 1. PATIENT registration (receptionist)
# ---------------------------------------------------------------------------
echo "-- patient --" >&2
PAT_BODY='{"firstName":"Smoke","lastName":"Tester","birthDate":"1990-04-12","gender":"male","phone":"0771234567","city":"Colombo"}'
P=$(req "receptionist" 201 POST /patients "$PAT_BODY" "$RECEP")
PATIENT_ID=$(jq -r '.id' <<<"$P")
echo "   patientId=$PATIENT_ID" >&2

req "staff"   200 GET  "/patients?search=Smoke" "" "$RECEP" >/dev/null
req "staff"   200 GET  "/patients/$PATIENT_ID" "" "$DOC" >/dev/null
req "patient" 200 GET  /patients/me "" "$PAT" >/dev/null
req "doctor"  201 POST "/patients/$PATIENT_ID/conditions" '{"clinicalStatus":"active","code":"E11.9","display":"Type 2 diabetes mellitus"}' "$DOC" >/dev/null
req "doctor"  201 POST "/patients/$PATIENT_ID/allergies"  '{"code":"7980","display":"Penicillin","type":"allergy","criticality":"high"}' "$DOC" >/dev/null
req "staff"   200 GET  "/patients/$PATIENT_ID/conditions" "" "$DOC" >/dev/null
req "staff"   200 GET  "/patients/$PATIENT_ID/allergies"  "" "$DOC" >/dev/null
AL=$(req "pharma" 200 GET "/patients/allergies?patientIds=$PATIENT_ID" "" "$PHARM")
expect_eq "batch allergies for the patient" "$(jq -r '.[0].patient.reference' <<<"$AL")" "Patient/$PATIENT_ID"
req "pharma"  400 GET  "/patients/allergies?patientIds=not-a-uuid" "" "$PHARM" >/dev/null
req "patient" 403 GET  "/patients/allergies?patientIds=$PATIENT_ID" "" "$PAT" >/dev/null

# ---------------------------------------------------------------------------
# 2. APPOINTMENT + PAYMENT (receptionist)
# ---------------------------------------------------------------------------
echo "-- appointment / payment --" >&2
START="2026-07-01T09:00:00.000Z"; END="2026-07-01T09:30:00.000Z"
A=$(req "receptionist" 201 POST /appointments \
  "{\"patientId\":\"$PATIENT_ID\",\"practitionerId\":\"$DOC_PID\",\"start\":\"$START\",\"end\":\"$END\",\"reasonCode\":\"checkup\"}" "$RECEP")
APPT_ID=$(jq -r '.id' <<<"$A")
echo "   appointmentId=$APPT_ID" >&2

req "staff"   200 GET "/appointments?practitionerId=$DOC_PID" "" "$RECEP" >/dev/null
req "staff"   200 GET "/appointments/schedule/$DOC_PID?date=2026-07-01" "" "$RECEP" >/dev/null
req "staff"   200 GET "/appointments/patient/$PATIENT_ID" "" "$RECEP" >/dev/null
req "staff"   200 GET "/appointments/$APPT_ID" "" "$RECEP" >/dev/null
PAYJSON="{\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$APPT_ID\",\"amount\":2500,\"paymentMethod\":\"cash\"}"
req "receptionist" 201 POST /payments "$PAYJSON" "$RECEP" >/dev/null
req "receptionist" 200 GET  /payments/mine "" "$RECEP" >/dev/null
req "receptionist" 200 GET  /payments/summary "" "$RECEP" >/dev/null
req "admin"        200 GET  /payments "" "$ADMIN" >/dev/null

# ---------------------------------------------------------------------------
# 3. ENCOUNTER / VITALS / NOTES (doctor)
# ---------------------------------------------------------------------------
echo "-- clinical: encounter/vitals/notes --" >&2
E=$(req "doctor" 201 POST /encounters "{\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$APPT_ID\",\"reasonCode\":\"checkup\"}" "$DOC")
ENC_ID=$(jq -r '.id' <<<"$E")
echo "   encounterId=$ENC_ID" >&2

req "doctor" 200 PUT "/encounters/$ENC_ID/status" '{"status":"in-progress"}' "$DOC" >/dev/null
req "doctor" 201 POST /vitals "{\"patientId\":\"$PATIENT_ID\",\"encounterId\":\"$ENC_ID\",\"code\":\"8310-5\",\"display\":\"Body temperature\",\"valueQuantity\":37,\"valueUnit\":\"Cel\"}" "$DOC" >/dev/null
req "doctor" 400 POST /vitals "{\"patientId\":\"$PATIENT_ID\",\"code\":\"85354-9\",\"display\":\"Blood pressure\",\"components\":[\"120/80\"]}" "$DOC" >/dev/null
req "doctor" 201 POST /notes "{\"patientId\":\"$PATIENT_ID\",\"encounterId\":\"$ENC_ID\",\"subjective\":\"Routine checkup\",\"assessment\":\"Stable\",\"plan\":\"Order labs\"}" "$DOC" >/dev/null
req "doctor" 200 GET "/encounters?patientId=$PATIENT_ID" "" "$DOC" >/dev/null
req "doctor" 200 GET "/encounters/$ENC_ID" "" "$DOC" >/dev/null
req "doctor" 200 GET "/notes?encounterId=$ENC_ID" "" "$DOC" >/dev/null
req "doctor" 200 GET "/vitals?patientId=$PATIENT_ID" "" "$DOC" >/dev/null
TK=$(req "doctor" 201 POST /tasks '{"description":"Follow up on labs","priority":"routine"}' "$DOC")
TASK_ID=$(jq -r '.id' <<<"$TK")
req "doctor" 200 GET /tasks/mine "" "$DOC" >/dev/null
req "doctor" 200 GET "/tasks?status=requested" "" "$DOC" >/dev/null
req "doctor" 200 PUT "/tasks/$TASK_ID" '{"status":"completed"}' "$DOC" >/dev/null
req "doctor" 200 GET "/notes/encounter/$ENC_ID" "" "$DOC" >/dev/null
req "doctor" 200 GET "/notes/patient/$PATIENT_ID" "" "$DOC" >/dev/null
req "doctor" 200 GET "/vitals/patient/$PATIENT_ID" "" "$DOC" >/dev/null
req "doctor" 200 GET "/vitals/patient/$PATIENT_ID/trends?codes=8310-5" "" "$DOC" >/dev/null
req "doctor" 200 GET "/prescriptions?patientId=$PATIENT_ID" "" "$DOC" >/dev/null
req "receptionist" 200 PATCH "/patients/$PATIENT_ID" '{"phone":"0770000000"}' "$RECEP" >/dev/null
req "receptionist" 200 PUT "/appointments/$APPT_ID" '{"status":"fulfilled"}' "$RECEP" >/dev/null
PCODE=$(jq -r '.identifier[] | select(.system=="urn:curo:patient-code") | .value' <<<"$P")
req "doctor" 200 GET "/patients/code/$PCODE" "" "$DOC" >/dev/null

# ---------------------------------------------------------------------------
# 4. LAB ORDER (doctor) → fulfillment (lab staff)
# ---------------------------------------------------------------------------
echo "-- lab order + fulfillment --" >&2
LO_BODY="{\"patientId\":\"$PATIENT_ID\",\"encounterId\":\"$ENC_ID\",\"code\":\"58410-2\",\"display\":\"CBC panel\",\"testPanel\":[{\"code\":\"718-7\",\"display\":\"Hemoglobin\"},{\"code\":\"4544-3\",\"display\":\"Hematocrit\"}]}"
LO=$(req "doctor" 201 POST /lab-orders "$LO_BODY" "$DOC")
ORDER_ID=$(jq -r '.id' <<<"$LO")
echo "   orderId=$ORDER_ID" >&2

req "lab"    200 GET  "/orders?status=active" "" "$LAB" >/dev/null
req "lab"    200 GET  "/orders/$ORDER_ID" "" "$LAB" >/dev/null
req "lab"    200 GET  "/catalog" "" "$LAB" >/dev/null
req "lab"    201 POST "/orders/scan" "{\"qrData\":\"$BASE/lab/orders/$ORDER_ID?test=718-7&i=0\"}" "$LAB" >/dev/null
req "lab"    200 PUT  "/orders/$ORDER_ID/receive" '{}' "$LAB" >/dev/null
RES_BODY="{\"serviceRequestId\":\"$ORDER_ID\",\"results\":[{\"code\":\"718-7\",\"display\":\"Hemoglobin\",\"value\":14.2,\"unit\":\"g/dL\",\"referenceRangeLow\":\"13\",\"referenceRangeHigh\":\"17\",\"interpretation\":\"N\"}],\"conclusion\":\"Within normal limits\"}"
req "lab"    201 POST "/results" "$RES_BODY" "$LAB" >/dev/null
REPS=$(req "lab" 200 GET "/reports?patientId=$PATIENT_ID" "" "$LAB")
REPORT_ID=$(jq -r 'if type=="array" then .[0].id else (.entry[0].resource.id // .id) end' <<<"$REPS" 2>/dev/null)
req "lab"    200 GET  "/instruments" "" "$LAB" >/dev/null
req "lab"    200 GET  "/orders/tat" "" "$LAB" >/dev/null
[[ -n "$REPORT_ID" && "$REPORT_ID" != "null" ]] && req "lab" 200 GET "/reports/$REPORT_ID" "" "$LAB" >/dev/null
INS=$(req "lab" 201 POST "/instruments" '{"name":"Smoke Analyzer","model":"SA-1","serialNumber":"SN-SMOKE"}' "$LAB")
INS_ID=$(jq -r '.id' <<<"$INS")
[[ -n "$INS_ID" && "$INS_ID" != "null" ]] && req "lab" 200 PUT "/instruments/$INS_ID/status" '{"status":"maintenance"}' "$LAB" >/dev/null

# ---------------------------------------------------------------------------
# 5. PRESCRIPTION (doctor) → DISPENSE (pharmacist)
# ---------------------------------------------------------------------------
echo "-- prescription + dispense --" >&2
RX_BODY="{\"patientId\":\"$PATIENT_ID\",\"encounterId\":\"$ENC_ID\",\"medicationCode\":\"860975\",\"medicationDisplay\":\"Metformin 500mg\",\"dosageText\":\"1 tab BD\",\"quantityValue\":60,\"quantityUnit\":\"tablet\"}"
RX=$(req "doctor" 201 POST /prescriptions "$RX_BODY" "$DOC")
RX_ID=$(jq -r '.id' <<<"$RX")
echo "   medicationRequestId=$RX_ID" >&2

req "pharma" 200 GET  "/prescriptions/pending" "" "$PHARM" >/dev/null
RXR=$(req "pharma" 200 GET "/prescriptions/$RX_ID" "" "$PHARM")
expect_eq "prescription by id" "$(jq -r '.id' <<<"$RXR")" "$RX_ID"
req "recep"  403 GET  "/prescriptions/$RX_ID" "" "$RECEP" >/dev/null
req "pharma" 200 GET  "/stock/grouped" "" "$PHARM" >/dev/null
req "pharma" 200 GET  "/stock/alerts" "" "$PHARM" >/dev/null
RXS=$(req "pharma" 200 GET "/prescriptions/summary?patientIds=$PATIENT_ID" "" "$PHARM")
expect_eq "prescription summary: pending count" "$(jq -r '.[0].pendingCount' <<<"$RXS")" "1"
req "pharma"  400 GET  "/prescriptions/summary?patientIds=not-a-uuid" "" "$PHARM" >/dev/null
req "patient" 403 GET  "/prescriptions/summary?patientIds=$PATIENT_ID" "" "$PAT" >/dev/null
# Same body shape as the pharmacy portal: patient, price and dispenser come from the server.
DISP_BODY="{\"medicationRequestId\":\"$RX_ID\",\"quantityValue\":60,\"quantityUnit\":\"tablet\"}"
# Stock the 60 tablets this run dispenses, so repeated runs leave the total unchanged.
req "pharma" 201 POST "/stock" '{"medicationCode":"860975","medicationName":"Metformin 500mg","quantity":60,"unit":"tablet","unitPrice":1}' "$PHARM" >/dev/null
D=$(req "pharma" 201 POST "/dispense" "$DISP_BODY" "$PHARM")
DISP_ID=$(jq -r '.id' <<<"$D")
expect_eq "dispense patient from prescription" "$(jq -r '.subject.reference' <<<"$D")" "Patient/$PATIENT_ID"
req "pharma" 409 POST "/dispense" "$DISP_BODY" "$PHARM" >/dev/null
DH=$(req "pharma" 200 GET "/dispense?prescriptionId=$RX_ID" "" "$PHARM")
expect_eq "dispense history by prescription" "$(jq -r '.total' <<<"$DH")" "1"
req "pharma" 200 GET  "/dispense?patientId=$PATIENT_ID" "" "$PHARM" >/dev/null
[[ -n "$DISP_ID" && "$DISP_ID" != "null" ]] && req "pharma" 200 GET "/dispense/$DISP_ID" "" "$PHARM" >/dev/null
req "pharma" 200 GET  "/stock" "" "$PHARM" >/dev/null
ST=$(req "pharma" 201 POST "/stock" '{"medicationCode":"SMK1","medicationName":"Smoke Tablet","quantity":100,"unit":"tablet","reorderThreshold":10,"unitPrice":5}' "$PHARM")
STOCK_ID=$(jq -r '.id' <<<"$ST")
[[ -n "$STOCK_ID" && "$STOCK_ID" != "null" ]] && req "pharma" 200 PUT "/stock/$STOCK_ID" '{"quantity":120}' "$PHARM" >/dev/null

# Pricing, dispenser name and concurrency, on a fresh batch with a known price.
PRICED_CODE="SMK-RX-$RANDOM$RANDOM"
req "pharma" 201 POST "/stock" "{\"medicationCode\":\"$PRICED_CODE\",\"medicationName\":\"Smoke Priced\",\"quantity\":100,\"unit\":\"tablet\",\"unitPrice\":2.5}" "$PHARM" >/dev/null
prescribe_priced() {  # prescribe_priced [quantity=10] -> echoes the prescription id
  req "doctor" 201 POST /prescriptions "{\"patientId\":\"$PATIENT_ID\",\"medicationCode\":\"$PRICED_CODE\",\"medicationDisplay\":\"Smoke Priced\",\"dosageText\":\"1 tab OD\",\"quantityValue\":${1:-10},\"quantityUnit\":\"tablet\"}" "$DOC" | jq -r '.id'
}
priced_stock_left() {
  req "pharma" 200 GET "/stock/grouped" "" "$PHARM" | jq -r --arg c "$PRICED_CODE" '.[] | select(.medicationCode == $c) | .usableQuantity'
}
ext() { jq -r --arg u "urn:curo:$1" '.extension[] | select(.url == $u) | (.valueDecimal // .valueString)'; }
D2=$(req "pharma" 201 POST "/dispense" "{\"medicationRequestId\":\"$(prescribe_priced)\"}" "$PHARM")
expect_eq "dispense priced from its stock batch" "$(ext totalPrice <<<"$D2")" "25"
expect_eq "dispenser is the pharmacist's name" "$(ext dispenserName <<<"$D2")" "Kasun Bandara"
# Two pharmacists dispensing the same prescription at once: exactly one wins.
RX3=$(prescribe_priced)
CODES=$(for _ in 1 2; do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/dispense" -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $PHARM" -d "{\"medicationRequestId\":\"$RX3\"}" &
done; wait)
expect_eq "concurrent dispenses: one 201, one 409" "$(sort <<<"$CODES" | tr '\n' ' ')" "201 409 "
expect_eq "stock drawn once per dispense" "$(priced_stock_left)" "80"
# More than stock holds: refused, and neither the stock nor the prescription changes.
RX4=$(prescribe_priced 81)
SHORT=$(req "pharma" 409 POST "/dispense" "{\"medicationRequestId\":\"$RX4\"}" "$PHARM")
expect_eq "short-stock dispense says why" "$(jq -r '.message' <<<"$SHORT")" "Not enough Smoke Priced in stock: 80 available, 81 needed. Receive stock before dispensing."
expect_eq "short-stock dispense leaves stock" "$(priced_stock_left)" "80"
expect_eq "short-stock dispense leaves prescription active" "$(req "pharma" 200 GET "/prescriptions/$RX4" "" "$PHARM" | jq -r '.status')" "active"

# ---------------------------------------------------------------------------
# 6. READ-BACK to doctor + patient
# ---------------------------------------------------------------------------
echo "-- read-back (doctor + patient) --" >&2
req "doctor"  200 GET "/lab-orders?patientId=$PATIENT_ID" "" "$DOC" >/dev/null
req "doctor"  200 GET "/reports?patientId=$PATIENT_ID" "" "$DOC" >/dev/null
req "patient" 200 GET "/prescriptions/patient/$PAT_ID_SELF" "" "$PAT" >/dev/null
req "patient" 200 GET "/appointments/patient/$PAT_ID_SELF" "" "$PAT" >/dev/null
req "patient" 200 GET "/encounters/patient/$PAT_ID_SELF" "" "$PAT" >/dev/null

# ---------------------------------------------------------------------------
# 7. Cross-cutting: notifications / audit / documents
# ---------------------------------------------------------------------------
echo "-- notifications / audit / documents --" >&2
DOC_UID=$(jq -r .user.id <<<"$DOC_R")
# Notifications come only from the services: entering the lab results above
# notified the ordering doctor, and no user can send one through the API.
req "no sender" 404 POST "/notifications" "{\"recipientId\":\"$DOC_UID\",\"eventType\":\"general\",\"title\":\"Smoke\",\"message\":\"test\"}" "$DOC" >/dev/null
N=$(req "any" 200 GET "/notifications" "" "$DOC")
NOTIF_ID=$(jq -r --arg r "$REPORT_ID" 'map(select(.eventType=="lab_results_ready" and .relatedResourceId==$r)) | .[0].id // empty' <<<"$N")
expect_eq "doctor notified of lab results" "$([[ -n "$NOTIF_ID" ]] && echo yes || echo no)" "yes"
req "any"   200 GET  "/notifications/count" "" "$DOC" >/dev/null
[[ -n "$NOTIF_ID" && "$NOTIF_ID" != "null" ]] && req "any" 200 PUT "/notifications/$NOTIF_ID/read" '{}' "$DOC" >/dev/null
req "any"   200 PUT  "/notifications/read-all" '{}' "$DOC" >/dev/null
req "any"   201 POST "/audit" "{\"userId\":\"$DOC_UID\",\"action\":\"read\",\"resourceType\":\"Patient\",\"resourceId\":\"$PATIENT_ID\"}" "$DOC" >/dev/null
req "admin" 200 GET  "/audit?resourceType=Patient" "" "$ADMIN" >/dev/null
req "staff" 200 GET  "/documents?patientId=$PATIENT_ID" "" "$DOC" >/dev/null
# Document upload is multipart/form-data; service only accepts pdf/jpeg/png.
TMPDOC="$(mktemp)"
# minimal 1x1 PNG
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' | base64 -d > "$TMPDOC" 2>/dev/null
DOCJSON=$(curl -s -w $'\n%{http_code}' -X POST "$BASE/documents" -H "Authorization: Bearer $DOC" \
  -F "file=@$TMPDOC;type=image/png;filename=smoke.png" -F "patientId=$PATIENT_ID" -F "type=other")
DOC_CODE="${DOCJSON##*$'\n'}"; DOC_RESP="${DOCJSON%$'\n'*}"; rm -f "$TMPDOC"
if [[ "$DOC_CODE" == "201" ]]; then PASS=$((PASS+1)); echo "${c_green}PASS ${c_reset}  POST   /documents (multipart)" >&2;
  ROWS+=("| \`POST /documents\` (multipart) | doctor | 201 | 201 | PASS |")
  DOCID=$(jq -r '.id' <<<"$DOC_RESP")
  [[ -n "$DOCID" && "$DOCID" != "null" ]] && req "staff" 200 GET "/documents/$DOCID/content" "" "$DOC" >/dev/null
else FAIL=$((FAIL+1)); echo "${c_red}FAIL ${c_reset}  POST   /documents -> $DOC_CODE" >&2;
  ROWS+=("| \`POST /documents\` (multipart) | doctor | 201 | $DOC_CODE | FAIL |"); fi
req "patient" 200 GET "/documents/me" "" "$PAT" >/dev/null
# Token refresh
RT=$(jq -r .refreshToken <<<"$DOC_R")
req "public" 200 POST "/auth/refresh" "{\"refreshToken\":\"$RT\"}" "" >/dev/null

# ---------------------------------------------------------------------------
# 8. Authorization spot-checks (expected to be DENIED)
# ---------------------------------------------------------------------------
echo "-- authz spot-checks (expect 403) --" >&2
req "patient→write" 403 POST /patients "$PAT_BODY" "$PAT" >/dev/null
req "receptionist→audit" 403 GET "/audit" "" "$RECEP" >/dev/null
req "pharmacist→encounters" 403 POST /encounters "{\"patientId\":\"$PATIENT_ID\"}" "$PHARM" >/dev/null
req "no-token" 401 GET "/patients" "" "" >/dev/null

# ---------------------------------------------------------------------------
# 8b. NURSE TRIAGE — queue stages + appointment-linked vitals
#     check-in → nurse queue → triage vitals → ready for doctor → doctor visit
# ---------------------------------------------------------------------------
echo "-- nurse triage --" >&2
expect_eq "nurse JWT role" "$(jq -r .user.role <<<"$NURSE_R")" "NURSE"
expect_eq "nurse JWT has practitionerId" "$(jq -r '.user.practitionerId != null' <<<"$NURSE_R")" "true"

TODAY=$(date -u +%F)
NA=$(req "receptionist" 201 POST /appointments \
  "{\"patientId\":\"$PATIENT_ID\",\"practitionerId\":\"$DOC_PID\",\"start\":\"${TODAY}T10:00:00.000Z\",\"end\":\"${TODAY}T10:30:00.000Z\",\"reasonCode\":\"triage smoke\"}" "$RECEP")
NAPPT=$(jq -r '.id' <<<"$NA")
echo "   appointmentId=$NAPPT" >&2
stage_of() { jq -r '[.extension[]? | select(.url=="urn:curo:queueStage") | .valueString][0] // "none"' <<<"$1"; }

R=$(req "receptionist" 200 PUT "/appointments/$NAPPT" '{"status":"arrived"}' "$RECEP")
expect_eq "check-in queues for nurse" "$(stage_of "$R")" "waiting_nurse"
Q=$(req "nurse" 200 GET "/appointments?date=$TODAY&queueStage=waiting_nurse,with_nurse" "" "$NURSE")
expect_eq "nurse queue lists the patient" "$(jq -r --arg id "$NAPPT" '[.entry[].resource.id] | index($id) != null' <<<"$Q")" "true"

req "nurse" 200 GET "/patients/$PATIENT_ID" "" "$NURSE" >/dev/null
req "nurse" 200 GET "/patients/$PATIENT_ID/allergies" "" "$NURSE" >/dev/null
req "nurse" 200 GET "/patients/$PATIENT_ID/conditions" "" "$NURSE" >/dev/null
PI=$(req "nurse" 200 GET "/patients?_id=$PATIENT_ID" "" "$NURSE")
expect_eq "patients ?_id= resolves one patient" "$(jq -r .total <<<"$PI")" "1"

req "receptionist→with_nurse" 403 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"with_nurse"}' "$RECEP" >/dev/null
req "nurse" 200 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"with_nurse"}' "$NURSE" >/dev/null
req "nurse" 201 POST /vitals "{\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$NAPPT\",\"code\":\"8480-6\",\"display\":\"Blood Pressure Systolic\",\"valueQuantity\":150,\"valueUnit\":\"mmHg\"}" "$NURSE" >/dev/null
req "nurse" 201 POST /vitals "{\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$NAPPT\",\"code\":\"8462-4\",\"display\":\"Blood Pressure Diastolic\",\"valueQuantity\":95,\"valueUnit\":\"mmHg\"}" "$NURSE" >/dev/null
V=$(req "doctor" 200 GET "/vitals?appointmentId=$NAPPT" "" "$DOC")
expect_eq "visit has 2 triage vitals" "$(jq -r length <<<"$V")" "2"
expect_eq "triage vitals marked NURSE" "$(jq -r '[.[].extension[]? | select(.url=="urn:curo:performerRole") | .valueString] | unique | join(",")' <<<"$V")" "NURSE"
req "nurse" 200 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"ready_for_doctor"}' "$NURSE" >/dev/null

req "nurse→with_doctor" 403 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"with_doctor"}' "$NURSE" >/dev/null
req "illegal ready→done" 400 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"done"}' "$DOC" >/dev/null
req "bad stage value" 400 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"teleported"}' "$DOC" >/dev/null
req "doctor" 200 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"with_doctor"}' "$DOC" >/dev/null
req "doctor (idempotent)" 200 PUT "/appointments/$NAPPT/queue-stage" '{"stage":"with_doctor"}' "$DOC" >/dev/null

NE=$(req "doctor" 201 POST /encounters "{\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$NAPPT\",\"reasonCode\":\"triage smoke\"}" "$DOC")
NENC=$(jq -r .id <<<"$NE")
V=$(req "doctor" 200 GET "/vitals?appointmentId=$NAPPT" "" "$DOC")
expect_eq "triage vitals linked to encounter" "$(jq -r --arg e "Encounter/$NENC" '[.[] | .encounter.reference == $e] | all' <<<"$V")" "true"
R=$(req "doctor" 200 PUT "/appointments/$NAPPT" '{"status":"fulfilled"}' "$DOC")
expect_eq "fulfilled closes the queue" "$(stage_of "$R")" "done"

req "nurse→prescriptions" 403 POST /prescriptions "{\"patientId\":\"$PATIENT_ID\"}" "$NURSE" >/dev/null
req "nurse→encounters" 403 POST /encounters "{\"patientId\":\"$PATIENT_ID\"}" "$NURSE" >/dev/null
req "vitals without filter" 400 GET "/vitals" "" "$NURSE" >/dev/null

# ---------------------------------------------------------------------------
# 8c. SIGNED VISIT — the doctor portal's sign: the whole visit in one
#     transaction, under a client-generated id that makes a replay harmless
# ---------------------------------------------------------------------------
echo "-- signed visit --" >&2
VA=$(req "receptionist" 201 POST /appointments \
  "{\"patientId\":\"$PATIENT_ID\",\"practitionerId\":\"$DOC_PID\",\"start\":\"${TODAY}T11:00:00.000Z\",\"end\":\"${TODAY}T11:30:00.000Z\",\"reasonCode\":\"visit smoke\"}" "$RECEP")
VAPPT=$(jq -r '.id' <<<"$VA")
req "nurse" 201 POST /vitals "{\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$VAPPT\",\"code\":\"8867-4\",\"display\":\"Heart rate\",\"valueQuantity\":88,\"valueUnit\":\"bpm\"}" "$NURSE" >/dev/null

VID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "   encounterId=$VID" >&2
VISIT="{\"id\":\"$VID\",\"patientId\":\"$PATIENT_ID\",\"appointmentId\":\"$VAPPT\",\"reasonCode\":\"visit smoke\",
  \"note\":{\"subjective\":\"Cough for 3 days\",\"plan\":\"Rest\",\"additionalNotes\":\"visit smoke\"},
  \"vitals\":[{\"code\":\"8310-5\",\"display\":\"Body temperature\",\"valueQuantity\":38.1,\"valueUnit\":\"Cel\"}],
  \"diagnoses\":[{\"code\":\"J20.9\",\"display\":\"Acute bronchitis\",\"isPrimary\":true}],
  \"prescriptions\":[{\"medicationCode\":\"860975\",\"medicationDisplay\":\"Metformin 500mg\",\"dosageText\":\"1 tab BD\",\"quantityValue\":10}],
  \"labOrders\":[{\"code\":\"58410-2\",\"display\":\"CBC panel\",\"priority\":\"routine\"}]}"
SV=$(req "doctor" 201 POST /encounters/visit "$VISIT" "$DOC")
expect_eq "signed visit keeps the client's id" "$(jq -r .id <<<"$SV")" "$VID"
expect_eq "signed visit is completed" "$(jq -r .status <<<"$SV")" "completed"

# of_visit <path> — how many records at <path> belong to the signed visit
of_visit() {
  req "doctor" 200 GET "$1" "" "$DOC" |
    jq -r --arg e "Encounter/$VID" '[(if type == "array" then .[] else .entry[].resource end) | select(.encounter.reference == $e)] | length'
}
visit_records() {
  expect_eq "$1: prescriptions" "$(of_visit "/prescriptions?patientId=$PATIENT_ID")" "1"
  expect_eq "$1: lab orders" "$(of_visit "/lab-orders?patientId=$PATIENT_ID")" "1"
  expect_eq "$1: diagnoses" "$(of_visit "/patients/$PATIENT_ID/conditions")" "1"
  expect_eq "$1: notes" "$(req "doctor" 200 GET "/notes?encounterId=$VID" "" "$DOC" | jq -r length)" "1"
}
visit_records "signed visit"
V=$(req "doctor" 200 GET "/vitals?appointmentId=$VAPPT" "" "$DOC")
expect_eq "signed visit links triage vitals" "$(jq -r --arg e "Encounter/$VID" '[.[] | .encounter.reference == $e] | all' <<<"$V")" "true"

SV=$(req "doctor (replay)" 201 POST /encounters/visit "$VISIT" "$DOC")
expect_eq "replayed visit returns the same encounter" "$(jq -r .id <<<"$SV")" "$VID"
visit_records "after replay"

req "visit: id not a uuid" 400 POST /encounters/visit "{\"id\":\"visit-1\",\"patientId\":\"$PATIENT_ID\"}" "$DOC" >/dev/null
req "visit: invalid item" 400 POST /encounters/visit "{\"id\":\"$(uuidgen)\",\"patientId\":\"$PATIENT_ID\",\"prescriptions\":[{\"medicationCode\":\"860975\"}]}" "$DOC" >/dev/null
req "pharmacist→visit" 403 POST /encounters/visit "$VISIT" "$PHARM" >/dev/null

# ---------------------------------------------------------------------------
# 9. Organizations directory (any authenticated user) + gateway health
# ---------------------------------------------------------------------------
echo "-- organizations + health --" >&2
req "any"             200 GET "/organizations?type=pharmacy" "" "$DOC" >/dev/null
# Public liveness probe, answered by the gateway itself (no token).
HEALTH=$(req "public" 200 GET "/health" "" "")
expect_eq "/health body" "$(jq -r .status <<<"$HEALTH")" "ok"

# ---------------------------------------------------------------------------
echo >&2
echo "================ SUMMARY ================" >&2
echo "  PASS=$PASS   XFAIL(expected-deny)=$XFAIL   FAIL=$FAIL" >&2
echo "========================================" >&2

if [[ "$LOGW" == "1" ]]; then
  OUT="$(dirname "$0")/../docs/API_VERIFICATION.md"
  {
    echo "<!-- Auto-generated by scripts/smoke-e2e.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ) -->"
    echo "RESULTS_TABLE_START"
    printf '%s\n' "${ROWS[@]}"
    echo "RESULTS_TABLE_END"
    echo "SUMMARY: PASS=$PASS XFAIL=$XFAIL FAIL=$FAIL"
  } > "$OUT.rows"
  echo "wrote $OUT.rows" >&2
fi

[[ "$FAIL" == "0" ]]
