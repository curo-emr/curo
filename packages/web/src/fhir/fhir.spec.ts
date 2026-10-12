import {
  mapFhirAllergy, mapFhirPatient, mapFhirPatientDetails, mapFhirReport,
  type FhirAllergy, type FhirDiagnosticReport, type FhirPatient,
} from "./index";

const allergy = (overrides: Partial<FhirAllergy> = {}): FhirAllergy => ({
  resourceType: "AllergyIntolerance",
  id: "a1",
  patient: { reference: "Patient/p1" },
  code: { coding: [{ code: "penicillin", display: "Penicillin" }] },
  ...overrides,
});

describe("mapFhirAllergy", () => {
  it("reads the reaction and its severity", () => {
    const mapped = mapFhirAllergy(allergy({
      criticality: "high",
      reaction: [{ manifestation: [{ text: "Rash" }], severity: "moderate" }],
      note: [{ text: "Since childhood" }],
    }));
    expect(mapped).toMatchObject({
      patientId: "p1",
      substance: "Penicillin",
      reaction: "Rash",
      severity: "moderate",
      notes: "Since childhood",
    });
  });

  it("falls back to criticality for allergies recorded without a severity", () => {
    expect(mapFhirAllergy(allergy({ criticality: "high" })).severity).toBe("severe");
    expect(mapFhirAllergy(allergy({ criticality: "unable-to-assess" })).severity).toBe("mild");
    expect(mapFhirAllergy(allergy()).severity).toBe("mild");
  });
});

describe("mapFhirPatientDetails", () => {
  it("reads the extensions and the marital status coding", () => {
    expect(mapFhirPatientDetails({
      maritalStatus: { coding: [{ code: "M" }] },
      extension: [
        { url: "urn:curo:bloodType", valueString: "O+" },
        { url: "urn:curo:nationality", valueString: "Sri Lankan" },
        { url: "urn:curo:occupation", valueString: "Teacher" },
        { url: "urn:curo:tag", valueString: "VIP" },
        { url: "urn:curo:tag", valueString: "Diabetic" },
        {
          url: "urn:curo:insurance",
          extension: [
            { url: "provider", valueString: "Ceylinco" },
            { url: "policyNumber", valueString: "P-1" },
            { url: "expiryDate", valueDate: "2027-03-31" },
            { url: "relationship", valueString: "spouse" },
          ],
        },
      ],
    })).toEqual({
      bloodType: "O+",
      nationality: "Sri Lankan",
      occupation: "Teacher",
      maritalStatus: "married",
      tags: ["VIP", "Diabetic"],
      insurance: {
        provider: "Ceylinco",
        policyNumber: "P-1",
        groupNumber: "",
        expiryDate: "2027-03-31",
        holderName: "",
        relationship: "spouse",
      },
    });
  });

  it("has no marital status or insurance when the patient has none", () => {
    expect(mapFhirPatientDetails({})).toMatchObject({ maritalStatus: undefined, tags: [], insurance: null });
  });

  it("shows marital status codes without a form option as other", () => {
    expect(mapFhirPatientDetails({ maritalStatus: { coding: [{ code: "L" }] } }).maritalStatus).toBe("other");
  });
});

