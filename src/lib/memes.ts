export type MemeToken = {
  address: string;
  poolAddress: string;
  name: string;
  symbol: string;
  image: string;
  priceUsd: number;
  change5m: number;
  change1h: number;
  change24h: number;
  liquidityUsd: number;
  volume24hUsd: number;
  buys1h: number;
  sells1h: number;
  createdAt: string | null;
};

export type MemeFeed = {
  tokens: MemeToken[];
  source: "GeckoTerminal" | "DEX Screener";
  mode: "trending" | "recent";
  updatedAt: string;
};

export const solanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type GeckoIncluded = {
  id?: string;
  attributes?: {
    address?: string;
    name?: string;
    symbol?: string;
    image_url?: string;
  };
};

type GeckoPool = {
  attributes?: {
    address?: string;
    pool_created_at?: string;
    base_token_price_usd?: string;
    reserve_in_usd?: string;
    price_change_percentage?: { m5?: string; h1?: string; h24?: string };
    volume_usd?: { h24?: string };
    transactions?: { h1?: { buys?: number; sells?: number } };
  };
  relationships?: { base_token?: { data?: { id?: string } } };
};

export type GeckoResponse = { data?: GeckoPool[]; included?: GeckoIncluded[] };

const commonAssets = new Set(["SOL", "WSOL", "USDC", "USDT", "BTC", "WBTC", "ETH", "WETH"]);

function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "";
}

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function safeTokenImage(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (host === "coin-images.coingecko.com" || host === "assets.coingecko.com" || host === "cdn.geckoterminal.com" || host.endsWith(".geckoterminal.com") || host === "cdn.dexscreener.com" || host === "dd.dexscreener.com") return url.toString();
  } catch { /* Invalid images use initials. */ }
  return "";
}

export function parseGeckoFeed(payload: GeckoResponse): MemeToken[] {
  const included = new Map((payload.included ?? []).map((token) => [token.id, token.attributes]));
  const seen = new Set<string>();
  const tokens: MemeToken[] = [];

  for (const pool of payload.data ?? []) {
    const attributes = pool.attributes;
    const base = included.get(pool.relationships?.base_token?.data?.id);
    const address = base?.address ?? "";
    const poolAddress = attributes?.address ?? "";
    const symbol = safeText(base?.symbol, 16);
    const priceUsd = finite(attributes?.base_token_price_usd);
    const liquidityUsd = finite(attributes?.reserve_in_usd);
    const volume24hUsd = finite(attributes?.volume_usd?.h24);
    if (!solanaAddress.test(address) || !solanaAddress.test(poolAddress) || !symbol || commonAssets.has(symbol.toUpperCase()) || seen.has(address) || priceUsd <= 0 || liquidityUsd < 10_000 || volume24hUsd < 10_000) continue;
    seen.add(address);
    tokens.push({
      address,
      poolAddress,
      name: safeText(base?.name, 54) || symbol,
      symbol,
      image: safeTokenImage(base?.image_url),
      priceUsd,
      change5m: finite(attributes?.price_change_percentage?.m5),
      change1h: finite(attributes?.price_change_percentage?.h1),
      change24h: finite(attributes?.price_change_percentage?.h24),
      liquidityUsd,
      volume24hUsd,
      buys1h: finite(attributes?.transactions?.h1?.buys),
      sells1h: finite(attributes?.transactions?.h1?.sells),
      createdAt: attributes?.pool_created_at && Number.isFinite(Date.parse(attributes.pool_created_at)) ? attributes.pool_created_at : null,
    });
  }
  return tokens.slice(0, 18);
}

type DexProfile = { chainId?: string; tokenAddress?: string; icon?: string };
type DexPair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h1?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

export function parseDexFeed(profiles: DexProfile[], pairs: DexPair[]): MemeToken[] {
  const icons = new Map(profiles.map((profile) => [profile.tokenAddress, profile.icon]));
  const seen = new Set<string>();
  const tokens: MemeToken[] = [];
  for (const pair of pairs) {
    const address = pair.baseToken?.address ?? "";
    const poolAddress = pair.pairAddress ?? "";
    const symbol = safeText(pair.baseToken?.symbol, 16);
    const liquidityUsd = finite(pair.liquidity?.usd);
    const volume24hUsd = finite(pair.volume?.h24);
    const priceUsd = finite(pair.priceUsd);
    if (pair.chainId !== "solana" || !solanaAddress.test(address) || !solanaAddress.test(poolAddress) || !symbol || commonAssets.has(symbol.toUpperCase()) || seen.has(address) || priceUsd <= 0 || liquidityUsd < 10_000 || volume24hUsd < 10_000) continue;
    seen.add(address);
    tokens.push({
      address,
      poolAddress,
      name: safeText(pair.baseToken?.name, 54) || symbol,
      symbol,
      image: safeTokenImage(pair.info?.imageUrl ?? icons.get(address)),
      priceUsd,
      change5m: finite(pair.priceChange?.m5),
      change1h: finite(pair.priceChange?.h1),
      change24h: finite(pair.priceChange?.h24),
      liquidityUsd,
      volume24hUsd,
      buys1h: finite(pair.txns?.h1?.buys),
      sells1h: finite(pair.txns?.h1?.sells),
      createdAt: pair.pairCreatedAt && Number.isFinite(pair.pairCreatedAt) ? new Date(pair.pairCreatedAt).toISOString() : null,
    });
  }
  return tokens.slice(0, 18);
}
