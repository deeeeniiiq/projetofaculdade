"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ViewListRoundedIcon from "@mui/icons-material/ViewListRounded";
import { CARD_PURCHASE_METHOD, cashMovementCents } from "@/lib/card";
import { activityMethod, filterActivities, type ActivityMethod, type ActivityType } from "@/lib/activity-filters";
import { getTransactionDetails } from "@/lib/transaction-details";
import { parseBRL } from "@/lib/transfer";
import type { Transaction } from "@/types/transaction";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dayFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" });
function activityDayLabel(isoDate: string) {
  const label = dayFormat.format(new Date(isoDate));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ActivityRow({ transaction, timeline }: { transaction: Transaction; timeline: boolean }) {
  const details = getTransactionDetails(transaction);
  const impact = cashMovementCents(transaction) / 100;
  const cardPurchase = transaction.metodo === CARD_PURCHASE_METHOD;
  return <div className={timeline ? "relative pl-6" : ""}>
    {timeline && <><span className="absolute left-[3px] top-7 h-2.5 w-2.5 rounded-full border-2 border-[#121416] bg-[#ae9ff0]" /><span className="absolute bottom-0 left-[7px] top-10 w-px bg-white/[0.085]" /></>}
    <Link href={"/dashboard/comprovante/" + transaction.id} className="group flex min-w-0 items-center gap-3 rounded-[18px] border border-white/[0.045] bg-[#151619] px-3.5 py-3.5 transition-colors hover:border-white/[0.1] hover:bg-[#1b1c20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9aaf5]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25272a] text-[11px] font-semibold text-[#e9e7ef]">{details.initials}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#eff0ef]">{details.counterparty}</span><span className="mt-1 block truncate text-[10px] text-white/42">{activityMethod(transaction)} · {details.category} · {timeFormat.format(new Date(transaction.criado_em))}</span></span>
      <span className="shrink-0 text-right"><span className={"block text-[12px] font-semibold tabular-nums " + (impact > 0 ? "text-[#78df9f]" : "text-[#f0f0ef]")}>{cardPurchase ? money.format(transaction.valor) : (impact > 0 ? "+" : "") + money.format(impact)}</span><span className="mt-1 inline-flex items-center gap-1 text-[9px] text-white/35">{cardPurchase ? "No crédito · recibo" : "Comprovante"} <ReceiptLongOutlinedIcon sx={{ fontSize: 12 }} /></span></span>
    </Link>
  </div>;
}

export function ActivityExplorer({ transactions }: { transactions: Transaction[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ActivityType>("all");
  const [method, setMethod] = useState<ActivityMethod>("all");
  const [period, setPeriod] = useState("all");
  const [cutoff, setCutoff] = useState(0);
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [limit, setLimit] = useState(20);
  const minAmount = minimum ? parseBRL(minimum) : 0;
  const maxAmount = maximum ? parseBRL(maximum) : 0;
  const invalidRange = (Boolean(minimum) && minAmount <= 0) || (Boolean(maximum) && maxAmount <= 0) || (maxAmount > 0 && minAmount > maxAmount);
  const filtered = useMemo(() => invalidRange ? [] : filterActivities(transactions, { query, type, method, since: cutoff, minAmount, maxAmount }), [transactions, query, type, method, cutoff, minAmount, maxAmount, invalidRange]);
  const visible = filtered.slice(0, limit);
  const net = filtered.reduce((sum, transaction) => sum + cashMovementCents(transaction), 0) / 100;
  const groups = useMemo(() => {
    const result = new Map<string, Transaction[]>();
    for (const transaction of visible) {
      const date = new Date(transaction.criado_em);
      const key = Number.isNaN(date.getTime()) ? "sem-data" : dayKey.format(date);
      result.set(key, [...(result.get(key) ?? []), transaction]);
    }
    return [...result.entries()];
  }, [visible]);

  function exportCsv() {
    if (invalidRange || !filtered.length) return;
    const params = new URLSearchParams({ q: query, type, method, since: String(cutoff), min: String(minAmount), max: String(maxAmount) });
    // This route streams a CSV attachment, not a Next.js page.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/transactions/export?" + params.toString());
  }

  return <div className="space-y-4">
    <div className="space-y-3 rounded-[18px] border border-white/[0.045] bg-[#111214] p-3.5">
      <label className="flex h-11 items-center gap-2 rounded-xl bg-[#1b1c1f] px-3 text-white/45"><SearchRoundedIcon sx={{ fontSize: 18 }} /><input aria-label="Buscar transações" value={query} onChange={event => { setQuery(event.target.value); setLimit(20); }} placeholder="Pessoa, chave, categoria ou mensagem" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30" /></label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">{([["all", "Tudo"], ["receita", "Entradas"], ["despesa", "Saídas"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={type === id} onClick={() => { setType(id); setLimit(20); }} className={"rounded-lg px-3 py-2 text-[11px] transition " + (type === id ? "bg-white/[0.09] text-white" : "text-white/45 hover:bg-white/[0.05]")}>{label}</button>)}</div>
        <div className="flex gap-1 rounded-xl bg-[#1b1c1f] p-1"><button type="button" aria-label="Linha do tempo" aria-pressed={view === "timeline"} onClick={() => setView("timeline")} className={"grid h-8 w-8 place-items-center rounded-lg " + (view === "timeline" ? "bg-[#34343b] text-white" : "text-white/40")}><TimelineRoundedIcon sx={{ fontSize: 18 }} /></button><button type="button" aria-label="Lista" aria-pressed={view === "list"} onClick={() => setView("list")} className={"grid h-8 w-8 place-items-center rounded-lg " + (view === "list" ? "bg-[#34343b] text-white" : "text-white/40")}><ViewListRoundedIcon sx={{ fontSize: 18 }} /></button></div>
      </div>
      <details className="group border-t border-white/[0.055] pt-2"><summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-[11px] font-semibold text-white/55"><TuneRoundedIcon sx={{ fontSize: 16 }} />Filtros por método e valor<span className="ml-auto text-[10px] text-white/30 group-open:hidden">Abrir</span></summary>
        <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
          <label className="text-[10px] text-white/45">Período<select aria-label="Período do histórico" value={period} onChange={event => { const value = event.target.value; setPeriod(value); setCutoff(value === "all" ? 0 : Date.now() - Number(value) * 86400000); setLimit(20); }} className="mt-1 h-10 w-full rounded-lg bg-[#232428] px-2 text-[11px] text-white"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
          <label className="text-[10px] text-white/45">Método<select aria-label="Método da transação" value={method} onChange={event => { setMethod(event.target.value as ActivityMethod); setLimit(20); }} className="mt-1 h-10 w-full rounded-lg bg-[#232428] px-2 text-[11px] text-white">{(["all", "PIX", "Carteira", "Cartão", "Outros"] as const).map(value => <option key={value} value={value}>{value === "all" ? "Todos" : value}</option>)}</select></label>
          <label className="text-[10px] text-white/45">Mínimo<input aria-label="Valor mínimo" inputMode="decimal" value={minimum} onChange={event => { setMinimum(event.target.value); setLimit(20); }} placeholder="R$ 0,00" className="mt-1 h-10 w-full rounded-lg bg-[#232428] px-2 text-[11px] text-white outline-none" /></label>
          <label className="text-[10px] text-white/45">Máximo<input aria-label="Valor máximo" inputMode="decimal" value={maximum} onChange={event => { setMaximum(event.target.value); setLimit(20); }} placeholder="Sem limite" className="mt-1 h-10 w-full rounded-lg bg-[#232428] px-2 text-[11px] text-white outline-none" /></label>
        </div>
        {invalidRange && <p role="alert" className="pt-2 text-[10px] text-[#f494a0]">Confira os valores do filtro. Use, por exemplo, 100,00.</p>}
      </details>
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.055] pt-3"><p aria-live="polite" className="text-[11px] text-white/45">{filtered.length} {filtered.length === 1 ? "registro" : "registros"} · fluxo <motion.span key={net} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={net >= 0 ? "text-[#8be8b2]" : "text-[#ff9da8]"}>{money.format(net)}</motion.span></p><button type="button" disabled={!filtered.length || invalidRange} onClick={exportCsv} className="flex items-center gap-1 text-[11px] text-white/65 disabled:opacity-30"><FileDownloadRoundedIcon sx={{ fontSize: 16 }} />CSV</button></div>
    </div>
    <AnimatePresence mode="wait" initial={false}><motion.div key={view} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22 }} className="space-y-4">{visible.length ? groups.map(([key, items]) => <div key={key}><p className="mb-2 px-1 text-[10px] font-semibold tracking-[0.03em] text-white/38">{key === "sem-data" ? "Sem data" : activityDayLabel(items[0].criado_em)}</p><div className="space-y-2">{items.map(transaction => <ActivityRow key={transaction.id} transaction={transaction} timeline={view === "timeline"} />)}</div></div>) : <p className="py-10 text-center text-sm text-white/40">{invalidRange ? "Ajuste os valores para ver o histórico." : "Nenhum registro encontrado para este filtro."}</p>}</motion.div></AnimatePresence>
    {filtered.length > limit && <button type="button" onClick={() => setLimit(limit + 20)} className="w-full rounded-xl bg-[#1a1b1e] py-3 text-xs text-white/65">Carregar mais registros</button>}
  </div>;
}
