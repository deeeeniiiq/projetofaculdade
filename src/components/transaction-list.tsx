"use client";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Link from "next/link";
import { motion } from "framer-motion";
import { getTransactionDetails } from "@/lib/transaction-details";
import type { Transaction } from "@/types/transaction";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center border-t border-white/[0.055] px-5 text-center">
        <div>
          <p className="text-sm font-semibold text-[#d9dadd]">Nenhuma atividade ainda</p>
          <p className="mt-1 text-xs text-[#717378]">As movimentações da carteira aparecem aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.055]">
      {transactions.map((transaction, index) => {
        const income = transaction.tipo === "receita";
        const details = getTransactionDetails(transaction);

        return (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.25), duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-white/[0.05] last:border-b-0"
          >
            <Link
              href={`/dashboard/comprovante/${transaction.id}`}
              className="group flex min-h-[72px] items-center gap-3 px-1 py-3 transition hover:bg-white/[0.025] sm:px-2"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#292b2e] text-[11px] font-bold tracking-[-0.02em] text-[#e3e4e6] ring-1 ring-inset ring-white/[0.045]">
                {details.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.012em] text-[#eef0f1]">{details.counterparty}</p>
                  <span className="hidden rounded-full bg-white/[0.045] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/35 sm:inline-flex">{details.category}</span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-[#77797e]">{details.method} · {dateFormatter.format(new Date(transaction.criado_em))}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[13px] font-semibold tracking-[-0.015em] ${income ? "text-[#68df9d]" : "text-[#f0f1f2]"}`}>
                  {income ? "+" : "−"}{currency.format(transaction.valor)}
                </p>
                <p className="mt-0.5 text-[9px] text-[#5e6065]">{details.status}</p>
              </div>
              <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="shrink-0 text-white/15 transition group-hover:translate-x-0.5 group-hover:text-white/38" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
