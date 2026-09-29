import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import Link from "next/link";
import { TransactionForm } from "@/components/transaction-form";

export default function NewTransactionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-[#77717e] transition hover:text-[#c3beca]">
        <ArrowBackRoundedIcon sx={{ fontSize: 17 }} /> Voltar
      </Link>

      <header className="mt-8">
        <p className="text-xs font-medium text-[#77717e]">Movimentação</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.055em] text-[#f3f1f6]">Nova transação</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[#7f7987]">Registre uma entrada ou saída. O saldo e o histórico são atualizados automaticamente.</p>
      </header>

      <section className="mt-7 rounded-[28px] border border-white/[0.065] bg-[#15131b] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-7">
        <TransactionForm />
      </section>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl px-2 text-[11px] leading-5 text-[#615c69]">
        <LockRoundedIcon sx={{ fontSize: 15 }} className="mt-0.5 shrink-0 text-[#7f77ac]" />
        <p>A gravação é processada no servidor por uma Server Action antes de atualizar o painel.</p>
      </div>
    </div>
  );
}
