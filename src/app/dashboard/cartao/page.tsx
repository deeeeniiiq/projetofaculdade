import { CardWallet } from "@/components/card-wallet";
import { cashBalanceCents } from "@/lib/card";
import { getTransactions } from "@/lib/transactions";
import { INITIAL_BALANCE } from "@/lib/transfer";

export const dynamic = "force-dynamic";

export default async function CardPage() {
  const transactions = await getTransactions();
  return (
    <CardWallet
      transactions={transactions}
      cashBalance={cashBalanceCents(transactions, INITIAL_BALANCE) / 100}
    />
  );
}
