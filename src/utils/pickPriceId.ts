export function pickPriceId(quantity: number): string {
  if (quantity === 1) return "PRICE_STANDARD";
  if (quantity >= 2 && quantity <= 3) return "PRICE_VOLUME_SAVER";
  if (quantity >= 4 && quantity <= 6) return "PRICE_BUSINESS";
  if (quantity >= 7 && quantity <= 10) return "PRICE_ENTERPRISE";
  return "PRICE_MAXIMUM";
}
