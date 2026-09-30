import { DashboardView } from "@/components/dashboard-view";
import { getTransactions, isDemoMode } from "@/lib/transactions";

export const dynamic = "force-dynamic";

import { INITIAL_BALANCE } from "@/lib/transfer";

export default async function DashboardPage() {
  const transactions = await getTransactions();
  const income = transactions
    .filter((transaction) => transaction.tipo === "receita")
    .reduce((sum, transaction) => sum + transaction.valor, 0);
  const expenses = transactions
    .filter((transaction) => transaction.tipo === "despesa")
    .reduce((sum, transaction) => sum + transaction.valor, 0);

  return (
    <DashboardView
      transactions={transactions}
      income={income}
      expenses={expenses}
      balance={INITIAL_BALANCE + income - expenses}
      demoMode={isDemoMode()}
    />
  );
}
