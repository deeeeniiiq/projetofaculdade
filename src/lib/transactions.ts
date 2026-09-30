import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { NewTransaction, Transaction } from "@/types/transaction";

const dataDirectory = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "transactions.json");
const transactionColumns =
  "id, descricao, valor, tipo, criado_em, destinatario, identificador, metodo, mensagem, categoria, status, taxa";

function getSupabaseCredentials() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

function getSupabase() {
  const credentials = getSupabaseCredentials();
  if (!credentials) return null;

  return createClient(credentials.url, credentials.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function ensureDemoStorageIsWritable() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase não configurado no ambiente de produção. Adicione SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente do Vercel.",
    );
  }
}

function demoTransactions(): Transaction[] {
  const now = Date.now();

  return [
    {
      id: randomUUID(),
      descricao: "Salário",
      valor: 5200,
      tipo: "receita",
      criado_em: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: randomUUID(),
      descricao: "Supermercado",
      valor: 286.4,
      tipo: "despesa",
      criado_em: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
    },
    {
      id: randomUUID(),
      descricao: "Freelance",
      valor: 950,
      tipo: "receita",
      criado_em: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
    },
    {
      id: randomUUID(),
      descricao: "Internet",
      valor: 119.9,
      tipo: "despesa",
      criado_em: new Date(now - 1000 * 60 * 60 * 74).toISOString(),
    },
  ];
}

async function readDemoData() {
  ensureDemoStorageIsWritable();

  try {
    const raw = await readFile(dataFile, "utf8");
    return JSON.parse(raw) as Transaction[];
  } catch {
    const seed = demoTransactions();
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(dataFile, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

function normalizeTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    descricao: String(row.descricao),
    valor: Number(row.valor),
    tipo: row.tipo === "receita" ? "receita" : "despesa",
    criado_em: String(row.criado_em),
    destinatario:
      row.destinatario === null || row.destinatario === undefined
        ? null
        : String(row.destinatario),
    identificador:
      row.identificador === null || row.identificador === undefined
        ? null
        : String(row.identificador),
    metodo:
      row.metodo === null || row.metodo === undefined ? null : String(row.metodo),
    mensagem:
      row.mensagem === null || row.mensagem === undefined
        ? null
        : String(row.mensagem),
    categoria:
      row.categoria === null || row.categoria === undefined
        ? null
        : String(row.categoria),
    status:
      row.status === null || row.status === undefined ? null : String(row.status),
    taxa:
      row.taxa === null || row.taxa === undefined ? null : Number(row.taxa),
  };
}

export function isDemoMode() {
  return !getSupabaseCredentials();
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = getSupabase();

  if (!supabase) {
    const data = await readDemoData();
    return data.sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
    );
  }

  const { data, error } = await supabase
    .from("transacoes")
    .select(transactionColumns)
    .order("criado_em", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar transações: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeTransaction(row));
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const supabase = getSupabase();

  if (!supabase) {
    const data = await readDemoData();
    return data.find((transaction) => transaction.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("transacoes")
    .select(transactionColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar transação: ${error.message}`);
  }

  return data ? normalizeTransaction(data) : null;
}

export async function addTransaction(input: NewTransaction, requestId?: string) {
  const supabase = getSupabase();

  if (!supabase) {
    ensureDemoStorageIsWritable();
    const current = await readDemoData();
    const created: Transaction = {
      id: requestId ?? randomUUID(),
      ...input,
      criado_em: new Date().toISOString(),
    };
    await writeFile(dataFile, JSON.stringify([created, ...current], null, 2), "utf8");
    return created;
  }

  const payload: NewTransaction & { id?: string } = { ...input, ...(requestId ? { id: requestId } : {}) };
  const { data, error } = await supabase
    .from("transacoes")
    .insert(payload)
    .select(transactionColumns)
    .single();

  if (error) {
    if (requestId && error.code === "23505") {
      const existing = await getTransactionById(requestId);
      if (existing && existing.valor === input.valor && existing.identificador === input.identificador && existing.metodo === input.metodo && existing.destinatario === input.destinatario) return existing;
    }
    throw new Error(`Falha ao salvar transação: ${error.message}`);
  }

  return normalizeTransaction(data);
}
