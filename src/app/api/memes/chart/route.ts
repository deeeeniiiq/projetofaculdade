import { NextRequest, NextResponse } from "next/server";
import { solanaAddress } from "@/lib/memes";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const pool = request.nextUrl.searchParams.get("pool") ?? "";
  const period = request.nextUrl.searchParams.get("period") === "1h" ? "1h" : "24h";
  if (!solanaAddress.test(pool)) return NextResponse.json({ error: "Pool inválido." }, { status: 400 });
  const resolution = period === "1h" ? "minute?aggregate=1&limit=60" : "minute?aggregate=15&limit=96";
  try {
    const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${resolution}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5500), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`provider-${response.status}`);
    const body = await response.json() as { data?: { attributes?: { ohlcv_list?: number[][] } } };
    const points = (body.data?.attributes?.ohlcv_list ?? [])
      .filter((row) => Array.isArray(row) && Number.isFinite(row[0]) && Number.isFinite(row[4]) && row[4] > 0)
      .map((row) => ({ timestamp: row[0] * 1000, price: row[4] }))
      .reverse();
    if (points.length < 2) throw new Error("empty-chart");
    return NextResponse.json({ points, source: "GeckoTerminal" }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: "Gráfico indisponível agora." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
