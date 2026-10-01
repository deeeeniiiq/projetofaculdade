import { BankHub } from "@/components/bank-hub";
import { getTransactions } from "@/lib/transactions";
import { cashBalanceCents } from "@/lib/card";
import { INITIAL_BALANCE } from "@/lib/transfer";

export const dynamic = "force-dynamic";
export default async function BankPage() {
  const transactions = await getTransactions();
  return <BankHub transactions={transactions} cashCents={cashBalanceCents(transactions, INITIAL_BALANCE)} />;
}
