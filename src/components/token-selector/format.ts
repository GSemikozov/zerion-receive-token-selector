const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const smallUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 4,
});

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

/** $183.3B */
export function formatCompactUsd(value: number) {
  return compactUsd.format(value);
}

// Below this, 4 significant digits round up to 1.000, which Intl prints as a bare "$1".
const SMALL_PRICE_LIMIT = 0.99995;

/** $87,079.18, or $0.01165 for sub-dollar prices */
export function formatPrice(value: number) {
  return (value < SMALL_PRICE_LIMIT ? smallUsd : usd).format(value);
}

/** Rounds a percentage to the precision `formatPercentChange` displays. */
export function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

/** +3.86% — input is already a percentage (3.86, not 0.0386) */
export function formatPercentChange(value: number) {
  return percent.format(value / 100);
}
