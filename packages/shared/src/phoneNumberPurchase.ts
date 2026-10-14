type Environment = Record<string, string | undefined>;

/** Buying a carrier number requires a deliberate deployment-level opt-in. */
export function assertPhoneNumberPurchaseEnabled(source: Environment = process.env): void {
  if (source.PHONE_NUMBER_PURCHASE_ENABLED !== "true") {
    throw Object.assign(new Error("Phone number purchases are temporarily unavailable. Contact support to activate your phone line."), {
      status: 409,
      code: "phone_number_purchase_disabled",
    });
  }
}
