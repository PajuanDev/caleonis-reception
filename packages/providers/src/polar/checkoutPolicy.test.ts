import { describe, expect, it } from "vitest";
import { assertExclusiveEuroProduct, assertExclusiveEuroCheckout, prepareStarterTesterDiscount, type CheckoutExpectation } from "./checkoutPolicy";
const expected: CheckoutExpectation = { productId: "product", organizationId: "org", amountCents: 3000, interval: "month", starterMonthly: true };
const price = { product_id: "product", is_archived: false, amount_type: "fixed", price_amount: 3000, price_currency: "eur", tax_behavior: "exclusive" };
const product = { id: "product", organization_id: "org", is_archived: false, is_recurring: true, recurring_interval: "month", recurring_interval_count: 1, prices: [price] };

describe("Caléonis EUR exclusive tax catalogue", () => {
  it("accepts the matching product and preserves compatible usage meters", () => { expect(() => assertExclusiveEuroProduct({ ...product, prices: [price, { ...price, amount_type: "metered_unit", price_amount: undefined }] }, expected)).not.toThrow(); });
  it.each([{ id: "other" }, { organization_id: "other" }, { is_archived: true }, { is_recurring: false }, { recurring_interval: "year" }, { recurring_interval_count: 2 }, { prices: [] }])("rejects wrong product properties %j", patch => { expect(() => assertExclusiveEuroProduct({ ...product, ...patch }, expected)).toThrow(); });
  it.each([{ price_amount: 2500 }, { price_amount: 3600 }, { price_currency: "usd" }, { tax_behavior: "inclusive" }, { tax_behavior: "location" }, { tax_behavior: undefined }, { product_id: "other" }, { amount_type: "custom" }])("rejects wrong price properties %j", patch => { expect(() => assertExclusiveEuroProduct({ ...product, prices: [{ ...price, ...patch }] }, expected)).toThrow(); });
  it("rejects two active fixed prices", () => { expect(() => assertExclusiveEuroProduct({ ...product, prices: [price, price] }, expected)).toThrow(); });
  it("ignores archived historical prices without converting their currencies", () => { expect(() => assertExclusiveEuroProduct({ ...product, prices: [price, { ...price, is_archived: true, price_currency: "usd" }] }, expected)).not.toThrow(); });
  it("allows uncalculated tax but never tax included in a returned checkout", () => {
    const checkout = { organization_id: "org", product_id: "product", amount: 3000, currency: "eur", tax_behavior: null, id: "checkout", url: "https://polar.sh/checkout/fixture" };
    expect(assertExclusiveEuroCheckout(checkout, expected).checkoutId).toBe("checkout");
    expect(() => assertExclusiveEuroCheckout({ ...checkout, tax_behavior: "inclusive" }, expected)).toThrow();
    expect(() => assertExclusiveEuroCheckout({ ...checkout, amount: 2500 }, expected)).toThrow();
  });
});

describe("first-month Starter invitation", () => {
  const input = { expected, code: "PRIVATEFIXTURE123", maxRedemptions: 3, endsAt: "2026-11-01T00:00:00Z", now: new Date("2026-10-16T00:00:00Z") };
  it("covers only the first invoice on the monthly Starter product", () => { expect(prepareStarterTesterDiscount(input)).toMatchObject({ basis_points: 10000, duration: "once", products: ["product"], max_redemptions_per_customer: 1 }); });
  it.each([{ code: "OPEN" }, { maxRedemptions: 0 }, { maxRedemptions: Infinity }, { maxRedemptions: 1.5 }, { endsAt: "2020-01-01" }])("rejects unlimited, expired or guessable offers %j", patch => { expect(() => prepareStarterTesterDiscount({ ...input, ...patch })).toThrow(); });
  it("cannot accidentally offer Pro or a whole annual subscription", () => { expect(() => prepareStarterTesterDiscount({ ...input, expected: { ...expected, starterMonthly: false } })).toThrow(); expect(() => prepareStarterTesterDiscount({ ...input, expected: { ...expected, interval: "year" } })).toThrow(); });
});
