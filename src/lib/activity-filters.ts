import type { Transaction } from "@/types/transaction";

export type ActivityMethod = "all" | "PIX" | "Carteira" | "Cartão" | "Outros";
export type ActivityType = "all" | "receita" | "despesa";

export type ActivityFilters = {
  query: string;
  type: ActivityType;
  method: ActivityMethod;
  since: number;
  minAmount: number;
  maxAmount: number;
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function activityMethod(transaction: Transaction): Exclude<ActivityMethod, "all"> {
  if (transaction.metodo === "PIX") return "PIX";
  if (transaction.metodo === "Carteira") return "Carteira";
  if (transaction.metodo?.includes("Cartão") || transaction.metodo === "Pagamento de fatura") return "Cartão";
  return "Outros";
}

export function filterActivities(transactions: Transaction[], filters: ActivityFilters) {
  const query = normalized(filters.query.trim());
  return transactions.filter((transaction) => {
    const haystack = normalized([transaction.descricao, transaction.destinatario, transaction.identificador, transaction.mensagem, transaction.categoria, transaction.metodo].filter(Boolean).join(" "));
    return (filters.type === "all" || transaction.tipo === filters.type)
      && (filters.method === "all" || activityMethod(transaction) === filters.method)
      && new Date(transaction.criado_em).getTime() >= filters.since
      && transaction.valor >= filters.minAmount
      && (!filters.maxAmount || transaction.valor <= filters.maxAmount)
      && haystack.includes(query);
  }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}
