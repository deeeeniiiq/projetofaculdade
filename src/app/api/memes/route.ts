import { NextResponse } from "next/server";
import { parseDexFeed, parseGeckoFeed, solanaAddress, type GeckoResponse, type MemeFeed } from "@/lib/memes";

export const runtime = "nodejs";

const headers = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 30 }, signal: AbortSignal.timeout(5500), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`provider-${response.status}`);
  return await response.json() as T;
}

export async function GET() {
  try {
    const payload = await getJson<GeckoResponse>("https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token,quote_token&duration=24h");
    const tokens = parseGeckoFeed(payload);
    if (tokens.length < 3) throw new Error("empty-gecko-feed");
    return NextResponse.json({ tokens, source: "GeckoTerminal", mode: "trending", updatedAt: new Date().toISOString() } satisfies MemeFeed, { headers });
  } catch {
    try {
      // Recent profiles are discovery data, not an organic trending ranking.
      const profiles = await getJson<{ chainId?: string; tokenAddress?: string; icon?: string }[]>("https://api.dexscreener.com/token-profiles/latest/v1");
      const solanaProfiles = profiles.filter((profile) => profile.chainId === "solana" && solanaAddress.test(profile.tokenAddress ?? "")).slice(0, 30);
      if (solanaProfiles.length === 0) throw new Error("empty-dex-profiles");
      const addresses = [...new Set(solanaProfiles.map((profile) => profile.tokenAddress))].join(",");
      const pairs = await getJson<Array<{ chainId?: string; pairAddress?: string; baseToken?: { address?: string; name?: string; symbol?: string }; priceUsd?: string; priceChange?: { m5?: number; h1?: number; h24?: number }; liquidity?: { usd?: number }; volume?: { h24?: number }; txns?: { h1?: { buys?: number; sells?: number } }; pairCreatedAt?: number; info?: { imageUrl?: string } }>>(`https://api.dexscreener.com/tokens/v1/solana/${addresses}`);
      const tokens = parseDexFeed(solanaProfiles, pairs);
      if (tokens.length === 0) throw new Error("empty-dex-feed");
      return NextResponse.json({ tokens, source: "DEX Screener", mode: "recent", updatedAt: new Date().toISOString() } satisfies MemeFeed, { headers });
    } catch {
      return NextResponse.json({ tokens: [], error: "Não foi possível atualizar os tokens agora." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
}
