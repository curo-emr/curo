import { patientFormSchema, type PatientFormInput } from "./schema";

/** Only the fields the form requires. */
const required: PatientFormInput = {
  firstName: "Amali",
  lastName: "Perera",
  dob: "2000-01-01",
  sex: "female",
  phone: "0771234567",
  addressLine1: "1 Galle Road",
  city: "Colombo",
  emergencyContactName: "Nimal Perera",
  emergencyContactRelationship: "Father",
  emergencyContactPhone: "0777654321",
};

const errorsFor = (input: Partial<PatientFormInput>) => {
  const result = patientFormSchema.safeParse({ ...required, ...input });
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe("patientFormSchema", () => {
  it("fills in the optional fields a form leaves out", () => {
    expect(patientFormSchema.parse(required)).toMatchObject({
      nic: "",
      nationality: "Sri Lankan",
      country: "Sri Lanka",
      insuranceRelationship: "self",
      tags: "",
      allergies: [],
    });
  });

  it("names each missing required field", () => {
    expect(errorsFor({ firstName: "", city: "" })).toEqual({
      firstName: ["First name is required"],
      city: ["City is required"],
    });
  });

  it("takes a blank email but not a malformed one", () => {
    expect(errorsFor({ email: "" })).toEqual({});
    expect(errorsFor({ email: "amali@" })).toEqual({ email: ["Invalid email address"] });
  });

  it("takes marital status as a word, not the API's FHIR code", () => {
    expect(errorsFor({ maritalStatus: "married" })).toEqual({});
    expect(errorsFor({ maritalStatus: "M" as never })).toHaveProperty("maritalStatus");
  });

  it("defaults an allergy's severity and optional fields", () => {
    const { allergies } = patientFormSchema.parse({ ...required, allergies: [{ substance: "Penicillin" }] });
    expect(allergies).toEqual([{ substance: "Penicillin", reaction: "", severity: "mild", notes: "" }]);
  });

  it("rejects an allergy without a substance", () => {
    expect(errorsFor({ allergies: [{ substance: "  " }] })).toHaveProperty("allergies");
  });
});
