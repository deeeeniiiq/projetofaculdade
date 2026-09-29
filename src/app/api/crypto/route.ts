import { NextRequest, NextResponse } from "next/server";
import { ranges } from "@/lib/market";

const coinConfig = {
  bitcoin: {
    symbol: "BTCUSDT",
    ticker: "BTC",
    name: "Bitcoin",
    image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  },
  ethereum: {
    symbol: "ETHUSDT",
    ticker: "ETH",
    name: "Ethereum",
    image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
  solana: {
    symbol: "SOLUSDT",
    ticker: "SOL",
    name: "Solana",
    image: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
  },
  "usd-coin": {
    symbol: "USDCUSDT",
    ticker: "USDC",
    name: "USDC",
    image: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  },
  binancecoin: {
    symbol: "BNBUSDT",
    ticker: "BNB",
    name: "BNB",
    image: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  },
  chainlink: {
    symbol: "LINKUSDT",
    ticker: "LINK",
    name: "Chainlink",
    image: "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  },
} as const;

type CoinId = keyof typeof coinConfig;

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

const supportedCoins = Object.keys(coinConfig) as CoinId[];

function isCoinId(value: string): value is CoinId {
  return supportedCoins.includes(value as CoinId);
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("market-provider-" + response.status);
  }

  return (await response.json()) as T;
}

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("id") ?? "bitcoin";
  const coinId: CoinId = isCoinId(requested) ? requested : "bitcoin";
  const selected = coinConfig[coinId];
  const range = ranges.find((item) => item.id === request.nextUrl.searchParams.get("range")) ?? ranges[0];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const symbols = supportedCoins.map((id) => coinConfig[id].symbol);
    const tickersUrl =
      "https://api.binance.com/api/v3/ticker/24hr?symbols=" +
      encodeURIComponent(JSON.stringify(symbols));
    const brlUrl = "https://api.binance.com/api/v3/ticker/price?symbol=USDTBRL";
    const chartUrl =
      "https://api.binance.com/api/v3/klines?symbol=" +
      encodeURIComponent(selected.symbol) +
      `&interval=${range.interval}&limit=${range.limit}`;

    const [tickers, brlTicker, klines] = await Promise.all([
      fetchJson<BinanceTicker[]>(tickersUrl, controller.signal),
      fetchJson<{ symbol: string; price: string }>(brlUrl, controller.signal),
      fetchJson<BinanceKline[]>(chartUrl, controller.signal),
    ]);

    const brlRate = Number(brlTicker.price);

    if (!Number.isFinite(brlRate) || brlRate <= 0) {
      throw new Error("invalid-brl-rate");
    }

    const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));

    const markets = supportedCoins
      .map((id) => {
        const config = coinConfig[id];
        const ticker = bySymbol.get(config.symbol);
        if (!ticker) return null;

        const currentPrice = Number(ticker.lastPrice) * brlRate;
        const high24h = Number(ticker.highPrice) * brlRate;
        const low24h = Number(ticker.lowPrice) * brlRate;
        const volume24h = Number(ticker.quoteVolume) * brlRate;
        const change24h = Number(ticker.priceChangePercent);

        return {
          id,
          symbol: config.ticker.toLowerCase(),
          name: config.name,
          image: `/coins/${id}.png`,
          current_price: Number.isFinite(currentPrice) ? currentPrice : 0,
          market_cap: Number.isFinite(volume24h) ? volume24h : 0,
          volume_24h: Number.isFinite(volume24h) ? volume24h : 0,
          high_24h: Number.isFinite(high24h) ? high24h : 0,
          low_24h: Number.isFinite(low24h) ? low24h : 0,
          price_change_percentage_24h: Number.isFinite(change24h) ? change24h : 0,
        };
      })
      .filter(Boolean);

    const chart = Array.isArray(klines)
      ? klines
          .map((item) => {
            const timestamp = Number(item[0]);
            const price = Number(item[4]) * brlRate;
            return { timestamp, price };
          })
          .filter(
            (point) =>
              Number.isFinite(point.timestamp) &&
              Number.isFinite(point.price) &&
              point.price > 0,
          )
      : [];

    return NextResponse.json(
      {
        markets,
        chart,
        selected: coinId,
        range: range.id,
        updatedAt: new Date().toISOString(),
        source: "Binance",
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "A consulta ao mercado excedeu o tempo limite."
        : "Não foi possível consultar o mercado agora.";

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
