import { formatCompactUsd, formatPercentChange, formatPrice } from './format';

describe('formatPrice', () => {
  it.each([
    [87_079.1771, '$87,079.18'],
    [1, '$1.00'],
    // Stablecoins hovering just under $1 must not render as a bare "$1".
    [0.99996, '$1.00'],
    [0.9998, '$0.9998'],
    [0.011647, '$0.01165'],
  ])('%s → %s', (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });
});

it('formats market data compactly and signs changes', () => {
  expect(formatCompactUsd(183_300_000_000)).toBe('$183.3B');
  expect(formatPercentChange(3.86)).toBe('+3.86%');
  expect(formatPercentChange(-1.2)).toBe('-1.2%');
  expect(formatPercentChange(0)).toBe('0%');
});
