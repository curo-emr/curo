import type { Allergy } from "../fhir";
import {
  allergyChanges,
  newAllergy,
  parseTags,
  patientBody,
  registrationBody,
  type AllergyEntry,
  type PatientFormValues,
} from "./index";

const form = (overrides: Partial<PatientFormValues> = {}): PatientFormValues => ({
  nic: "200012345678",
  firstName: "Amali",
  lastName: "Perera",
  dob: "2000-01-01",
  sex: "female",
  bloodType: "",
  nationality: "Sri Lankan",
  maritalStatus: "single",
  occupation: "",
  phone: "0771234567",
  email: "",
  addressLine1: "1 Galle Road",
  addressLine2: "",
  city: "Colombo",
  district: "",
  postalCode: "",
  country: "",
  emergencyContactName: "Nimal Perera",
  emergencyContactRelationship: "Father",
  emergencyContactPhone: "0777654321",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceGroupNumber: "",
  insuranceExpiryDate: "",
  insuranceHolderName: "",
  insuranceRelationship: "self",
  tags: "",
  allergies: [],
  ...overrides,
});

const penicillin: Allergy = {
  id: "a1",
  patientId: "p1",
  substance: "Penicillin",
  reaction: "Rash",
  severity: "severe",
  notes: "",
  recordedAt: "2026-01-01",
};

const entryFor = (allergy: Allergy): AllergyEntry => ({
  id: allergy.id,
  substance: allergy.substance,
  reaction: allergy.reaction,
  severity: allergy.severity,
  notes: allergy.notes,
});

describe("patientBody", () => {
  it("sends the fields the forms used to drop", () => {
    const body = patientBody(form({
      nationality: "Indian",
      occupation: "Teacher",
      district: "Colombo",
      tags: "VIP, Diabetic",
      insuranceProvider: "Ceylinco",
      insuranceExpiryDate: "2027-03-31",
      insuranceHolderName: "Nimal Perera",
      insuranceRelationship: "child",
    }));
    expect(body).toMatchObject({
      nationality: "Indian",
      occupation: "Teacher",
      state: "Colombo",
      tags: ["VIP", "Diabetic"],
      insuranceProvider: "Ceylinco",
      insuranceExpiryDate: "2027-03-31",
      insuranceHolderName: "Nimal Perera",
      insuranceRelationship: "child",
    });
  });

  it("sends marital status as the API's FHIR code", () => {
    expect(patientBody(form({ maritalStatus: "married" })).maritalStatus).toBe("M");
    expect(patientBody(form({ maritalStatus: "other" })).maritalStatus).toBe("UNK");
  });

  it("clears blank optional fields with null, so an edit can empty them", () => {
    const body = patientBody(form({ occupation: "  ", email: "" }));
    expect(body.occupation).toBeNull();
    expect(body.email).toBeNull();
    expect(body.tags).toEqual([]);
  });

  it("drops the insurance details without a provider", () => {
    const body = patientBody(form({ insuranceHolderName: "Nimal", insuranceRelationship: "spouse" }));
    expect(body.insuranceHolderName).toBeNull();
    expect(body.insuranceRelationship).toBeNull();
  });

  it("defaults the country", () => {
    expect(patientBody(form()).country).toBe("Sri Lanka");
  });
});

describe("parseTags", () => {
  it("trims, drops blanks and duplicates", () => {
    expect(parseTags(" VIP,, Diabetic ,VIP ")).toEqual(["VIP", "Diabetic"]);
  });
});

describe("newAllergy", () => {
  it("codes the substance the way the seed does and leaves out blanks", () => {
    expect(newAllergy({ substance: " Peanuts ", reaction: "", severity: "moderate", notes: "" })).toEqual({
      code: "peanuts",
      display: "Peanuts",
      reaction: undefined,
      severity: "moderate",
      note: undefined,
    });
  });
});

describe("registrationBody", () => {
  it("sends the allergies under the key POST /patients reads", () => {
    const allergy = { substance: "Penicillin", reaction: "Rash", severity: "severe" as const, notes: "" };
    expect(registrationBody(form({ allergies: [allergy] })).allergies).toEqual([newAllergy(allergy)]);
  });
});

describe("allergyChanges", () => {
  it("changes nothing when the form lists the allergies as recorded", () => {
    expect(allergyChanges([penicillin], [entryFor(penicillin)])).toEqual({
      newAllergies: [],
      allergyUpdates: [],
    });
  });

  it("adds an entry without an id", () => {
    const entry = { substance: "Aspirin", reaction: "", severity: "mild" as const, notes: "" };
    expect(allergyChanges([penicillin], [entryFor(penicillin), entry])).toEqual({
      newAllergies: [newAllergy(entry)],
      allergyUpdates: [],
    });
  });

  it("sends only the fields an entry changes", () => {
    const entry = { ...entryFor(penicillin), reaction: "Anaphylaxis", notes: "Since childhood" };
    expect(allergyChanges([penicillin], [entry]).allergyUpdates).toEqual([
      { id: "a1", reaction: "Anaphylaxis", note: "Since childhood" },
    ]);
  });

  it("recodes an allergy whose substance changes", () => {
    const entry = { ...entryFor(penicillin), substance: "Amoxicillin" };
    expect(allergyChanges([penicillin], [entry]).allergyUpdates).toEqual([
      { id: "a1", code: "amoxicillin", display: "Amoxicillin" },
    ]);
  });

  it("clears a reaction that was removed", () => {
    const entry = { ...entryFor(penicillin), reaction: "" };
    expect(allergyChanges([penicillin], [entry]).allergyUpdates).toEqual([{ id: "a1", reaction: "" }]);
  });

  it("retires a recorded allergy the form no longer lists", () => {
    expect(allergyChanges([penicillin], [])).toEqual({
      newAllergies: [],
      allergyUpdates: [{ id: "a1", clinicalStatus: "inactive" }],
    });
  });
});
