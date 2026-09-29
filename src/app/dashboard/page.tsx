import { DashboardView } from "@/components/dashboard-view";
import { getTransactions, isDemoMode } from "@/lib/transactions";

export const dynamic = "force-dynamic";

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
      balance={income - expenses}
      demoMode={isDemoMode()}
    />
  );
}
