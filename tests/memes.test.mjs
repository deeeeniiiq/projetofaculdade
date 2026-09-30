import test from "node:test";
import assert from "node:assert/strict";
import { parseDexFeed, parseGeckoFeed, safeTokenImage } from "../src/lib/memes.ts";

const tokenAddress = "DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP";
const poolAddress = "B4VFURUHHzyt8YzBGBV9jiarBvjh1EbMAbRNBnNqaxUD";

test("GeckoTerminal pool data preserves the token contract and ignores duplicate pools", () => {
  const pool = {
    attributes: { address: poolAddress, base_token_price_usd: "0.00001234", reserve_in_usd: "25000", volume_usd: { h24: "90000" }, price_change_percentage: { m5: "1.2", h1: "3.4", h24: "-2.5" }, transactions: { h1: { buys: 42, sells: 17 } } },
    relationships: { base_token: { data: { id: `solana_${tokenAddress}` } } },
  };
  const tokens = parseGeckoFeed({ data: [pool, pool], included: [{ id: `solana_${tokenAddress}`, attributes: { address: tokenAddress, name: "Example", symbol: "EX", image_url: "https://coin-images.coingecko.com/coins/images/1/large/example.png" } }] });
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].address, tokenAddress);
  assert.equal(tokens[0].poolAddress, poolAddress);
  assert.equal(tokens[0].priceUsd, 0.00001234);
  assert.equal(tokens[0].change24h, -2.5);
  assert.equal(tokens[0].buys1h, 42);
});

test("DEX Screener fallback keeps only liquid Solana pairs and never fabricates a price", () => {
  const profile = { chainId: "solana", tokenAddress, icon: "https://cdn.dexscreener.com/token.png" };
  const valid = { chainId: "solana", pairAddress: poolAddress, baseToken: { address: tokenAddress, name: "Example", symbol: "EX" }, priceUsd: "0.004", liquidity: { usd: 20000 }, volume: { h24: 50000 }, priceChange: { h24: 8 } };
  assert.equal(parseDexFeed([profile], [valid, { ...valid, pairAddress: "bad" }, { ...valid, priceUsd: "0" }]).length, 1);
  assert.equal(parseDexFeed([profile], [{ ...valid, liquidity: { usd: 1 } }]).length, 0);
  assert.equal(parseDexFeed([profile], [{ ...valid, chainId: "ethereum" }]).length, 0);
});

test("token artwork accepts known HTTPS image hosts only", () => {
  assert.equal(safeTokenImage("https://coin-images.coingecko.com/a.png"), "https://coin-images.coingecko.com/a.png");
  assert.equal(safeTokenImage("http://coin-images.coingecko.com/a.png"), "");
  assert.equal(safeTokenImage("https://coingecko.com.evil.test/a.png"), "");
});
