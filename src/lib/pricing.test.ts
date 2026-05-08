import { describe, it, expect } from "vitest";
import { planPrice, formatUSD, PLAN_PRICES } from "@/lib/pricing";

describe("planPrice", () => {
  it("returns 29 for basic", () => expect(planPrice("basic")).toBe(29));
  it("returns 79 for pro", () => expect(planPrice("pro")).toBe(79));
  it("returns 199 for enterprise", () => expect(planPrice("enterprise")).toBe(199));
  it("returns 0 for unknown plan", () => expect(planPrice("unknown")).toBe(0));
  it("matches PLAN_PRICES table exactly", () => {
    expect(PLAN_PRICES.basic).toBe(29);
    expect(PLAN_PRICES.pro).toBe(79);
    expect(PLAN_PRICES.enterprise).toBe(199);
  });
});

describe("formatUSD", () => {
  it("formats integers without decimals", () => {
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(1234)).toBe("$1,234");
  });
  it("rounds decimals", () => {
    expect(formatUSD(99.4)).toBe("$99");
    expect(formatUSD(99.6)).toBe("$100");
  });
});
