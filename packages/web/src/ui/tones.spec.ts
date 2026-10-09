import { toneClass, waitTone } from "./tones";

describe("waitTone", () => {
  it("turns to warning after 15 minutes and to error after 30", () => {
    expect([0, 15, 16, 30, 31].map(waitTone)).toEqual(["success", "success", "warning", "warning", "error"]);
  });
});

describe("toneClass", () => {
  it("is the tone's background, text and border tokens", () => {
    expect(toneClass("warning")).toBe("bg-status-warning-bg text-status-warning-text border-status-warning-border");
  });
});
