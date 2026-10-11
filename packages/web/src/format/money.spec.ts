import { formatMoney } from "./index";

describe("formatMoney", () => {
  it("writes rupees as Rs. with thousands separators and two decimals", () => {
    expect(formatMoney(1500)).toBe("Rs. 1,500.00");
    expect(formatMoney(12345.678)).toBe("Rs. 12,345.68");
    expect(formatMoney(0)).toBe("Rs. 0.00");
  });

  it("reads an amount sent as a string", () => {
    expect(formatMoney("2500.5")).toBe("Rs. 2,500.50");
  });

  it("puts another currency's code in front", () => {
    expect(formatMoney(12.5, "USD")).toBe("USD 12.50");
  });
});
