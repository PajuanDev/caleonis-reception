import { describe, expect, it } from "vitest";
import { commercialCopy, formatOfferMoney, offerAmounts } from "./billing-presentation";

describe("all Caléonis offers in EUR excluding tax", () => {
  it.each([
    ["starter", "monthly", 3000, 3000], ["starter", "annual", 2400, 28800],
    ["pro", "monthly", 10000, 10000], ["pro", "annual", 8000, 96000],
    ["free_cloud", "monthly", 0, 0], ["enterprise", "monthly", null, null],
  ] as const)("%s %s retains its numeric catalogue", (plan, interval, monthly, invoice) => {
    expect(offerAmounts(plan, interval)).toEqual({ monthlyEquivalentCents: monthly, invoiceCents: invoice });
  });
  it("formats euros, not dollars, for both languages", () => {
    expect(formatOfferMoney(3000, "fr").replace(/\s/g, "")).toBe("30€");
    expect(formatOfferMoney(3000, "en")).toBe("€30");
    expect(commercialCopy("fr-FR").excludingTax).toBe("HT");
    expect(commercialCopy("en").taxNotice).toContain("added at checkout");
  });
  it.each([-1, Infinity, 30.5])("rejects invalid cents %s", value => expect(() => formatOfferMoney(value)).toThrow());
});
