import { greeting } from "./index";

describe("greeting", () => {
  const at = (hour: number) => greeting(new Date(2026, 9, 9, hour, 30));

  it("changes at noon and at 5 pm", () => {
    expect([at(0), at(11), at(12), at(16), at(17), at(23)]).toEqual([
      "Good morning",
      "Good morning",
      "Good afternoon",
      "Good afternoon",
      "Good evening",
      "Good evening",
    ]);
  });
});
