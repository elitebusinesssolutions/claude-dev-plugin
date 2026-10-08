// 999_950 is where one-decimal rounding of the k form reaches 1000k.
const compact = (n: number): string => {
  if (n >= 999_950) return `${Math.round(n / 100_000) / 10}M`;

  return n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${n}`;
};

/**
 * `ctx 42% 84k/200k`. A missing percent is derived from tokens and window. A missing reading is
 * left out, never shown as zero: `ctx 200k` with no usage, `ctx` with nothing known.
 */
export const formatContextStatus = (c: {
  tokens?: number;
  window: number;
  percent?: number;
}): string => {
  const { tokens, window } = c;
  const percent =
    c.percent ?? (tokens !== undefined && window > 0 ? (tokens / window) * 100 : undefined);
  const head = percent === undefined ? "ctx" : `ctx ${Math.round(percent)}%`;

  if (window <= 0) return head;
  if (tokens === undefined) return percent === undefined ? `${head} ${compact(window)}` : head;

  return `${head} ${compact(tokens)}/${compact(window)}`;
};
