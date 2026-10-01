import type { Transaction } from "@/types/transaction";

export const CARD_PURCHASE_METHOD = "Cartão de crédito";
export const CARD_BILL_METHOD = "Pagamento de fatura";
export const CARD_LAST_FOUR = "2048";
export const CARD_MASK = `•••• ${CARD_LAST_FOUR}`;
export const CARD_LIMIT_CENTS = 1_500_000;
export const CARD_CATEGORIES = ["Compras", "Alimentação", "Transporte", "Assinaturas", "Lazer", "Outros"] as const;
export type CardCategory = (typeof CARD_CATEGORIES)[number];

export function toCents(value: number) {
  return Math.round(value * 100);
}

export function brazilMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

export function cashMovementCents(transaction: Transaction) {
  if (transaction.metodo === CARD_PURCHASE_METHOD) return 0;
  return toCents(transaction.valor) * (transaction.tipo === "receita" ? 1 : -1);
}

export function cashBalanceCents(transactions: readonly Transaction[], initialBalance: number) {
  return toCents(initialBalance) + transactions.reduce((total, transaction) =>
    total + cashMovementCents(transaction), 0);
}

export function recognizedExpensesCents(transactions: readonly Transaction[]) {
  return transactions.reduce((total, transaction) =>
    transaction.tipo === "despesa" && transaction.metodo !== CARD_BILL_METHOD && transaction.metodo !== "Aporte no cofre"
      ? total + toCents(transaction.valor)
      : total, 0);
}

export function recognizedIncomeCents(transactions: readonly Transaction[]) {
  return transactions.reduce((sum, item) => item.tipo === "receita" && item.metodo !== "Resgate do cofre" ? sum + toCents(item.valor) : sum, 0);
}

export function cardStatement(transactions: readonly Transaction[], now = new Date()) {
  const purchases = transactions.filter((item) => item.tipo === "despesa" && item.metodo === CARD_PURCHASE_METHOD);
  const billPayments = transactions.filter((item) => item.tipo === "despesa" && item.metodo === CARD_BILL_METHOD);
  const totalPurchasesCents = purchases.reduce((sum, item) => sum + toCents(item.valor), 0);
  const totalPaidCents = billPayments.reduce((sum, item) => sum + toCents(item.valor), 0);
  const outstandingCents = Math.max(0, totalPurchasesCents - totalPaidCents);
  let paidToAllocate = Math.min(totalPurchasesCents, totalPaidCents);
  const openPurchases = [...purchases]
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
    .map((transaction) => {
      const valueCents = toCents(transaction.valor);
      const paidCents = Math.min(valueCents, paidToAllocate);
      paidToAllocate -= paidCents;
      return { transaction, remainingCents: valueCents - paidCents };
    })
    .filter((entry) => entry.remainingCents > 0)
    .reverse();
  const month = brazilMonthKey(now);
  const monthPurchasesCents = purchases.reduce((sum, item) =>
    brazilMonthKey(new Date(item.criado_em)) === month ? sum + toCents(item.valor) : sum, 0);

  return {
    purchases,
    billPayments,
    openPurchases,
    outstandingCents,
    availableCents: Math.max(0, CARD_LIMIT_CENTS - outstandingCents),
    monthPurchasesCents,
    usedPercent: Math.min(100, (outstandingCents / CARD_LIMIT_CENTS) * 100),
  };
}
