import { visitTypeLabel } from "./index";

describe("visitTypeLabel", () => {
  it("reads a code as its label", () => {
    expect(visitTypeLabel("follow_up")).toBe("Follow-up");
  });

  it("shows an unknown value as stored, and none as not set", () => {
    expect(visitTypeLabel("Home visit")).toBe("Home visit");
    expect(visitTypeLabel("")).toBe("Not set");
    expect(visitTypeLabel(null)).toBe("Not set");
  });
});
