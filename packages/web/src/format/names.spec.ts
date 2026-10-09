import { getDoctorName, getInitials, getPatientName, nameById } from "./index";

const people = [
  { id: "p1", name: { full: "Nimal Perera" } },
  { id: "p2", name: { full: "" } },
];

describe("nameById", () => {
  it("is the full name of the person with that id", () => {
    expect(nameById("p1", people, "Unknown")).toBe("Nimal Perera");
  });

  it("falls back when no one has the id, or their name is blank", () => {
    expect(nameById("p9", people, "Unknown")).toBe("Unknown");
    expect(nameById("p2", people, "Unknown")).toBe("Unknown");
  });

  it("names the fallback after who is missing", () => {
    expect(getPatientName("p9", people)).toBe("Unknown Patient");
    expect(getDoctorName("p9", people)).toBe("Unknown Doctor");
  });
});

describe("getInitials", () => {
  it("takes the first letter of the first two names", () => {
    expect(getInitials("Amali Dissanayake")).toBe("AD");
    expect(getInitials("priya  de silva rajapaksa")).toBe("PD");
  });

  it("is empty without a name", () => {
    expect(getInitials(undefined)).toBe("");
    expect(getInitials("   ")).toBe("");
  });
});
