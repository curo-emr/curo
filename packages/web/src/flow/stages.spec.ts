import { STAGE_META, countStages, stageDotClass } from "./stages";

describe("countStages", () => {
  it("counts each stage and skips anyone not in the flow", () => {
    expect(countStages(["waiting_nurse", "done", null, "waiting_nurse", undefined])).toEqual({
      waiting_nurse: 2,
      with_nurse: 0,
      ready_for_doctor: 0,
      with_doctor: 0,
      done: 1,
    });
  });
});

describe("stageDotClass", () => {
  it("fades a stage that hasn't started", () => {
    expect(stageDotClass(STAGE_META.waiting_nurse)).toBe("bg-status-warning-text opacity-40");
    expect(stageDotClass(STAGE_META.with_doctor)).toBe("bg-status-info-text");
  });
});
