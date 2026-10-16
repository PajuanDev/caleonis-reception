import { afterEach, describe, expect, it, vi } from "vitest";
import { PolarBillingProvider } from "./polarBilling";

const product = { id: "product-1", organization_id: "organization", is_recurring: true, is_archived: false, recurring_interval: "month", recurring_interval_count: 1, prices: [{ product_id: "product-1", is_archived: false, amount_type: "fixed", price_amount: 3000, price_currency: "eur", tax_behavior: "exclusive" }] };
const checkout = { id: "checkout-1", url: "https://polar.example/checkout-1", product_id: "product-1", organization_id: "organization", currency: "eur", amount: 3000, tax_behavior: "exclusive" };
const input = { productId: "product-1", customerEmail: "owner@example.com", externalCustomerId: "business:1", successUrl: "https://app.example/settings/plan", idempotencyKey: "billing-checkout:request-1" };
const config = { accessToken: "token", organizationId: "organization", baseUrl: "https://polar.example", checkoutProductIds: { starterMonthly: "product-1" } };
const response = (value: unknown) => ({ ok: true, json: async () => value });
afterEach(() => { vi.unstubAllGlobals(); });

describe("PolarBillingProvider", () => {
  it("ingests named usage events with a stable external ID and no meter-ID configuration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ inserted: 1, duplicates: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new PolarBillingProvider(config);
    await provider.recordUsage({ eventName: "billing.voice_minutes", externalCustomerId: "business:1", quantity: 1.5, timestamp: "2026-09-08T00:00:00.000Z", idempotencyKey: "voice:call-1", businessId: "1", usageKind: "voice_seconds" });
    expect(fetchMock).toHaveBeenCalledWith("https://polar.example/v1/events/ingest", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body))).toEqual({ events: [{ name: "billing.voice_minutes", external_customer_id: "business:1", external_id: "voice:call-1", timestamp: "2026-09-08T00:00:00.000Z", metadata: { quantity: 1.5, businessId: "1", usageKind: "voice_seconds" } }] });
  });
  it("verifies EUR/HT before creating an idempotent checkout with native coupon entry", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(product)).mockResolvedValueOnce(response(checkout));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new PolarBillingProvider(config).createCheckout(input)).resolves.toEqual({ checkoutId: "checkout-1", checkoutUrl: "https://polar.example/checkout-1" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://polar.example/v1/products/product-1");
    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("idempotency-key")).toBe("billing-checkout:request-1");
    expect(request.redirect).toBe("error");
    expect(JSON.parse(String(request.body))).toEqual({ products: ["product-1"], customer_email: "owner@example.com", external_customer_id: "business:1", success_url: input.successUrl, return_url: input.successUrl, customer_metadata: { externalCustomerId: "business:1" }, allow_discount_codes: true, allow_trial: false, require_billing_address: true, is_business_customer: true });
  });
  it.each(["usd", "gbp"])("rejects a %s product before creating a checkout", async currency => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ...product, prices: [{ ...product.prices[0], price_currency: currency }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new PolarBillingProvider(config).createCheckout(input)).rejects.toThrow("EUR");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["inclusive", "location", undefined])("rejects ambiguous or included tax mode %s", async tax => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ...product, prices: [{ ...product.prices[0], tax_behavior: tax }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new PolarBillingProvider(config).createCheckout(input)).rejects.toThrow("tax");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("does not return a checkout URL when the provider response changes the amount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(product)).mockResolvedValueOnce(response({ ...checkout, amount: 3600 })));
    await expect(new PolarBillingProvider(config).createCheckout(input)).rejects.toThrow("catalogue");
  });
  it("rejects duplicate product mappings without a network request", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(new PolarBillingProvider({ ...config, checkoutProductIds: { starterMonthly: "product-1", proMonthly: "product-1" } }).createCheckout(input)).rejects.toThrow("unique");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("prepares a scoped first-month offer without creating a provider discount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(product)); vi.stubGlobal("fetch", fetchMock);
    const draft = await new PolarBillingProvider(config).prepareStarterTesterOffer({ productId: "product-1", code: "PRIVATEFIXTURE123", maxRedemptions: 3, endsAt: new Date(Date.now() + 86400000).toISOString() });
    expect(draft).toMatchObject({ type: "percentage", basis_points: 10000, duration: "once", products: ["product-1"], max_redemptions: 3, max_redemptions_per_customer: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.method).not.toBe("POST");
  });
  it("annual Starter bills EUR 288 rather than the EUR 24 monthly equivalent and does not offer the tester code field", async () => {
    const annualProduct = { ...product, recurring_interval: "year", prices: [{ ...product.prices[0], price_amount: 28800 }] };
    const fetchMock = vi.fn().mockResolvedValueOnce(response(annualProduct)).mockResolvedValueOnce(response({ ...checkout, amount: 28800 })); vi.stubGlobal("fetch", fetchMock);
    await new PolarBillingProvider({ ...config, checkoutProductIds: { starterAnnual: "product-1" } }).createCheckout(input);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1].body)).allow_discount_codes).toBe(false);
  });
});
