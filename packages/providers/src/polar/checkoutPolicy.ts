/** Caléonis checkout policy. No tax rate is guessed here: Polar calculates it. */
export type CheckoutExpectation = {
  productId: string;
  organizationId: string;
  amountCents: number;
  interval: "month" | "year";
  starterMonthly: boolean;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Polar commercial response.");
  return value as Record<string, unknown>;
}

export function assertExclusiveEuroProduct(value: unknown, expected: CheckoutExpectation): void {
  const product = object(value);
  if (product.id !== expected.productId || product.organization_id !== expected.organizationId || product.is_archived !== false || product.is_recurring !== true) {
    throw new Error("Polar product does not match the configured Caléonis organization.");
  }
  if (product.recurring_interval !== expected.interval || (product.recurring_interval_count ?? 1) !== 1) {
    throw new Error("Polar product has the wrong billing interval.");
  }
  if (!Array.isArray(product.prices) || product.prices.length === 0) throw new Error("Polar product has no prices.");
  const prices = product.prices.map(object).filter(price => price.is_archived !== true);
  const fixed = prices.filter(price => price.amount_type === "fixed");
  if (fixed.length !== 1 || fixed[0]!.price_amount !== expected.amountCents) throw new Error("Polar fixed price differs from the Caléonis catalogue.");
  for (const price of prices) {
    if (price.product_id !== expected.productId || price.price_currency !== "eur" || price.tax_behavior !== "exclusive") {
      throw new Error("Caléonis requires EUR prices with tax explicitly added on top.");
    }
    if (!["fixed", "metered_unit"].includes(String(price.amount_type))) throw new Error("Unsupported Polar price type.");
    if (price.recurring_interval != null && price.recurring_interval !== expected.interval) throw new Error("Legacy Polar price has the wrong billing interval.");
  }
}

export function assertExclusiveEuroCheckout(value: unknown, expected: CheckoutExpectation): { checkoutUrl: string; checkoutId: string } {
  const checkout = object(value);
  if (checkout.organization_id !== expected.organizationId || checkout.product_id !== expected.productId || checkout.currency !== "eur" || checkout.amount !== expected.amountCents) {
    throw new Error("Polar checkout differs from the verified EUR catalogue.");
  }
  // Until the billing address is completed Polar may not have calculated tax.
  // The product's explicit exclusive setting was already verified before POST.
  if (checkout.tax_behavior !== "exclusive" && checkout.tax_behavior !== null) throw new Error("Polar checkout is not tax-exclusive.");
  if (typeof checkout.id !== "string" || !checkout.id || typeof checkout.url !== "string") throw new Error("Polar checkout is missing its reference.");
  const url = new URL(checkout.url);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Unsafe Polar checkout URL.");
  return { checkoutId: checkout.id, checkoutUrl: checkout.url };
}

/** Operator-only preparation; this function creates no discount or subscription. */
export function prepareStarterTesterDiscount(input: {
  expected: CheckoutExpectation;
  code: string;
  maxRedemptions: number;
  endsAt: string;
  now?: Date;
}) {
  if (!input.expected.starterMonthly || input.expected.interval !== "month" || input.expected.amountCents !== 3000) throw new Error("Tester discounts are restricted to Starter monthly at EUR 30 excluding tax.");
  if (!/^[A-Za-z0-9]{12,64}$/.test(input.code)) throw new Error("Use a private alphanumeric invitation code, 12 to 64 characters.");
  if (!Number.isSafeInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > 100) throw new Error("A finite tester redemption limit is required.");
  const end = new Date(input.endsAt);
  const now = input.now ?? new Date();
  if (!Number.isFinite(end.getTime()) || end.getTime() <= now.getTime()) throw new Error("A future invitation expiry is required.");
  return {
    name: "Caléonis Receptionist — premier mois Starter offert",
    type: "percentage" as const,
    basis_points: 10000,
    duration: "once" as const,
    code: input.code,
    products: [input.expected.productId],
    organization_id: input.expected.organizationId,
    max_redemptions: input.maxRedemptions,
    max_redemptions_per_customer: 1,
    ends_at: end.toISOString(),
  };
}
