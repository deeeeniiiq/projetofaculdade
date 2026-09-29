import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { NewTransaction, Transaction } from "@/types/transaction";

const dataDirectory = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "transactions.json");

function getSupabaseCredentials() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    .select("id, descricao, valor, tipo, criado_em")
    .order("criado_em", { ascending: false });

  if (error) {
    throw new Error(`Falha ao buscar transações: ${error.message}`);
  }

  return (data ?? []).map((row) => normalizeTransaction(row));
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const supabase = getSupabase();

  if (!supabase) {
    const data = await readDemoData();
    return data.find((transaction) => transaction.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from("transacoes")
    .select("id, descricao, valor, tipo, criado_em")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar transação: ${error.message}`);
  }

  return data ? normalizeTransaction(data) : null;
}

export async function addTransaction(input: NewTransaction) {
  const supabase = getSupabase();

  if (!supabase) {
    const current = await readDemoData();
    const created: Transaction = {
      id: randomUUID(),
      ...input,
      criado_em: new Date().toISOString(),
    };
    await writeFile(dataFile, JSON.stringify([created, ...current], null, 2), "utf8");
    return created;
  }

  const { data, error } = await supabase
    .from("transacoes")
    .insert(input)
    .select("id, descricao, valor, tipo, criado_em")
    .single();

  if (error) {
    throw new Error(`Falha ao salvar transação: ${error.message}`);
  }

  return normalizeTransaction(data);
}
