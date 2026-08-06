export interface ConfidenceInterval {
  rate: number; // point estimate, 0-100
  marginPct: number; // half-width in percentage points, for a "±X" display
  count: number; // numerator (successes)
  total: number; // denominator (trials)
}

// Wilson score interval at the given z (1.96 = 95%, matching "every
// percentage carries a 95% confidence interval"). More reliable than a naive
// normal approximation for small samples, which is most of the rows in this
// report — a 2-game opening shouldn't read as "100% ± 0".
export function wilsonInterval(
  successes: number,
  total: number,
  z = 1.96
): ConfidenceInterval {
  if (total === 0) {
    return { rate: 0, marginPct: 0, count: 0, total: 0 };
  }

  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const margin =
    z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));

  const lower = Math.max(0, (center - margin) / denominator);
  const upper = Math.min(1, (center + margin) / denominator);

  return {
    rate: Math.round(p * 100),
    marginPct: Math.round(((upper - lower) / 2) * 100),
    count: successes,
    total,
  };
}
