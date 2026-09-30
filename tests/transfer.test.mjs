import test from "node:test";
import assert from "node:assert/strict";
import { parseBRL, splitBRL, destinationError, destinationKey } from "../src/lib/transfer.ts";

test("BRL amounts preserve cents and reject ambiguous malformed input", () => {
  assert.equal(parseBRL("1.250,50"), 1250.5);
  assert.equal(parseBRL("1.000"), 1000);
  assert.equal(parseBRL("1.000.000"), 1000000);
  assert.equal(parseBRL("250,01"), 250.01);
  assert.equal(parseBRL("250.01"), 250.01);
  for (const value of ["", "0", "-2", "2.3456", "1e3", "Infinity", "3,1,2", "12.34,56"]) assert.equal(parseBRL(value), 0, value);
});
test("splitting preserves the entire original sum in integer cents", () => {
  for (const total of [0.01, 100, 999.99, 1234.56]) for (const count of [2,3,7,10]) {
    const result = splitBRL(total,count);
    assert.equal(Math.round(result.share*100)*count + Math.round(result.remainder*100),Math.round(total*100));
  }
  assert.equal(splitBRL(100,0),null);
});
test("destination recognition never equates different-case Solana addresses", () => {
  assert.notEqual(destinationKey("Carteira","Abcd"),destinationKey("Carteira","abcd"));
  assert.equal(destinationKey("PIX"," TEST@example.com "),destinationKey("PIX","test@example.com"));
  assert.notEqual(destinationKey("PIX","a"),destinationKey("Carteira","a"));
  assert.ok(destinationError("Carteira","7mR9...qP4z"));
  assert.ok(destinationError("PIX","abc"));
  assert.equal(destinationError("PIX","teste@example.com"),"");
  assert.equal(destinationError("Carteira","4VvX9NQGZB7rjBfM7K9yvV5SJ6xPkm3BR9U2mZ5wJ1eR"),"");
});
