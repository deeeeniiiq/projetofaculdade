import type { Transaction } from "@/types/transaction";

export type TransactionDetails = {
  counterparty: string;
  identityLabel: string;
  identity: string;
  method: string;
  category: string;
  location: string;
  status: string;
  initials: string;
  tone: "income" | "expense";
};

const knownDetails: Record<string, Omit<TransactionDetails, "tone">> = {
  salario: {
    counterparty: "Schirmer Tecnologia Ltda.",
    identityLabel: "CNPJ",
    identity: "••.482.•••/0001-••",
    method: "PIX • conta salário",
    category: "Renda",
    location: "Crédito em conta",
    status: "Concluída",
    initials: "ST",
  },
  supermercado: {
    counterparty: "Mercado Central",
    identityLabel: "CNPJ",
    identity: "••.731.•••/0001-••",
    method: "Cartão virtual",
    category: "Mercado",
    location: "São Borja, RS",
    status: "Concluída",
    initials: "MC",
  },
  freelance: {
    counterparty: "Marina Costa",
    identityLabel: "CPF",
    identity: "•••.614.•••-••",
    method: "PIX",
    category: "Freelance",
    location: "Recebimento direto",
    status: "Concluída",
    initials: "MC",
  },
  internet: {
    counterparty: "Claro Internet",
    identityLabel: "CNPJ",
    identity: "••.530.•••/0001-••",
    method: "Débito recorrente",
    category: "Casa",
    location: "Assinatura mensal",
    status: "Concluída",
    initials: "CI",
  },
};

function keyFromDescription(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function getTransactionDetails(transaction: Transaction): TransactionDetails {
  if (transaction.destinatario || transaction.identificador || transaction.metodo) {
    return {
      counterparty: transaction.destinatario || transaction.descricao,
      identityLabel: transaction.metodo === "PIX" ? "Chave PIX" : transaction.metodo?.includes("Cartão") || transaction.metodo === "Pagamento de fatura" ? "Cartão" : "Destino",
      identity: transaction.identificador || "Dados não informados",
      method: transaction.metodo || "Transferência",
      category: transaction.categoria || "Transferência",
      location: transaction.mensagem || "Transferência registrada pela carteira",
      status: transaction.status || "Concluída",
      initials: initials(transaction.destinatario || transaction.descricao),
      tone: transaction.tipo === "receita" ? "income" : "expense",
    };
  }

  const preset = knownDetails[keyFromDescription(transaction.descricao)];
  if (preset) return { ...preset, tone: transaction.tipo === "receita" ? "income" : "expense" };

  return {
    counterparty: transaction.descricao,
    identityLabel: transaction.tipo === "receita" ? "Origem" : "Destino",
    identity: "Dados não informados",
    method: transaction.tipo === "receita" ? "Transferência" : "Pagamento",
    category: transaction.tipo === "receita" ? "Receita" : "Despesa",
    location: "Registrado manualmente",
    status: "Concluída",
    initials: initials(transaction.descricao),
    tone: transaction.tipo === "receita" ? "income" : "expense",
  };
}
