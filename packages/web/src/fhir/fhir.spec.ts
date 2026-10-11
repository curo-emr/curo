import { mapFhirAllergy, mapFhirPatientDetails, mapFhirReport, type FhirAllergy, type FhirDiagnosticReport } from "./index";

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
      results: [{ display: "TSH", value: "8.2", unit: "mIU/L", referenceRange: "0.4–4.0", interpretation: "H" }],
    });
  });

  it("keeps a text value and a written range", () => {
    const [r] = mapFhirReport(report([
      { code: "x", display: "Culture", valueString: "No growth", referenceRangeText: "No growth" },
    ])).results;
    expect(r).toMatchObject({ value: "No growth", referenceRange: "No growth", unit: undefined });
  });
});
