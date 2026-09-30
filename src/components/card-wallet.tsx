"use client";

import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { VirtualCard } from "@/components/virtual-card";
import { simulateBillPayment, simulateCardPurchase } from "@/app/actions/card";
import {
  CARD_BILL_METHOD,
  CARD_CATEGORIES,
  CARD_LAST_FOUR,
  CARD_LIMIT_CENTS,
  CARD_PURCHASE_METHOD,
  brazilMonthKey,
  cardStatement,
  type CardCategory,
} from "@/lib/card";
import { parseBRL } from "@/lib/transfer";
import type { Transaction } from "@/types/transaction";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const holderStorageKey = "saldo-demo-card-holder-v1";
const frozenStorageKey = "saldo-demo-card-frozen-v1";
const ease = [0.22, 1, 0.36, 1] as const;
type CardMode = "purchase" | "bill" | "edit" | null;
type CardStep = "compose" | "review" | "processing" | "success";

function amountInReais(cents: number) {
  return money.format(cents / 100);
}

function nextDueDate() {
  const now = new Date();
  const [year, month] = brazilMonthKey(now).split("-").map(Number);
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "America/Sao_Paulo" }).format(now));
  return shortDate.format(new Date(Date.UTC(year, month - 1 + (day <= 10 ? 0 : 1), 10, 15)));
}

