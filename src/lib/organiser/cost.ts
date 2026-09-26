// Shared by the server (enforcement) and the inbox (estimates).

/** Cheapest current model with structured outputs. Override with ORGANISER_MODEL (e.g. claude-sonnet-5). */
export const DEFAULT_MODEL = "claude-haiku-4-5";

/** USD per million tokens, from Anthropic's price list (update if prices change). */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
};
// Unknown models are costed at Opus rates so the budget errs on the safe side.
const FALLBACK_PRICE = { input: 5, output: 25 };

export const priceOf = (model: string) => PRICES[model] ?? FALLBACK_PRICE;

export function costOf(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceOf(model);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/** Longest material accepted in one go (~15k tokens). Bigger batches must be split. */
export const MAX_INPUT_CHARS = 60_000;
/** Hard cap on Claude's answer, which bounds the output cost of any single run. */
export const MAX_OUTPUT_TOKENS = 6_000;
export const DEFAULT_BUDGET_USD = 5;

/** Rough pre-flight estimate: ~3.5 characters per token, plus the register and a typical answer. */
export function estimateCost(model: string, materialChars: number, projectCount: number) {
  const input = Math.ceil(materialChars / 3.5) + 600 + projectCount * 70;
  const output = Math.min(MAX_OUTPUT_TOKENS, 300 + Math.ceil(materialChars / 12));
  return costOf(model, input, output);
}

export const usd = (v: number) => (v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`);
