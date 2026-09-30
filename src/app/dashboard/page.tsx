import { DashboardView } from "@/components/dashboard-view";
import { cashBalanceCents, recognizedExpensesCents } from "@/lib/card";
import { getTransactions, isDemoMode } from "@/lib/transactions";

export const dynamic = "force-dynamic";

import { INITIAL_BALANCE } from "@/lib/transfer";

export default async function DashboardPage() {
  const transactions = await getTransactions();
  const income = transactions
    .filter((transaction) => transaction.tipo === "receita")
    .reduce((sum, transaction) => sum + transaction.valor, 0);
  const expenses = recognizedExpensesCents(transactions) / 100;

  return (
    <DashboardView
      transactions={transactions}
      income={income}
      expenses={expenses}
      balance={cashBalanceCents(transactions, INITIAL_BALANCE) / 100}
      demoMode={isDemoMode()}
    />
  );
}
