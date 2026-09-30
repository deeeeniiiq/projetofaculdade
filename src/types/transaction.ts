export type TransactionType = "receita" | "despesa";

export type Transaction = {
  id: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  criado_em: string;
  destinatario?: string | null;
  identificador?: string | null;
  metodo?: string | null;
  mensagem?: string | null;
  categoria?: string | null;
  status?: string | null;
  taxa?: number | null;
};

export type NewTransaction = Pick<Transaction, "descricao" | "valor" | "tipo"> &
  Partial<Pick<Transaction, "destinatario" | "identificador" | "metodo" | "mensagem" | "categoria" | "status" | "taxa">>;
