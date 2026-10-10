import type { Allergy } from "../fhir/allergy";
import { allergyAlerts, describeAllergyAlert } from "./allergy-check";

const allergy = (substance: string, reaction = ""): Allergy => ({
  id: substance,
  patientId: "p1",
  substance,
  reaction,
  severity: "mild",
  notes: "",
  recordedAt: "",
});

/** What `allergyAlerts` reports for `drug`, as [substance, class] pairs. */
const alerts = (drug: string, ...substances: string[]) =>
  allergyAlerts(drug, substances.map(s => allergy(s))).map(a => [a.allergy.substance, a.drugClass]);

describe("allergyAlerts", () => {
  it("flags an allergy to the drug itself, whatever the case", () => {
    expect(alerts("Aspirin 75mg Tablet", "aspirin")).toEqual([["aspirin", undefined]]);
    expect(alerts("Amoxicillin 250mg Capsule", "Amoxicillin")).toEqual([["Amoxicillin", undefined]]);
  });

  it.each([
    ["Amoxicillin 250mg Capsule", "Penicillin", "a penicillin"],
    ["Flucloxacillin 500mg", "Penicillins", "a penicillin"],
    ["Cefalexin 500mg", "Cephalosporins", "a cephalosporin"],
    ["Ceftriaxone 1g Injection", "cephalosporin", "a cephalosporin"],
    ["Sulfamethoxazole 400mg", "Sulfonamides", "a sulfonamide"],
    ["Co-trimoxazole 960mg", "Sulfa", "a sulfonamide"],
    ["Diclofenac 50mg Tablet", "NSAIDs", "an NSAID"],
    ["Ibuprofen 400mg", "Salicylates", "an NSAID"],
  ])("flags %s for an allergy recorded as %s", (drug, substance, drugClass) => {
    expect(alerts(drug, substance)).toEqual([[substance, drugClass]]);
  });

  it("flags the rest of a class for an allergy to one of its members", () => {
    expect(alerts("Amoxicillin 250mg Capsule", "Ampicillin")).toEqual([["Ampicillin", "a penicillin"]]);
    expect(alerts("Diclofenac 50mg Tablet", "Aspirin")).toEqual([["Aspirin", "an NSAID"]]);
  });

  it("doesn't take sulfates, sulphates or sulfites for sulfonamides", () => {
    expect(alerts("Ferrous Sulfate 200mg Tablet", "Sulfa", "Sulfonamides")).toEqual([]);
    expect(alerts("Salbutamol Sulphate Inhaler", "Sulfa")).toEqual([]);
    expect(alerts("Sulfamethoxazole 400mg", "Sulfites")).toEqual([]);
  });

  it("matches a recorded drug as whole words, not inside another word", () => {
    expect(alerts("Sulfamethoxazole 400mg", "Sulfa")).toEqual([["Sulfa", "a sulfonamide"]]);
    expect(alerts("Ferrous Sulfate 200mg Tablet", "Sulf")).toEqual([]);
  });

  it("leaves out allergies that share no drug or class", () => {
    expect(alerts("Azithromycin 500mg Tablet", "Penicillin", "Peanuts", "Lactose", "Sulfa")).toEqual([]);
    expect(alerts("Paracetamol 500mg Tablet", "Aspirin", "NSAIDs")).toEqual([]);
    expect(alerts("Amoxicillin 250mg Capsule", "")).toEqual([]);
  });

  it("lists every allergy that applies", () => {
    expect(alerts("Amoxicillin 250mg Capsule", "Penicillin", "Amoxicillin", "Peanuts")).toEqual([
      ["Penicillin", "a penicillin"],
      ["Amoxicillin", undefined],
    ]);
  });
});

describe("describeAllergyAlert", () => {
  it("names the allergy and its reaction, and the class when that is the link", () => {
    const [byClass] = allergyAlerts("Amoxicillin 250mg", [allergy("Penicillin", "rash")]);
    expect(describeAllergyAlert(byClass, "Amoxicillin 250mg")).toBe(
      "Allergic to Penicillin (rash). Amoxicillin 250mg is a penicillin.",
    );
    const [direct] = allergyAlerts("Aspirin 75mg", [allergy("Aspirin")]);
    expect(describeAllergyAlert(direct, "Aspirin 75mg")).toBe("Allergic to Aspirin.");
  });
});
