import { checkStock, outOfStock } from "./stock-check";

describe("checkStock", () => {
  it("is enough when the usable stock covers the quantity", () => {
    expect(checkStock({ usableQuantity: 10, unit: "tablets" }, 10)).toEqual({ kind: "enough", available: 10, unit: "tablets" });
  });

  it("is short when it doesn't", () => {
    expect(checkStock({ usableQuantity: 6, unit: "tablets" }, 10)).toEqual({ kind: "short", available: 6, unit: "tablets" });
  });

  it("is unlisted when the pharmacy keeps none of the drug", () => {
    expect(checkStock(undefined, 10)).toEqual({ kind: "unlisted" });
  });

  it("names the units as given when the stock doesn't", () => {
    expect(checkStock({ usableQuantity: 3, unit: null }, 1, "capsules")).toMatchObject({ unit: "capsules" });
  });
});

describe("outOfStock", () => {
  it("is out when the drug isn't stocked or none is usable", () => {
    expect(outOfStock(checkStock(undefined, 1))).toBe(true);
    expect(outOfStock(checkStock({ usableQuantity: 0 }, 1))).toBe(true);
  });

  it("is not out when some is left, even too little", () => {
    expect(outOfStock(checkStock({ usableQuantity: 2 }, 10))).toBe(false);
  });
});