describe("mapFhirPatient", () => {
  // What pharmacy and lab staff get: identity only.
  const minimized: FhirPatient = {
    resourceType: "Patient",
    id: "p1",
    meta: { lastUpdated: "2026-10-12T03:40:00Z" },
    identifier: [
      { system: "urn:curo:phn", value: "PHN-1" },
      { system: "urn:curo:patient-code", value: "CUR-0001" },
    ],
    name: [{ family: "Perera", given: ["Nimal", "Kumara"] }],
    gender: "male",
    birthDate: "1990-05-01",
  };

  it("reads the identity, contact, address and details", () => {
    expect(mapFhirPatient({
      ...minimized,
      identifier: [...minimized.identifier!, { system: "urn:curo:nic", value: "901220000V" }],
      telecom: [{ system: "email", value: "nimal@example.com" }, { system: "phone", value: "0771234567" }],
      address: [{ line: ["12 Galle Rd", "Flat 3"], city: "Colombo", state: "Western", postalCode: "00300", country: "Sri Lanka" }],
      contact: [{ name: { text: "Kamala Perera" }, relationship: [{ text: "Mother" }], telecom: [{ system: "phone", value: "0711111111" }] }],
      maritalStatus: { coding: [{ code: "M" }] },
      extension: [
        { url: "urn:curo:registeredAt", valueDateTime: "2026-01-05T04:30:00.000Z" },
        { url: "urn:curo:bloodType", valueString: "O+" },
      ],
    })).toEqual({
      id: "p1",
      mrn: "CUR-0001",
      phn: "PHN-1",
      nic: "901220000V",
      name: { first: "Nimal", last: "Perera", full: "Nimal Kumara Perera" },
      dob: "1990-05-01",
      sex: "male",
      bloodType: "O+",
      nationality: "",
      occupation: "",
      maritalStatus: "married",
      tags: [],
      insurance: null,
      phone: "0771234567",
      email: "nimal@example.com",
      address: { line1: "12 Galle Rd", line2: "Flat 3", city: "Colombo", district: "Western", postalCode: "00300", country: "Sri Lanka" },
      emergencyContact: { name: "Kamala Perera", relationship: "Mother", phone: "0711111111" },
      registeredAt: "2026-01-05T04:30:00.000Z",
      updatedAt: "2026-10-12T03:40:00Z",
    });
  });

  it("leaves out what a minimized patient doesn't have", () => {
    expect(mapFhirPatient(minimized)).toMatchObject({
      nic: "",
      phone: "",
      address: { line1: "", city: "" },
      emergencyContact: { name: "", phone: "" },
      maritalStatus: undefined,
      insurance: null,
      registeredAt: "",
    });
  });

  it("is blank, not undefined, without a name or gender", () => {
    const patient = mapFhirPatient({ resourceType: "Patient", id: "p2" });
    expect(patient.name).toEqual({ first: "", last: "", full: "" });
    expect(patient.sex).toBe("other");
  });
});

describe("mapFhirReport", () => {
  const report = (result: NonNullable<FhirDiagnosticReport["result"]>): FhirDiagnosticReport => ({
    id: "r1",
    basedOn: [{ reference: "ServiceRequest/o1" }],
    issued: "2026-10-10T08:00:00Z",
    result,
    presentedForm: [{ contentType: "application/pdf", data: "JVBER" }],
  });

  it("reads each value with its unit, range and flag, and the PDF", () => {
    const mapped = mapFhirReport(report([
      { code: "3016-3", display: "TSH", value: 8.2, unit: "mIU/L", referenceRangeLow: "0.4", referenceRangeHigh: "4.0", interpretation: "H" },
    ]));
    expect(mapped).toMatchObject({
      orderId: "o1",
      pdfBase64: "JVBER",
      results: [{ display: "TSH", value: "8.2", unit: "mIU/L", referenceRange: "0.4 - 4.0", interpretation: "H" }],
    });
  });

  it("keeps a text value and a written range", () => {
    const [r] = mapFhirReport(report([
      { code: "x", display: "Culture", valueString: "No growth", referenceRangeText: "No growth" },
    ])).results;
    expect(r).toMatchObject({ value: "No growth", referenceRange: "No growth", unit: undefined });
  });

  it("marks a range with only one end, and leaves out a range with none", () => {
    const [ldl, crp] = mapFhirReport(report([
      { code: "13457-7", display: "LDL Cholesterol", value: 90, referenceRangeHigh: "100" },
      { code: "1988-5", display: "CRP", value: 2 },
    ])).results;
    expect(ldl.referenceRange).toBe("≤ 100");
    expect(crp.referenceRange).toBeUndefined();
  });
});
