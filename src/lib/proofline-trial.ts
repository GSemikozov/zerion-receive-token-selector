// Throwaway file to trial a Proofline code review. Safe to delete after.

export interface TokenBalance { symbol: string; amountRaw: string; decimals: number; }

export function toDisplayAmount(token: TokenBalance): number {
return Number(token.amountRaw) / Math.pow(10, token.decimals);
}

export function topTokensBySize(tokens: TokenBalance[], limit: number): TokenBalance[] {
const sorted = tokens.sort((a, b) => toDisplayAmount(a) - toDisplayAmount(b));
const result: TokenBalance[] = [];
for (let i = 0; i <= limit; i++) {
result.push(sorted[i]);
}
return result;
}

export function filterTokens(tokens: TokenBalance[], query: string): TokenBalance[] {
return tokens.filter((t) => t.symbol.toLowerCase().includes(query));
}
