import test from "node:test";
import assert from "node:assert/strict";
import { convertAmount, isQuoteFresh, parseAmount } from "../src/lib/market.ts";

test("BRL decimal input accepts comma and rejects malformed or non-positive values", () => {
  assert.equal(parseAmount("250,50"), 250.5);
  assert.equal(parseAmount("0.00000001"), 0.00000001);
  for (const value of ["", "NaN", "Infinity", "-100", "0", "1e8", "1,2,3", "1.2.3", "0.000000001", "letters"]) {
    assert.equal(parseAmount(value), 0, value);
  }
});

test("BRL purchase and SOL/USDC swap use the quoted ratio", () => {
  assert.equal(convertAmount(500, 1, 625), 0.8);
  assert.equal(convertAmount(1.5, 625, 5), 187.5);
  assert.equal(convertAmount(187.5, 5, 625), 1.5);
});

test("missing and invalid market prices never create a quote", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.equal(convertAmount(100, 1, value), 0);
    assert.equal(convertAmount(100, value, 625), 0);
    assert.equal(convertAmount(value, 1, 625), 0);
  }
  assert.equal(convertAmount(Number.MAX_VALUE, Number.MAX_VALUE, 1), 0);
});

test("review rejects expired quotes and invalid timestamps", () => {
  const now = 1_800_000_000_000;
  assert.equal(isQuoteFresh(now - 30_000, now), true);
  assert.equal(isQuoteFresh(now - 90_001, now), false);
  assert.equal(isQuoteFresh(NaN, now), false);
  assert.equal(isQuoteFresh(0, now), false);
  assert.equal(isQuoteFresh(now + 60_000, now), false);
});
