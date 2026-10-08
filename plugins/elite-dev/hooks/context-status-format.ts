const compact = (n: number): string => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${n}`);

/** `ctx 42% 84k/200k`; the token part is left out until the window size is known. */
export const formatContextStatus = (c: {
  tokens?: number;
  window: number;
  percent?: number;
}): string => {
  const head = `ctx ${Math.round(c.percent ?? 0)}%`;

  return c.window > 0 ? `${head} ${compact(c.tokens ?? 0)}/${compact(c.window)}` : head;
};
