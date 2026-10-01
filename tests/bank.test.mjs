import test from "node:test";
import assert from "node:assert/strict";
import { allocateCents, buildPix, parsePix, crc16, demoBoleto, parseBoleto, nextMonthlyDate, reserveBalance, monthlySummary, detectSubscriptions } from "../src/lib/bank.ts";
import { cardRuleError, defaultRules } from "../src/lib/card-controls.ts";
import { cashBalanceCents, recognizedExpensesCents, recognizedIncomeCents } from "../src/lib/card.ts";

test("PIX CRC matches the CCITT-FALSE reference vector and detects tampering", () => {
  assert.equal(crc16("123456789"), "29B1");
  const code = buildPix(12345, "Daniel", "Almoço compartilhado", "GRUPO1");
  assert.deepEqual(parsePix(code), { recipient: "DANIEL", destination: "demo@saldo.invalid", cents: 12345, message: "ALMOCO COMPARTILHADO" });
  assert.throws(() => parsePix(code.replace("123.45", "123.46")), /checksum/);
  assert.throws(() => buildPix(1.3, "Daniel"));
});
test("invalid PIX TLV, dynamic codes and forged currency are rejected", () => {
  const code = buildPix(100, "Daniel");
  const forgedBody = code.slice(0, -4).replace("5303986", "5303840");
  assert.throws(() => parsePix(forgedBody + crc16(forgedBody)), /reais/);
  const incomplete = code.slice(0, -8) + "2605abc6304";
  assert.throws(() => parsePix(incomplete + crc16(incomplete)));
});
test("boleto validates all three field digits and the general barcode digit", () => {
  const code = demoBoleto(12990);
  assert.equal(code.length, 47);
  assert.equal(parseBoleto(code).cents, 12990);
  for (const index of [0, 9, 10, 20, 21, 31, 32, 37, 46]) {
    const corrupted = code.slice(0, index) + String((Number(code[index]) + 1) % 10) + code.slice(index + 1);
    assert.throws(() => parseBoleto(corrupted), `digit ${index}`);
  }
  assert.throws(() => parseBoleto("8".repeat(48)));
  assert.throws(() => parseBoleto(demoBoleto(0)), /valor definido/);
});
test("group allocations conserve every cent with at most one cent difference", () => {
  for (const cents of [101, 1000, 99999]) for (const count of [2, 3, 7, 20]) {
    const parts = allocateCents(cents, count);
    assert.equal(parts.reduce((sum, part) => sum + part, 0), cents);
    assert.ok(Math.max(...parts) - Math.min(...parts) <= 1);
  }
  assert.throws(() => allocateCents(1, 2));
});
test("monthly instructions clamp short months but retain the original day", () => {
  assert.equal(nextMonthlyDate(31, "2026-01-31"), "2026-02-28");
  assert.equal(nextMonthlyDate(31, "2026-02-28"), "2026-03-31");
  assert.equal(nextMonthlyDate(31, "2028-01-31"), "2028-02-29");
  assert.equal(nextMonthlyDate(31, "2026-12-31"), "2027-01-31");
});
const fixture = (id, value, type, method, date = "2026-10-01T15:00:00Z", other = {}) => ({ id, valor: value, tipo: type, metodo: method, criado_em: date, descricao: id, ...other });
test("reserve movement changes spendable cash without inventing income or expenses", () => {
  const items = [fixture("a", 500, "despesa", "Aporte no cofre", undefined, { identificador: "goal" }), fixture("b", 125.5, "receita", "Resgate do cofre", undefined, { identificador: "goal" }), fixture("c", 80, "despesa", "Cartão de crédito"), fixture("d", 80, "despesa", "Pagamento de fatura")];
  assert.equal(reserveBalance(items, "goal"), 37450);
  assert.equal(cashBalanceCents(items, 1000), 54550);
  assert.equal(recognizedExpensesCents(items), 8000);
  assert.equal(recognizedIncomeCents(items), 0);
});
test("monthly insights use Brazil dates and avoid card bill double-counting", () => {
  const items = [fixture("a", 100, "receita", "PIX", "2026-10-01T02:00:00Z"), fixture("b", 40, "despesa", "Cartão de crédito", undefined, { categoria: "Compras" }), fixture("c", 40, "despesa", "Pagamento de fatura"), fixture("d", 10, "despesa", "Aporte no cofre")];
  const result = monthlySummary(items, "2026-10");
  assert.equal(result.income, 0);
  assert.equal(result.expenses, 4000);
  assert.deepEqual(result.categories, [["Compras", 4000]]);
});
test("subscription suggestions require distinct months or an explicit category", () => {
  const items = [fixture("a", 10, "despesa", "PIX", "2026-09-10T15:00:00Z", { destinatario: "Stream" }), fixture("b", 10, "despesa", "PIX", undefined, { destinatario: "stream" }), fixture("c", 10, "despesa", "PIX", undefined, { destinatario: "Food" }), fixture("d", 10, "despesa", "PIX", undefined, { destinatario: "Food" })];
  assert.equal(detectSubscriptions(items).length, 1);
});
test("card controls enforce channel, amount, expiry and one use", () => {
  assert.match(cardRuleError({ ...defaultRules, online: false }, "Online", 100), /desativadas/);
  assert.match(cardRuleError({ ...defaultRules, capCents: 500 }, "Online", 501), /limite/);
  const card = { id: "a", number: "0000 1234 5678 9000", used: false, expires: 2000 };
  assert.equal(cardRuleError(defaultRules, "Online", 500, card, 1000), "");
  assert.ok(cardRuleError(defaultRules, "Online", 500, card, 2000));
  assert.ok(cardRuleError(defaultRules, "Online", 500, { ...card, used: true }, 1000));
  assert.ok(cardRuleError(defaultRules, "Aproximação", 500, card, 1000));
});
