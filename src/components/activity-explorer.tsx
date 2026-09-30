"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import { TransactionList } from "@/components/transaction-list";
import type { Transaction } from "@/types/transaction";
import { cashMovementCents } from "@/lib/card";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function ActivityExplorer({ transactions }: { transactions: Transaction[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [limit, setLimit] = useState(20);
  const [cutoff, setCutoff] = useState(0);
  const filtered = useMemo(() => transactions.filter(t => {
    const haystack = normalize([t.descricao, t.destinatario, t.identificador, t.mensagem, t.categoria, t.metodo].filter(Boolean).join(" "));
    return (filter === "all" || t.tipo === filter) && haystack.includes(normalize(query.trim())) && new Date(t.criado_em).getTime() >= cutoff;
  }), [transactions, query, filter, cutoff]);
  const net = filtered.reduce((sum, transaction) => sum + cashMovementCents(transaction), 0) / 100;

  function exportCsv() {
    const params = new URLSearchParams({ q: query, type: filter, since: String(cutoff) });
    // This endpoint returns an attachment, not a Next.js page.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/transactions/export?" + params.toString());
  }

  return <div>
    <div className="mb-4 space-y-3 rounded-[20px] border border-white/[0.06] bg-white/[0.025] p-3.5">
      <label className="flex items-center gap-2 rounded-xl bg-black/20 px-3 text-white/40">
        <SearchRoundedIcon sx={{fontSize:18}} /><input aria-label="Buscar transações" value={query} onChange={e=>{setQuery(e.target.value);setLimit(20);}} placeholder="Pessoa, chave, categoria ou mensagem" className="h-11 min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30" />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">{[["all","Tudo"],["receita","Entradas"],["despesa","Saídas"]].map(([id,label])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>{setFilter(id);setLimit(20);}} className={`relative rounded-lg px-3 py-2 text-[11px] transition ${filter===id ? "bg-[#67df9c]/10 text-[#96edbc]" : "text-white/40 hover:bg-white/5"}`}>{label}</button>)}</div>
        <select aria-label="Período do histórico" value={period} onChange={e=>{setPeriod(e.target.value);setCutoff(e.target.value==="all" ? 0 : Date.now()-Number(e.target.value)*86400000);setLimit(20);}} className="h-9 rounded-lg bg-[#252729] px-2 text-[11px] text-white/65"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <p aria-live="polite" className="text-[11px] text-white/45">{filtered.length} {filtered.length === 1 ? "registro" : "registros"} · saldo <motion.span key={net} initial={{opacity:0}} animate={{opacity:1}} className={net>=0?"text-[#8be8b2]":"text-[#ff9da8]"}>{money.format(net)}</motion.span></p>
        <button type="button" disabled={!filtered.length} onClick={exportCsv} className="flex items-center gap-1 text-[11px] text-white/60 disabled:opacity-30"><FileDownloadRoundedIcon sx={{fontSize:16}} />CSV</button>
      </div>
    </div>
    {filtered.length ? <TransactionList transactions={filtered.slice(0,limit)} /> : <p className="py-10 text-center text-sm text-white/40">Nenhum registro encontrado para este filtro.</p>}
    {filtered.length>limit && <button type="button" onClick={()=>setLimit(limit+20)} className="mt-4 w-full rounded-xl bg-white/5 py-3 text-xs text-white/65">Carregar mais registros</button>}
  </div>;
}
