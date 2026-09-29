"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTransaction } from "@/lib/transactions";
import type { TransactionType } from "@/types/transaction";

export type TransactionActionState = {
  message?: string;
  errors?: {
    descricao?: string;
    valor?: string;
    tipo?: string;
  };
};

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
