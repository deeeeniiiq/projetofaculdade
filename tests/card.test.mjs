import assert from "node:assert/strict";
import test from "node:test";
import { cardStatement, cashBalanceCents, cashMovementCents, recognizedExpensesCents } from "../src/lib/card.ts";

function entry(id, valor, metodo, tipo = "despesa", criado_em = "2026-09-30T12:00:00.000Z") {
  return { id, descricao: metodo, valor, metodo, tipo, criado_em };
}

test("credit purchases use card limit without reducing cash; bill payment settles the liability once", () => {
  const transactions = [
    entry("purchase", 120.75, "Cartão de crédito"),
    entry("payment", 70.25, "Pagamento de fatura"),
    entry("pix", 10.50, "PIX"),
  ];
  const statement = cardStatement(transactions, new Date("2026-09-30T16:00:00.000Z"));
  assert.equal(statement.outstandingCents, 5050);
  assert.equal(statement.monthPurchasesCents, 12075);
  assert.equal(statement.availableCents, 1_500_000 - 5050);
  assert.deepEqual(transactions.map(cashMovementCents), [0, -7025, -1050]);
  assert.equal(cashBalanceCents(transactions, 20487.63), 2_048_763 - 7025 - 1050);
  assert.equal(recognizedExpensesCents(transactions), 12075 + 1050);
});

test("São Paulo calendar month defines card statement boundaries", () => {
  const transactions = [
    entry("late-sep", 40, "Cartão de crédito", "despesa", "2026-10-01T02:30:00.000Z"),
    entry("oct", 30, "Cartão de crédito", "despesa", "2026-10-01T04:00:00.000Z"),
  ];
  const statement = cardStatement(transactions, new Date("2026-10-01T12:00:00.000Z"));
  assert.equal(statement.monthPurchasesCents, 3000);
  assert.equal(statement.outstandingCents, 7000);
});

test("partial bill payments settle oldest purchases first and preserve the open statement", () => {
  const transactions = [
    entry("old", 80, "Cartão de crédito", "despesa", "2026-09-01T12:00:00.000Z"),
    entry("new", 50, "Cartão de crédito", "despesa", "2026-09-15T12:00:00.000Z"),
    entry("bill", 95, "Pagamento de fatura", "despesa", "2026-09-20T12:00:00.000Z"),
  ];
  const statement = cardStatement(transactions);
  assert.equal(statement.outstandingCents, 3500);
  assert.deepEqual(statement.openPurchases.map((item) => [item.transaction.id, item.remainingCents]), [["new", 3500]]);
});
