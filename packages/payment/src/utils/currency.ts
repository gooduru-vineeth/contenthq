export function inrToCreditRatio(amountPaise: number, credits: number): number {
  return amountPaise / credits;
}

export function formatAmountInr(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatAmountUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
