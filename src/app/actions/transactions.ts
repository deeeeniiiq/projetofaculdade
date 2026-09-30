"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTransaction, getTransactions, getTransactionById } from "@/lib/transactions";
import { destinationError, INITIAL_BALANCE } from "@/lib/transfer";
import { cashBalanceCents } from "@/lib/card";
import type { Transaction, TransactionType } from "@/types/transaction";

export type TransactionActionState = {
  message?: string;
  errors?: {
    descricao?: string;
    valor?: string;
    tipo?: string;
  };
};

export type SendTransferInput = {
  requestId: string;
  recipient: string;
  destination: string;
  amount: number;
  method: "PIX" | "Carteira";
  message?: string;
  category?: "Transferência" | "Alimentação" | "Moradia" | "Presente";
};

export type SendTransferResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: string };

export async function sendTransfer(
  input: SendTransferInput,
): Promise<SendTransferResult> {
  if (!input || typeof input.recipient !== "string" || typeof input.destination !== "string" || (input.message != null && typeof input.message !== "string")) {
    return { ok: false, error: "Dados inválidos. Revise o envio." };
  }
  const recipient = input.recipient.trim();
  const destination = input.destination.trim();
  const message = input.message?.trim() ?? "";
  const amount = Number(input.amount);
  const category = input.category ?? "Transferência";
  if (typeof input.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) return { ok: false, error: "Reabra o envio para gerar um novo identificador." };

  if (recipient.length < 2 || recipient.length > 80) {
    return { ok: false, error: "Informe quem vai receber." };
  }
  const invalidDestination = destinationError(input.method, destination);
  if (invalidDestination) return { ok: false, error: invalidDestination };
  if (!["Transferência", "Alimentação", "Moradia", "Presente"].includes(category) || message.length > 240) return { ok: false, error: "Categoria ou mensagem inválida." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Informe um valor maior que zero." };
  }
  if (amount > 1000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) {
    return { ok: false, error: "Valor acima do limite demonstrativo desta carteira." };
  }

  try {
    const existing = await getTransactionById(input.requestId);
    if (existing) {
      if (existing.identificador !== destination || existing.valor !== amount || existing.metodo !== input.method || existing.destinatario !== recipient) return { ok: false, error: "Este envio já foi registrado. Inicie outro envio." };
      return { ok: true, transaction: existing };
    }
    const current = await getTransactions();
    const availableCents = cashBalanceCents(current, INITIAL_BALANCE);
    if (Math.round(amount * 100) > availableCents) return { ok: false, error: "Saldo atualizado insuficiente. Revise o valor." };
    const transaction = await addTransaction({
      descricao: recipient.slice(0, 80),
      valor: amount,
      tipo: "despesa",
      destinatario: recipient.slice(0, 120),
      identificador: destination.slice(0, 180),
      metodo: input.method,
      mensagem: message ? message.slice(0, 240) : null,
      categoria: category,
      status: "Simulação registrada",
      taxa: 0,
    }, input.requestId);

    revalidatePath("/dashboard");
    return { ok: true, transaction };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a transferência.",
    };
  }
}

export async function createTransaction(
  _previousState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const rawValue = String(formData.get("valor") ?? "").replace(",", ".");
  const valor = Number(rawValue);
  const rawType = String(formData.get("tipo") ?? "");
  const errors: TransactionActionState["errors"] = {};

  if (descricao.length < 2) {
    errors.descricao = "Informe uma descrição com pelo menos 2 caracteres.";
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    errors.valor = "Informe um valor maior que zero.";
  }
  if (rawType !== "receita" && rawType !== "despesa") {
    errors.tipo = "Selecione receita ou despesa.";
  }

  if (Object.keys(errors).length > 0) {
    return { message: "Revise os campos destacados.", errors };
  }

  try {
    await addTransaction({
      descricao,
      valor,
      tipo: rawType as TransactionType,
    });
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a transação.",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
