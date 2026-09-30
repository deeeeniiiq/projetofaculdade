"use server";

import { revalidatePath } from "next/cache";
import {
  CARD_BILL_METHOD,
  CARD_CATEGORIES,
  CARD_MASK,
  CARD_PURCHASE_METHOD,
  cardStatement,
  cashBalanceCents,
  toCents,
  type CardCategory,
} from "@/lib/card";
import { INITIAL_BALANCE } from "@/lib/transfer";
import { addTransaction, getTransactionById, getTransactions } from "@/lib/transactions";

export type CardActionResult =
  | { ok: true; transactionId: string; amount: number }
  | { ok: false; error: string };

export type CardPurchaseInput = {
  requestId: string;
  merchant: string;
  amount: number;
  category: CardCategory;
};

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validAmount(value: number) {
  return Number.isFinite(value) && value > 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
}

function finished(transactionId: string, amount: number): CardActionResult {
  return { ok: true, transactionId, amount };
}

export async function simulateCardPurchase(input: CardPurchaseInput): Promise<CardActionResult> {
  if (!input || typeof input.requestId !== "string" || !uuidV4.test(input.requestId))
    return { ok: false, error: "Reabra o pagamento para gerar um novo identificador." };
  if (typeof input.merchant !== "string" || typeof input.category !== "string")
    return { ok: false, error: "Revise os dados da compra." };
  const merchant = input.merchant.trim().replace(/\s+/g, " ");
  if (merchant.length < 2 || merchant.length > 70)
    return { ok: false, error: "Informe o estabelecimento com 2 a 70 caracteres." };
  if (!CARD_CATEGORIES.includes(input.category))
    return { ok: false, error: "Escolha uma categoria válida." };
  if (!validAmount(input.amount) || input.amount > 5000)
    return { ok: false, error: "Informe até R$ 5.000,00 por compra demonstrativa." };

  const amountCents = toCents(input.amount);
  try {
    const existing = await getTransactionById(input.requestId);
    if (existing) {
      if (existing.metodo !== CARD_PURCHASE_METHOD || existing.destinatario !== merchant || toCents(existing.valor) !== amountCents)
        return { ok: false, error: "Este identificador já foi utilizado. Inicie outra compra." };
      return finished(existing.id, existing.valor);
    }

    const statement = cardStatement(await getTransactions());
    if (amountCents > statement.availableCents)
      return { ok: false, error: "A compra excede o limite disponível do cartão." };

    const transaction = await addTransaction({
      descricao: merchant,
      destinatario: merchant,
      identificador: CARD_MASK,
      metodo: CARD_PURCHASE_METHOD,
      categoria: input.category,
      mensagem: "Compra no crédito demonstrativo. Nenhuma cobrança real foi efetuada.",
      tipo: "despesa",
      valor: amountCents / 100,
      status: "Simulação registrada",
      taxa: 0,
    }, input.requestId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cartao");
    return finished(transaction.id, transaction.valor);
  } catch {
    return { ok: false, error: "Não foi possível registrar a compra. Tente novamente." };
  }
}

export async function simulateBillPayment(requestId: string, amount: number): Promise<CardActionResult> {
  if (typeof requestId !== "string" || !uuidV4.test(requestId))
    return { ok: false, error: "Reabra a fatura para gerar um novo identificador." };
  if (!validAmount(amount))
    return { ok: false, error: "Informe um valor válido para a fatura." };
  const amountCents = toCents(amount);

  try {
    const existing = await getTransactionById(requestId);
    if (existing) {
      if (existing.metodo !== CARD_BILL_METHOD || toCents(existing.valor) !== amountCents)
        return { ok: false, error: "Este identificador já foi utilizado. Inicie outro pagamento." };
      return finished(existing.id, existing.valor);
    }

    const transactions = await getTransactions();
    const statement = cardStatement(transactions);
    if (amountCents > statement.outstandingCents)
      return { ok: false, error: "O valor ultrapassa a fatura em aberto." };
    if (amountCents > cashBalanceCents(transactions, INITIAL_BALANCE))
      return { ok: false, error: "Saldo da carteira insuficiente para pagar a fatura." };

    const transaction = await addTransaction({
      descricao: "Pagamento de fatura",
      destinatario: "Fatura do cartão virtual",
      identificador: CARD_MASK,
      metodo: CARD_BILL_METHOD,
      categoria: "Cartão",
      mensagem: "Pagamento demonstrativo da fatura. Nenhum valor real foi transferido.",
      tipo: "despesa",
      valor: amountCents / 100,
      status: "Simulação registrada",
      taxa: 0,
    }, requestId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cartao");
    return finished(transaction.id, transaction.valor);
  } catch {
    return { ok: false, error: "Não foi possível registrar o pagamento da fatura." };
  }
}