export function CardWallet({
  transactions,
  cashBalance,
}: {
  transactions: Transaction[];
  cashBalance: number;
}) {
  const router = useRouter();
  const [holder, setHolder] = useState("Daniel");
  const [holderDraft, setHolderDraft] = useState("Daniel");
  const [frozen, setFrozen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<CardMode>(null);
  const [step, setStep] = useState<CardStep>("compose");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<CardCategory>("Compras");
  const [rawAmount, setRawAmount] = useState("");
  const [requestId, setRequestId] = useState("");
  const [resultId, setResultId] = useState("");
  const [error, setError] = useState("");
  const [cardProgress, setCardProgress] = useState(0);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [pending, startTransition] = useTransition();
  const statement = cardStatement(transactions);
  const paymentAmount = parseBRL(rawAmount);
  const cardEntries = transactions.filter((item) =>
    item.metodo === CARD_PURCHASE_METHOD || item.metodo === CARD_BILL_METHOD,
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedHolder = localStorage.getItem(holderStorageKey);
        if (savedHolder && savedHolder.length <= 30) {
          setHolder(savedHolder);
          setHolderDraft(savedHolder);
        }
        setFrozen(localStorage.getItem(frozenStorageKey) === "true");
      } catch { /* Card preferences stay in this session when storage is blocked. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleFrozen() {
    const next = !frozen;
    setFrozen(next);
    try { localStorage.setItem(frozenStorageKey, String(next)); } catch { /* Local demo only. */ }
  }

  function openMode(nextMode: Exclude<CardMode, null>) {
    setMode(nextMode);
    setStep("compose");
    setError("");
    setResultId("");
    setCardProgress(0);
    setRequestId(crypto.randomUUID());
    setMerchant("");
    setCategory("Compras");
    setRawAmount(nextMode === "bill"
      ? (statement.outstandingCents / 100).toFixed(2).replace(".", ",")
      : "");
    setHolderDraft(holder);
  }

  function closeMode() {
    if (pending || step === "processing") return;
    setMode(null);
    setError("");
  }

  function saveHolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = holderDraft.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2 || cleanName.length > 30) {
      setError("Use um nome com 2 a 30 caracteres.");
      return;
    }
    setHolder(cleanName);
    try { localStorage.setItem(holderStorageKey, cleanName); } catch { /* Local demo only. */ }
    setMode(null);
  }

  function reviewPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "purchase") {
      if (frozen) { setError("Ative o cartão antes de simular uma compra."); return; }
      if (merchant.trim().length < 2) { setError("Informe o estabelecimento."); return; }
      if (paymentAmount <= 0 || paymentAmount > 5000) { setError("Informe até R$ 5.000,00 por compra."); return; }
      if (Math.round(paymentAmount * 100) > statement.availableCents) { setError("Valor acima do limite disponível."); return; }
    } else if (mode === "bill") {
      if (paymentAmount <= 0 || Math.round(paymentAmount * 100) > statement.outstandingCents) { setError("Informe até o valor da fatura em aberto."); return; }
      if (paymentAmount > cashBalance) { setError("Saldo da carteira insuficiente."); return; }
    }
    setError("");
    setStep("review");
  }

  function confirmPayment() {
    if (pending || step === "processing" || !mode || mode === "edit") return;
    setError("");
    setStep("processing");
    setCardProgress(1);
    const visualDelay = new Promise<void>((resolve) => window.setTimeout(resolve, 1250));
    const nextStage = window.setTimeout(() => setCardProgress(2), 480);
    startTransition(async () => {
      try {
        const result = mode === "purchase"
          ? await simulateCardPurchase({ requestId, merchant: merchant.trim(), amount: paymentAmount, category })
          : await simulateBillPayment(requestId, paymentAmount);
        if (!result.ok) { setError(result.error); setStep("review"); return; }
        await visualDelay;
        setCardProgress(3);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 430));
        setResultId(result.transactionId);
        setStep("success");
        router.refresh();
      } catch {
        setError("A conexão foi interrompida. Tente confirmar novamente.");
        setStep("review");
      } finally {
        window.clearTimeout(nextStage);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-28 pt-5 text-white sm:px-7 sm:pt-8 lg:px-10 lg:pb-16">
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" aria-label="Voltar ao início" className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.045] text-white/65 transition hover:bg-white/[0.09] hover:text-white"><ArrowBackRoundedIcon sx={{ fontSize: 21 }} /></Link>
          <div><p className="text-[10px] font-medium text-white/35">CARTEIRA</p><h1 className="text-[21px] font-semibold tracking-[-0.04em] sm:text-[25px]">Cartão virtual</h1></div>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35">SIMULAÇÃO</span>
      </motion.header>

      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:gap-14">
        <div>
          <VirtualCard holder={holder} frozen={frozen} flipped={flipped} onFlip={() => setFlipped((value) => !value)} />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-center text-[10px] text-white/34">Toque para virar · Número e operações fictícios</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5, ease }} className="mt-7 grid grid-cols-3 gap-2.5">
            <button type="button" onClick={() => openMode("purchase")} disabled={frozen || statement.availableCents === 0} className="group flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[18px] bg-[#17181b] px-2 text-[11px] font-semibold text-white/82 transition hover:-translate-y-0.5 hover:bg-[#202126] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBagOutlinedIcon sx={{ fontSize: 23 }} className="text-[#c8baff]" />Pagar</button>
            <button type="button" onClick={() => openMode("bill")} disabled={statement.outstandingCents === 0} className="group flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[18px] bg-[#17181b] px-2 text-[11px] font-semibold text-white/82 transition hover:-translate-y-0.5 hover:bg-[#202126] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"><ReceiptLongRoundedIcon sx={{ fontSize: 23 }} className="text-[#c8baff]" />Pagar fatura</button>
            <button type="button" onClick={() => openMode("edit")} className="group flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[18px] bg-[#17181b] px-2 text-[11px] font-semibold text-white/82 transition hover:-translate-y-0.5 hover:bg-[#202126] active:scale-[0.98]"><EditRoundedIcon sx={{ fontSize: 22 }} className="text-[#c8baff]" />Titular</button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.5, ease }} className="mt-5">
            <button type="button" onClick={toggleFrozen} aria-pressed={frozen} className="flex min-h-11 w-full items-center gap-2.5 border-b border-white/[0.065] px-1 text-left transition hover:text-white">{frozen ? <LockOutlinedIcon sx={{ fontSize: 18 }} className="text-[#ff9aa8]" /> : <LockOpenRoundedIcon sx={{ fontSize: 18 }} className="text-[#b9aaf5]" />}<span className="min-w-0 flex-1 text-[11px] font-medium text-white/65">{frozen ? "Cartão pausado neste aparelho" : "Cartão ativo neste aparelho"}</span><span className={"relative h-5 w-9 shrink-0 rounded-full transition " + (frozen ? "bg-white/15" : "bg-[#a594e9]")}><span className={"absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform " + (frozen ? "translate-x-0.5" : "translate-x-[18px]")} /></span></button>
          </motion.div>
          <p className="mt-2 px-1 text-[9px] leading-4 text-white/32">Nome e pausa são preferências locais. Nenhum dado de cartão real é armazenado.</p>
        </div>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19, duration: 0.65, ease }} className="lg:px-1" aria-label="Fatura calculada do cartão">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">FATURA EM ABERTO</span><span className="text-[10px] text-white/40">Próximo vencimento {nextDueDate()}</span></div>
          <motion.p key={statement.outstandingCents} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease }} className="mt-4 text-[clamp(2.5rem,7vw,4.2rem)] font-semibold leading-none tracking-[-0.07em] text-[#f4f4f5]">{amountInReais(statement.outstandingCents)}</motion.p>
          <p className="mt-3 text-[11px] leading-5 text-white/38">{statement.outstandingCents ? "Compras no crédito menos pagamentos já registrados." : "Sem compras em aberto. Uma compra simulada aparece aqui automaticamente."}</p>
          <div className="mt-9 h-px w-full bg-white/[0.08]" /><div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[0.08]"><motion.div initial={{ width: 0 }} animate={{ width: statement.usedPercent + "%" }} transition={{ delay: 0.42, duration: 0.9, ease }} className="h-full rounded-full bg-[#b8a6f3]" /></div>
          <div className="mt-7 flex items-baseline justify-between gap-3"><span className="text-[11px] text-white/44">Disponível para usar</span><span className="text-[18px] font-semibold tracking-[-0.035em] text-white">{amountInReais(statement.availableCents)}</span></div>
          <div className="mt-5 flex items-baseline justify-between gap-3"><span className="text-[11px] text-white/44">Limite do cartão</span><span className="text-[12px] font-medium text-white/72">{amountInReais(CARD_LIMIT_CENTS)}</span></div>
          <div className="mt-5 flex items-baseline justify-between gap-3"><span className="text-[11px] text-white/44">Compras neste mês</span><span className="text-[12px] font-medium text-white/72">{amountInReais(statement.monthPurchasesCents)}</span></div>
          {statement.openPurchases.length > 0 && <details className="group mt-6 border-t border-white/[0.08] pt-3">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-medium text-white/65 [&::-webkit-details-marker]:hidden">Lançamentos em aberto <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} className="transition-transform group-open:rotate-180" /></summary>
            <div className="pb-2">{statement.openPurchases.map(({ transaction, remainingCents }) => <div key={transaction.id} className="flex items-center justify-between gap-3 border-t border-white/[0.055] py-2.5 text-[10px]"><span className="min-w-0 truncate text-white/48">{transaction.destinatario || transaction.descricao}</span><span className="shrink-0 font-semibold text-white/78">{amountInReais(remainingCents)}</span></div>)}</div>
          </details>}
          <div className="mt-7 h-px w-full bg-white/[0.08]" />
          <div className="mt-6 flex items-baseline justify-between gap-3"><span className="text-[11px] text-white/44">Na carteira</span><span className="text-[16px] font-semibold text-white">{money.format(cashBalance)}</span></div>
          <p className="mt-3 text-[10px] leading-5 text-white/33">A compra usa limite. O saldo da carteira só muda ao pagar a fatura.</p>
          <Link href="/dashboard" className="mt-5 inline-flex min-h-9 items-center gap-1 border-b border-white/25 text-[11px] font-medium text-white/65 transition hover:text-white">Abrir minha carteira <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} /></Link>
          {statement.outstandingCents > 0 && <button type="button" onClick={() => openMode("bill")} className="mt-7 inline-flex min-h-10 items-center gap-2 border-b border-[#c8baff]/60 text-[11px] font-semibold text-[#c8baff] transition hover:text-white">Pagar fatura <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></button>}
        </motion.section>
      </div>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.55, ease }} className="mt-12" aria-label="Movimentações do cartão">
        <div className="mb-4 flex items-end justify-between gap-3 border-t border-white/[0.08] pt-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/40">EXTRATO</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">Movimentações</h2></div><span className="text-[10px] text-white/35">{cardEntries.length ? `${cardEntries.length} registros` : "Cartão virtual"}</span></div>
        <div className="space-y-2">
          {cardEntries.length === 0 ? <div className="flex min-h-[90px] items-center gap-3 rounded-[18px] bg-[#131416] px-4"><CreditCardRoundedIcon sx={{ fontSize: 23 }} className="text-[#b9aaf5]" /><div><p className="text-[12px] font-semibold text-white/75">Nenhuma movimentação ainda</p><p className="mt-1 text-[10px] leading-4 text-white/40">Compras simuladas aparecem aqui com comprovante para baixar.</p></div></div> : cardEntries.slice(0, showAllActivity ? undefined : 6).map((entry) => <Link key={entry.id} href={"/dashboard/comprovante/" + entry.id} className="flex min-h-[72px] items-center gap-3 rounded-[17px] border border-white/[0.035] bg-[#141517] px-4 py-3 transition hover:bg-[#1c1d20]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-[#c2b7ed]">{entry.metodo === CARD_BILL_METHOD ? <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /> : <ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-white/85">{entry.destinatario || entry.descricao}</span><span className="mt-1 block text-[10px] text-white/37">{entry.metodo === CARD_BILL_METHOD ? "Fatura paga" : entry.categoria || "Compra"} · {shortDate.format(new Date(entry.criado_em))}</span></span><span className="shrink-0 text-right"><span className="block text-[12px] font-semibold text-white/80">{money.format(entry.valor)}</span><span className="mt-1 block text-[9px] text-white/35">PDF ↗</span></span></Link>)}
          {cardEntries.length > 6 && <button type="button" onClick={() => setShowAllActivity((value) => !value)} className="min-h-10 w-full text-[11px] font-semibold text-[#bfb5ed] transition hover:text-white">{showAllActivity ? "Mostrar menos" : `Ver todas as ${cardEntries.length} movimentações`}</button>}
        </div>
      </motion.section>

      <Dialog open={mode !== null} onClose={closeMode} aria-labelledby="card-dialog-title" fullWidth maxWidth="xs" sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }} slotProps={{ paper: { sx: { borderRadius: { xs: "24px 24px 0 0", sm: "24px" }, background: "#1b1d20", color: "white", margin: { xs: 0, sm: "16px" }, width: { xs: "100%", sm: "calc(100% - 32px)" }, maxWidth: "450px" } }, backdrop: { sx: { background: "rgba(0,0,0,.73)", backdropFilter: "blur(6px)" } } }}>
        {mode && (
        <div className="p-5 pb-7 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b9aaf5]">CARTÃO DEMONSTRATIVO</p><h2 id="card-dialog-title" className="mt-1 text-[19px] font-semibold tracking-[-0.035em]">{mode === "edit" ? "Nome no cartão" : mode === "bill" ? "Pagar fatura" : "Pagar com cartão"}</h2></div><button type="button" onClick={closeMode} disabled={pending || step === "processing"} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.055] text-white/55 transition hover:bg-white/[0.1]"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button></div>
          <AnimatePresence mode="wait" initial={false}>
            {mode === "edit" ? <motion.form key="edit" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.24, ease }} onSubmit={saveHolder} className="mt-5"><label className="block text-[11px] font-medium text-white/55">Nome exibido<input autoFocus value={holderDraft} onChange={(event) => setHolderDraft(event.target.value)} maxLength={30} className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#111315] px-3.5 text-sm text-white outline-none focus:border-[#b9aaf5]/50" /></label><p className="mt-3 text-[10px] leading-4 text-white/40">Esta preferência fica apenas neste navegador. Não cadastre dados de um cartão real.</p>{error && <p role="alert" className="mt-3 text-xs text-[#ff8a99]">{error}</p>}<button type="submit" className="mt-5 h-12 w-full rounded-xl bg-[#c5b8fb] text-xs font-semibold text-[#211b30] transition hover:bg-[#dbd2ff]">Salvar nome</button></motion.form>
              : step === "compose" ? <motion.form key="compose" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.24, ease }} onSubmit={reviewPayment} className="mt-5 space-y-4">
                {mode === "purchase" && <><label className="block text-[11px] font-medium text-white/55">Estabelecimento<input autoFocus required value={merchant} onChange={(event) => setMerchant(event.target.value)} maxLength={70} placeholder="Onde foi a compra?" className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#111315] px-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b9aaf5]/50" /></label><label className="block text-[11px] font-medium text-white/55">Categoria<select value={category} onChange={(event) => setCategory(event.target.value as CardCategory)} className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#111315] px-3.5 text-sm text-white outline-none focus:border-[#b9aaf5]/50">{CARD_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></>}
                <label className="block text-[11px] font-medium text-white/55">Valor em reais<input required inputMode="decimal" value={rawAmount} onChange={(event) => setRawAmount(event.target.value)} placeholder="0,00" className="mt-2 h-12 w-full rounded-xl border border-white/[0.08] bg-[#111315] px-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b9aaf5]/50" /></label>
                <p className="text-[10px] text-white/40">{mode === "bill" ? "Fatura em aberto: " + amountInReais(statement.outstandingCents) : "Limite disponível: " + amountInReais(statement.availableCents)}</p>
                {error && <p role="alert" className="text-xs text-[#ff8a99]">{error}</p>}
                <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c5b8fb] text-xs font-semibold text-[#211b30] transition hover:bg-[#dbd2ff]">Revisar simulação <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} /></button>
              </motion.form>
              : step === "review" ? <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.24, ease }} className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">REVISÃO</p><p className="mt-2 text-[32px] font-semibold tracking-[-0.06em]">{money.format(paymentAmount)}</p><p className="mt-1 text-[12px] text-white/55">{mode === "purchase" ? merchant.trim() : "Pagamento da fatura"}</p>
                <div className="mt-5 space-y-3 rounded-[15px] border border-white/[0.06] bg-[#121416] p-4 text-[11px]"><div className="flex justify-between gap-3"><span className="text-white/40">Cartão</span><span>•••• {CARD_LAST_FOUR}</span></div><div className="flex justify-between gap-3"><span className="text-white/40">{mode === "purchase" ? "Limite após a compra" : "Fatura após o pagamento"}</span><span>{mode === "purchase" ? amountInReais(statement.availableCents - Math.round(paymentAmount * 100)) : amountInReais(statement.outstandingCents - Math.round(paymentAmount * 100))}</span></div>{mode === "bill" && <div className="flex justify-between gap-3"><span className="text-white/40">Saldo após pagar</span><span>{money.format(cashBalance - paymentAmount)}</span></div>}</div>
                <p className="mt-4 text-[10px] leading-5 text-white/40">Operação demonstrativa. Nenhum cartão é cobrado e nenhum valor real é transferido.</p>
                {error && <p role="alert" className="mt-3 text-xs text-[#ff8a99]">{error}</p>}
                <div className="mt-5 grid grid-cols-[1fr_1.5fr] gap-2"><button type="button" onClick={() => { setError(""); setStep("compose"); }} disabled={pending} className="h-12 rounded-xl border border-white/[0.08] text-xs font-semibold text-white/70 transition hover:bg-white/[0.05]">Voltar</button><button type="button" onClick={confirmPayment} disabled={pending} className="h-12 rounded-xl bg-[#c5b8fb] text-xs font-semibold text-[#211b30] transition hover:bg-[#dbd2ff] disabled:opacity-50">{pending ? "Registrando…" : "Confirmar simulação"}</button></div>
              </motion.div>
              : step === "processing" ? <motion.div key="processing" initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="pt-7 text-center">
                <div className="relative mx-auto grid h-20 w-20 place-items-center"><motion.span animate={{ rotate: 360 }} transition={{ duration: 1.7, ease: "linear", repeat: Infinity }} className="absolute inset-0 rounded-full border border-transparent border-t-[#c5b8fb] border-r-[#c5b8fb]/30" /><CreditCardRoundedIcon sx={{ fontSize: 29 }} className="text-[#c5b8fb]" /></div>
                <p className="mt-5 text-lg font-semibold tracking-[-0.035em]">{mode === "purchase" ? "Registrando compra" : "Atualizando fatura"}</p>
                <p className="mt-1 text-xs text-white/40">{money.format(paymentAmount)} · operação demonstrativa</p>
                <div className="mx-auto mt-6 max-w-[250px] space-y-3 text-left">{["Dados revisados", "Registro no histórico", "Comprovante em PDF"].map((label, index) => <div key={label} className="flex items-center gap-2.5"><motion.span animate={{ scale: cardProgress === index + 1 ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.7, repeat: cardProgress === index + 1 ? Infinity : 0 }} className={"h-2 w-2 shrink-0 rounded-full " + (cardProgress >= index + 1 ? "bg-[#c5b8fb]" : "bg-white/15")} /><span className={"text-[11px] " + (cardProgress >= index + 1 ? "text-white/78" : "text-white/28")}>{label}</span></div>)}</div>
              </motion.div>
              : <motion.div key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.43, ease }} className="pt-7 text-center"><motion.span initial={{ scale: 0.65 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 17 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#67d798]/[0.11] text-[#70e5a2]"><CheckCircleRoundedIcon sx={{ fontSize: 34 }} /></motion.span><p className="mt-5 text-lg font-semibold tracking-[-0.035em]">Simulação registrada</p><p className="mt-2 text-[12px] leading-5 text-white/45">{mode === "purchase" ? "A compra entrou na fatura e no histórico." : "A fatura foi atualizada e o saldo da carteira recalculado."}</p><Link href={"/dashboard/comprovante/" + resultId} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#c5b8fb] text-xs font-semibold text-[#211b30]"><ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />Ver comprovante e PDF</Link><button type="button" onClick={closeMode} className="mt-3 h-10 w-full text-xs font-medium text-white/50">Voltar ao cartão</button></motion.div>}
          </AnimatePresence>
        </div>
        )}
      </Dialog>
    </div>
  );
}
