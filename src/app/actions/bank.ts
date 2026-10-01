"use server";

import { revalidatePath } from "next/cache";
import { addTransaction, getTransactionById, getTransactions } from "@/lib/transactions";
import { cashBalanceCents } from "@/lib/card";
import { INITIAL_BALANCE } from "@/lib/transfer";
import { parseBoleto, parsePix, reserveBalance, RESERVE_IN, RESERVE_OUT, uuidPattern } from "@/lib/bank";
import { sendTransfer } from "@/app/actions/transactions";
import type { NewTransaction } from "@/types/transaction";

export async function payPixCode(requestId: string, payload: string, amount: number) {
  try {
    if (typeof payload !== "string") throw new Error("Código inválido.");
    const parsed = parsePix(payload);
    if (parsed.cents && parsed.cents !== Math.round(amount * 100)) throw new Error("O valor deve ser igual ao do código PIX.");
    const result = await sendTransfer({ requestId, recipient: parsed.recipient, destination: parsed.destination, amount, method: "PIX", message: parsed.message, category: "Transferência" });
    if (result.ok) { revalidatePath("/dashboard/banco"); revalidatePath("/dashboard/cartao"); }
    return result.ok ? { ok: true as const, transactionId: result.transaction.id } : result;
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Falha no PIX." }; }
}

export async function bankOperation(input: { requestId: string; kind: "boleto" | "deposit" | "withdraw"; cents: number; name: string; identifier: string }) {
  try {
    if (!input || !uuidPattern.test(input.requestId) || !Number.isSafeInteger(input.cents) || input.cents <= 0 || input.cents > 100_000_000 || typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 80 || typeof input.identifier !== "string") throw new Error("Revise os dados da operação.");
    let movement: NewTransaction;
    if (input.kind === "boleto") {
      const boleto = parseBoleto(input.identifier);
      if (boleto.cents !== input.cents) throw new Error("Valor diferente do boleto.");
      movement = { descricao: input.name.trim(), destinatario: input.name.trim(), identificador: boleto.line, metodo: "Boleto", tipo: "despesa", valor: input.cents / 100, categoria: "Contas", mensagem: `Banco ${boleto.bank} · beneficiário informado pelo usuário, sem consulta bancária` };
    } else if (input.kind === "deposit" || input.kind === "withdraw") {
      if (!uuidPattern.test(input.identifier)) throw new Error("Cofre inválido.");
      const deposit = input.kind === "deposit";
      movement = { descricao: `${deposit ? "Aporte" : "Resgate"} · ${input.name.trim()}`.slice(0, 80), destinatario: input.name.trim(), identificador: input.identifier, metodo: deposit ? RESERVE_IN : RESERVE_OUT, tipo: deposit ? "despesa" : "receita", valor: input.cents / 100, categoria: "Movimentação interna", mensagem: "Transferência interna demonstrativa entre saldo disponível e cofre. Sem rendimento financeiro." };
    } else throw new Error("Operação inválida.");
    const existing = await getTransactionById(input.requestId);
    if (existing) {
      if (existing.valor !== movement.valor || existing.identificador !== movement.identificador || existing.metodo !== movement.metodo || existing.destinatario !== movement.destinatario || existing.tipo !== movement.tipo) throw new Error("Identificador já usado em outra operação.");
      return { ok: true as const, transactionId: existing.id };
    }
    const transactions = await getTransactions();
    if (input.kind === "withdraw") {
      if (input.cents > reserveBalance(transactions, input.identifier)) throw new Error("Valor acima do saldo do cofre.");
    } else if (input.cents > cashBalanceCents(transactions, INITIAL_BALANCE)) throw new Error("Saldo disponível insuficiente.");
    const result = await addTransaction({ ...movement, status: "Simulação registrada", taxa: 0 }, input.requestId);
    for (const path of ["/dashboard", "/dashboard/banco", "/dashboard/cartao"]) revalidatePath(path);
    return { ok: true as const, transactionId: result.id };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Não foi possível registrar a operação." }; }
}
