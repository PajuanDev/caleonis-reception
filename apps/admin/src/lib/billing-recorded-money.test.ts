import { describe, expect, it } from "vitest";
import { commercialCopy, formatOfferMoney, formatRecordedMoney, offerAmounts } from "./billing-presentation";

describe("EUR catalogue versus historical receipts", () => {
  it("does not silently convert receipts from USD or GBP to the offer currency", () => {
    expect(formatRecordedMoney(3000, "usd", "en-US")).toBe("$30");
    expect(formatRecordedMoney(3000, "GBP", "en-GB")).toBe("£30");
    expect(formatOfferMoney(3000, "en-US")).toBe("€30");
    expect(formatRecordedMoney(3000, "eur", "fr-FR").replace(/\s/g, "")).toBe("30€");
  });
  it("does not invent a receipt currency or amount when it is missing", () => {
    expect(formatRecordedMoney(3000, "", "fr")).toBe("—");
    expect(formatRecordedMoney(Number.NaN, "EUR", "fr")).toBe("—");
  });
  it("keeps zero and fractional accumulated overages visible without adding a tax rate", () => {
    expect(formatRecordedMoney(0, "EUR", "en")).toBe("€0");
    expect(formatRecordedMoney(12.5, "EUR", "en")).toBe("€0.13");
    expect(commercialCopy("fr").capAmountLabel).toContain("HT");
    expect(commercialCopy("en").capTaxNotice).toContain("not the subscription");
  });
  it.each([["starter", 28800, 2400], ["pro", 96000, 8000]] as const)("%s annual invoice is distinct from monthly display", (plan, invoice, equivalent) => {
    expect(offerAmounts(plan, "annual")).toEqual({ invoiceCents: invoice, monthlyEquivalentCents: equivalent });
    expect(formatOfferMoney(invoice, "en")).not.toBe(formatOfferMoney(equivalent, "en"));
  });
});
