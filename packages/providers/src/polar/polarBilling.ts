import { assertCertificationBillingSandbox, assertCertificationRecipient, billingPlanCatalog } from "@lobbystack/shared";
import { assertExclusiveEuroCheckout, assertExclusiveEuroProduct, prepareStarterTesterDiscount, type CheckoutExpectation } from "./checkoutPolicy";

type ProductKey = "starterMonthly" | "starterAnnual" | "proMonthly" | "proAnnual";
export type PolarBillingConfig = {
  accessToken: string;
  organizationId: string;
  baseUrl?: string;
  checkoutProductIds?: Partial<Record<ProductKey, string>>;
};

export class PolarBillingProvider {
  constructor(private readonly config: PolarBillingConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    assertCertificationBillingSandbox(this.config.baseUrl ?? "https://api.polar.sh");
    const response = await fetch(`${this.config.baseUrl ?? "https://api.polar.sh"}${path}`, { ...init, redirect: "error", signal: AbortSignal.timeout(15_000), headers: { authorization: `Bearer ${this.config.accessToken}`, "content-type": "application/json", ...(init.headers ?? {}) } });
    if (!response.ok) throw new Error(`Polar request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }

  private async verifyCheckoutProduct(productId: string): Promise<CheckoutExpectation> {
    const ids = this.config.checkoutProductIds ?? {
      starterMonthly: process.env.POLAR_STARTER_MONTHLY_PRODUCT_ID,
      starterAnnual: process.env.POLAR_STARTER_ANNUAL_PRODUCT_ID,
      proMonthly: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID,
      proAnnual: process.env.POLAR_PRO_ANNUAL_PRODUCT_ID,
    };
    const entries: Array<{ key: ProductKey; amountCents: number; interval: "month" | "year"; starterMonthly: boolean }> = [
      { key: "starterMonthly", amountCents: billingPlanCatalog.starter.monthlyChargeCents, interval: "month", starterMonthly: true },
      { key: "starterAnnual", amountCents: billingPlanCatalog.starter.annualChargeCents, interval: "year", starterMonthly: false },
      { key: "proMonthly", amountCents: billingPlanCatalog.pro.monthlyChargeCents, interval: "month", starterMonthly: false },
      { key: "proAnnual", amountCents: billingPlanCatalog.pro.annualChargeCents, interval: "year", starterMonthly: false },
    ];
    const matches = entries.filter(entry => Boolean(ids[entry.key]) && ids[entry.key] === productId);
    if (!productId || matches.length !== 1 || !this.config.organizationId) throw new Error("A unique Caléonis checkout product must be configured.");
    const expected: CheckoutExpectation = { ...matches[0]!, productId, organizationId: this.config.organizationId };
    const product = await this.request<unknown>(`/v1/products/${encodeURIComponent(productId)}`);
    assertExclusiveEuroProduct(product, expected);
    return expected;
  }

  async createCheckout(input: { productId: string; customerEmail: string; externalCustomerId: string; successUrl: string; idempotencyKey?: string }): Promise<{ checkoutUrl: string; checkoutId: string }> {
    assertCertificationRecipient("email", input.customerEmail);
    // Verify the real product before returning any payment URL. Changing a
    // currency symbol in the dashboard must never leave a USD/TTC checkout.
    const expected = await this.verifyCheckoutProduct(input.productId);
    const result = await this.request<unknown>("/v1/checkouts/", {
      method: "POST",
      ...(input.idempotencyKey ? { headers: { "idempotency-key": input.idempotencyKey } } : {}),
      body: JSON.stringify({
        products: [input.productId],
        customer_email: input.customerEmail,
        external_customer_id: input.externalCustomerId,
        success_url: input.successUrl,
        return_url: input.successUrl,
        customer_metadata: { externalCustomerId: input.externalCustomerId },
        // Native provider coupons; no client-side entitlement or price override.
        allow_discount_codes: expected.starterMonthly,
        allow_trial: false,
        require_billing_address: true,
        is_business_customer: true,
      }),
    });
    return assertExclusiveEuroCheckout(result, expected);
  }

  /** Read-only operator preparation. Publishing the returned discount is separate. */
  async prepareStarterTesterOffer(input: { productId: string; code: string; maxRedemptions: number; endsAt: string }) {
    const expected = await this.verifyCheckoutProduct(input.productId);
    return prepareStarterTesterDiscount({ ...input, expected });
  }

  async recordUsage(input: { eventName: string; externalCustomerId: string; quantity: number; timestamp: string; idempotencyKey: string; businessId: string; usageKind: string }): Promise<void> {
    await this.request("/v1/events/ingest", { method: "POST", body: JSON.stringify({ events: [{ name: input.eventName, external_customer_id: input.externalCustomerId, external_id: input.idempotencyKey, timestamp: input.timestamp, metadata: { quantity: input.quantity, businessId: input.businessId, usageKind: input.usageKind } }] }) });
  }

  async createCustomerPortalSession(input: { externalCustomerId: string; returnUrl: string }): Promise<{ url: string }> {
    const result = await this.request<{ customer_portal_url: string }>("/v1/customer-sessions/", { method: "POST", body: JSON.stringify({ external_customer_id: input.externalCustomerId, return_url: input.returnUrl }) });
    return { url: result.customer_portal_url };
  }
}
