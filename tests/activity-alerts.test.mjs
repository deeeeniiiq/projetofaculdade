import test from "node:test";
import assert from "node:assert/strict";
import { filterActivities } from "../src/lib/activity-filters.ts";
import { evaluatePriceAlerts } from "../src/lib/price-alerts.ts";

const entries = [
  { id: "old-pix", descricao: "Mercado", valor: 120, tipo: "despesa", metodo: "PIX", criado_em: "2026-09-12T12:00:00Z" },
  { id: "card", descricao: "Cinema", valor: 50, tipo: "despesa", metodo: "Cartão virtual", criado_em: "2026-09-14T12:00:00Z" },
  { id: "new-pix", descricao: "Café", valor: 25, tipo: "despesa", metodo: "PIX", criado_em: "2026-09-16T12:00:00Z" },
];

test("activity filters match method, amount and text and keep newest first", () => {
  const base = { query: "", type: "all", method: "all", since: 0, minAmount: 0, maxAmount: 0 };
  assert.deepEqual(filterActivities(entries, base).map((entry) => entry.id), ["new-pix", "card", "old-pix"]);
  assert.deepEqual(filterActivities(entries, { ...base, method: "PIX", minAmount: 100 }).map((entry) => entry.id), ["old-pix"]);
  assert.deepEqual(filterActivities(entries, { ...base, method: "Cartão", maxAmount: 60, query: "cinema" }).map((entry) => entry.id), ["card"]);
  assert.deepEqual(filterActivities(entries, { ...base, since: Date.parse("2026-09-15T00:00:00Z") }).map((entry) => entry.id), ["new-pix"]);
});

test("one-shot price alerts fire only after threshold and never repeat", () => {
  const alert = { id: "1", address: "token", name: "Teste", symbol: "TST", targetUsd: 2, direction: "above", createdAt: 100, triggeredAt: null };
  const before = evaluatePriceAlerts([alert], new Map([["token", 1.9]]), 200);
  assert.equal(before.triggered.length, 0);
  const after = evaluatePriceAlerts(before.alerts, new Map([["token", 2]]), 300);
  assert.equal(after.triggered.length, 1);
  assert.equal(after.alerts[0].triggeredAt, 300);
  assert.equal(evaluatePriceAlerts(after.alerts, new Map([["token", 3]]), 400).triggered.length, 0);
  assert.equal(evaluatePriceAlerts([{ ...alert, direction: "below" }], new Map([["token", 1.5]]), 300).triggered.length, 1);
});
