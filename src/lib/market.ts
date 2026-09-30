export const coins = [
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "usd-coin", symbol: "USDC", name: "USDC" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
] as const;

export const ranges = [
  { id: "1d", label: "24h", interval: "15m", limit: 96 },
  { id: "7d", label: "7D", interval: "1h", limit: 168 },
  { id: "30d", label: "30D", interval: "4h", limit: 180 },
  { id: "1y", label: "1A", interval: "1d", limit: 365 },
] as const;

export type CoinId = (typeof coins)[number]["id"];
export type MarketRange = (typeof ranges)[number]["id"];
export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
};
export type ChartPoint = { timestamp: number; price: number };
export type CryptoResponse = {
  markets: MarketCoin[];
  chart: ChartPoint[];
  selected: string;
  range: MarketRange;
  updatedAt: string;
  source: string;
  error?: string;
};

export function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: value > 0 && value < 1 ? 4 : 2,
  }).format(value);
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(value);
}

export function parseAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{0,8})?$/.test(normalized)) return 0;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function convertAmount(amount: number, fromPrice: number, toPrice: number) {
  if (![amount, fromPrice, toPrice].every((value) => Number.isFinite(value) && value > 0)) return 0;
  const result = amount * fromPrice / toPrice;
  return Number.isFinite(result) ? result : 0;
}

// Read the clock only when the user reviews or confirms, never during rendering.
export function isQuoteFresh(timestamp: number, now = Date.now()) {
  return Number.isFinite(timestamp) && timestamp > 0 && now - timestamp <= 90_000 && timestamp <= now + 10_000;
}
