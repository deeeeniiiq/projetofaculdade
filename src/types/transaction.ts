export type TransactionType = "receita" | "despesa";

export type Transaction = {
  id: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  criado_em: string;
};

export type NewTransaction = Pick<Transaction, "descricao" | "valor" | "tipo">;
