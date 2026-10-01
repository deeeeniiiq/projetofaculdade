import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { buildPix, demoBoleto } from "../src/lib/bank.ts";

const ledger = [];
globalThis.__bankTestLedger = ledger;
const mock = `export async function getTransactions(){return globalThis.__bankTestLedger;}
export async function getTransactionById(id){return globalThis.__bankTestLedger.find(item=>item.id===id)||null;}
export async function addTransaction(input,id){const tx={...input,id,criado_em:new Date().toISOString()};globalThis.__bankTestLedger.push(tx);return tx;}`;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/cache") return { url: "data:text/javascript,export function revalidatePath(){}", shortCircuit: true };
  if (specifier === "next/navigation") return { url: "data:text/javascript,export function redirect(){}", shortCircuit: true };
  if (specifier === "@/lib/transactions") return { url: "data:text/javascript," + encodeURIComponent(mock), shortCircuit: true };
  if (specifier.startsWith("@/")) return { url: pathToFileURL(path.resolve("src", specifier.slice(2) + ".ts")).href, shortCircuit: true };
  return next(specifier, context);
} });
const { bankOperation, payPixCode } = await import("../src/app/actions/bank.ts");
const { simulateCardPurchase } = await import("../src/app/actions/card.ts");
const { buildStatementPdf } = await import("../src/lib/statement-pdf.ts");
test("monthly PDF handles multiple pages and treats credit purchases as zero cash impact", () => {
  const before = { id: randomUUID(), descricao: "Entrada anterior", valor: 100, tipo: "receita", criado_em: "2026-09-30T15:00:00Z" };
  const credit = { id: randomUUID(), descricao: "Compra no crédito", valor: 20, tipo: "despesa", metodo: "Cartão de crédito", criado_em: "2026-10-01T15:00:00Z" };
  const pdf = Buffer.from(buildStatementPdf([before, credit], "2026-10")).toString("latin1");
  assert.ok(pdf.includes("20.587,63"));
  assert.ok(pdf.includes("No crédito"));
  assert.ok(pdf.includes("/Count 1"));
  const many = Array.from({ length: 35 }, () => ({ ...credit, id: randomUUID() }));
  assert.ok(Buffer.from(buildStatementPdf(many, "2026-10")).toString("latin1").includes("/Count 4"));
  assert.throws(() => buildStatementPdf([], "2026-13"));
});
test("bank actions validate balances, prevent identifier retries from duplicating, and issue traceable movements", async () => {
  const goal = randomUUID(), requestId = randomUUID();
  const input = { requestId, kind: "deposit", cents: 10000, name: "Viagem", identifier: goal };
  assert.equal((await bankOperation(input)).ok, true);
  assert.equal((await bankOperation(input)).ok, true);
  assert.equal(ledger.length, 1);
  assert.equal((await bankOperation({ ...input, cents: 10001 })).ok, false);
  assert.equal((await bankOperation({ ...input, requestId: randomUUID(), kind: "withdraw", cents: 10001 })).ok, false);
  assert.equal((await bankOperation({ ...input, requestId: randomUUID(), kind: "withdraw", cents: 10000 })).ok, true);
  assert.equal((await bankOperation({ ...input, requestId: randomUUID(), cents: 99999999 })).ok, false);
  assert.equal((await bankOperation({ requestId: randomUUID(), kind: "boleto", cents: 12991, name: "Loja", identifier: demoBoleto() })).ok, false);
  const boletoId = randomUUID();
  assert.equal((await bankOperation({ requestId: boletoId, kind: "boleto", cents: 12990, name: "Loja", identifier: demoBoleto() })).ok, true);
  assert.equal(ledger.at(-1).identificador.length, 47);
  assert.equal((await payPixCode(randomUUID(), buildPix(1000, "Daniel"), 11)).ok, false);
  const pixId = randomUUID();
  assert.equal((await payPixCode(pixId, buildPix(1000, "Daniel"), 10)).ok, true);
  assert.equal((await payPixCode(pixId, buildPix(1000, "Daniel"), 10)).ok, true);
  assert.equal(ledger.filter((item) => item.id === pixId).length, 1);
});
test("temporary cards are consumed on the server and allow only the same request retry", async () => {
  const input = { requestId: randomUUID(), merchant: "Loja teste", amount: 5, category: "Compras", channel: "Online", temporary: { id: randomUUID(), lastFour: "1234", expires: Date.now() + 600000 } };
  assert.equal((await simulateCardPurchase(input)).ok, true);
  assert.equal((await simulateCardPurchase(input)).ok, true);
  assert.equal((await simulateCardPurchase({ ...input, requestId: randomUUID() })).ok, false);
  assert.equal((await simulateCardPurchase({ ...input, requestId: randomUUID(), temporary: { ...input.temporary, id: randomUUID(), expires: Date.now() - 1 } })).ok, false);
});
