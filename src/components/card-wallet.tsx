"use client";

import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContactlessRoundedIcon from "@mui/icons-material/ContactlessRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
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
type CardStep = "compose" | "review" | "success";

function amountInReais(cents: number) {
  return money.format(cents / 100);
}

function nextDueDate() {
  const [year, month] = brazilMonthKey(new Date()).split("-").map(Number);
  return shortDate.format(new Date(Date.UTC(year, month, 10, 15)));
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
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [pending, startTransition] = useTransition();
  const statement = cardStatement(transactions);
  const paymentAmount = parseBRL(rawAmount);
  const cardEntries = transactions.filter((item) =>
    item.metodo === CARD_PURCHASE_METHOD || item.metodo === CARD_BILL_METHOD,
  );
  const thisMonth = brazilMonthKey(new Date());
  const monthPurchases = statement.purchases.filter((item) =>
    brazilMonthKey(new Date(item.criado_em)) === thisMonth,
  );
  const categoryTotals = CARD_CATEGORIES.map((item) => ({
    name: item,
    cents: monthPurchases
      .filter((purchase) => purchase.categoria === item)
      .reduce((sum, purchase) => sum + Math.round(purchase.valor * 100), 0),
  })).filter((item) => item.cents > 0).sort((a, b) => b.cents - a.cents);

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
    setRequestId(crypto.randomUUID());
    setMerchant("");
    setCategory("Compras");
    setRawAmount(nextMode === "bill"
      ? (statement.outstandingCents / 100).toFixed(2).replace(".", ",")
      : "");
    setHolderDraft(holder);
  }

  function closeMode() {
    if (pending) return;
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
    if (pending || !mode || mode === "edit") return;
    setError("");
    startTransition(async () => {
      try {
        const result = mode === "purchase"
          ? await simulateCardPurchase({ requestId, merchant: merchant.trim(), amount: paymentAmount, category })
          : await simulateBillPayment(requestId, paymentAmount);
        if (!result.ok) { setError(result.error); return; }
        setResultId(result.transactionId);
        setStep("success");
        router.refresh();
      } catch {
        setError("A conexão foi interrompida. Tente confirmar novamente.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-28 pt-5 text-white sm:px-7 sm:pt-8 lg:px-10 lg:pb-16">
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" aria-label="Voltar ao início" className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.045] text-white/65 transition hover:bg-white/[0.09] hover:text-white"><ArrowBackRoundedIcon sx={{ fontSize: 21 }} /></Link>
          <div><p className="text-[10px] font-medium text-white/35">SALDO / CARTÃO</p><h1 className="text-[21px] font-semibold tracking-[-0.04em] sm:text-[25px]">Seu cartão</h1></div>
        </div>
        <span className="rounded-full border border-white/[0.07] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45">DEMO</span>
      </motion.header>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:gap-9">
        <div>
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.07, duration: 0.65, ease }} className="mx-auto w-full max-w-[490px] [perspective:1200px]">
            <motion.button type="button" onClick={() => setFlipped((value) => !value)} aria-label={flipped ? "Ver frente do cartão" : "Ver verso do cartão"} animate={{ rotateY: flipped ? 180 : 0 }} whileTap={{ scale: 0.985 }} transition={{ type: "spring", stiffness: 180, damping: 25 }} style={{ transformStyle: "preserve-3d" }} className="relative block aspect-[1.58] w-full rounded-[24px] text-left shadow-[0_26px_65px_rgba(0,0,0,.42)]">
              <span style={{ backfaceVisibility: "hidden" }} className="absolute inset-0 flex flex-col overflow-hidden rounded-[24px] border border-white/[0.14] bg-[linear-gradient(130deg,#44404b_0%,#2a2a32_47%,#181a1e_100%)] p-6 sm:p-7">
                <span className="pointer-events-none absolute -right-20 -top-40 h-[380px] w-[380px] rounded-full border border-white/[0.09]" />
                <span className="pointer-events-none absolute -right-10 -top-32 h-[330px] w-[330px] rounded-full border border-white/[0.07]" />
                <span className="pointer-events-none absolute -right-32 -bottom-44 h-[380px] w-[380px] rounded-full bg-[#a395db]/[0.11] blur-[55px]" />
                <span className="relative flex items-start justify-between"><span className="text-[15px] font-bold tracking-[-0.045em] text-white">saldo<span className="text-[#c4b6ff]">.</span></span><span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/55">CRÉDITO · VIRTUAL</span></span>
                <span className="relative mt-auto"><ContactlessRoundedIcon sx={{ fontSize: 30 }} className="mb-4 rotate-90 text-white/65" /><span className="block text-[22px] font-medium tracking-[0.16em] text-white sm:text-[27px]">•••• {CARD_LAST_FOUR}</span></span>
                <span className="relative mt-5 flex items-end justify-between gap-3"><span className="min-w-0"><span className="block text-[8px] font-semibold uppercase tracking-[0.15em] text-white/45">TITULAR</span><span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-white/90 sm:text-[13px]">{holder}</span></span><span className="text-[9px] font-bold uppercase tracking-[0.13em] text-white/65">DEMO</span></span>
              </span>
              <span style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0 flex flex-col overflow-hidden rounded-[24px] border border-white/[0.14] bg-[linear-gradient(145deg,#26262f_0%,#17191d_100%)] py-6 text-left">
                <span className="mt-4 h-12 w-full bg-black/55" />
                <span className="mt-auto px-6"><span className="block text-[11px] font-semibold text-white/85">Cartão demonstrativo</span><span className="mt-2 block max-w-[260px] text-[10px] leading-5 text-white/45">Sem número completo, validade ou código de segurança. Toque para voltar.</span></span>
              </span>
            </motion.button>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }} className="mt-3 text-center text-[10px] text-white/35">Toque para virar · Nenhum dado real de cartão é armazenado</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.48, ease }} className="mt-6 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => openMode("purchase")} disabled={frozen || statement.availableCents === 0} className="flex h-12 items-center justify-center gap-2 rounded-[15px] bg-[#c5b8fb] px-2 text-[12px] font-semibold text-[#211b30] transition hover:bg-[#d8cfff] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBagOutlinedIcon sx={{ fontSize: 19 }} />Pagar com cartão</button>
            <button type="button" onClick={() => openMode("bill")} disabled={statement.outstandingCents === 0} className="flex h-12 items-center justify-center gap-2 rounded-[15px] border border-white/[0.07] bg-[#25272b] px-2 text-[12px] font-semibold text-white/80 transition hover:bg-[#303238] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"><ReceiptLongRoundedIcon sx={{ fontSize: 19 }} />Pagar fatura</button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.5, ease }} className="mt-4 flex items-center gap-2">
            <button type="button" onClick={toggleFrozen} aria-pressed={frozen} className="flex min-h-12 flex-1 items-center gap-2.5 rounded-[15px] border border-white/[0.06] bg-[#1b1d20] px-3.5 text-left transition hover:bg-[#25272b]">{frozen ? <LockOutlinedIcon sx={{ fontSize: 19 }} className="text-[#ff9aa8]" /> : <LockOpenRoundedIcon sx={{ fontSize: 19 }} className="text-[#b9aaf5]" />}<span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/75">{frozen ? "Cartão pausado" : "Cartão ativo"}</span><span className={"relative h-5 w-9 shrink-0 rounded-full transition " + (frozen ? "bg-white/15" : "bg-[#a594e9]")}><span className={"absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform " + (frozen ? "translate-x-0.5" : "translate-x-[18px]")} /></span></button>
            <button type="button" onClick={() => openMode("edit")} aria-label="Editar nome do cartão" className="grid h-12 w-12 place-items-center rounded-[15px] border border-white/[0.06] bg-[#1b1d20] text-white/65 transition hover:bg-[#25272b] hover:text-white"><EditRoundedIcon sx={{ fontSize: 18 }} /></button>
          </motion.div>
          <p className="mt-2 px-1 text-[9px] leading-4 text-white/35">O bloqueio e o nome são preferências locais desta demonstração.</p>
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17, duration: 0.58, ease }} className="rounded-[24px] border border-white/[0.055] bg-[#25272b] p-5 sm:p-6" aria-label="Resumo da fatura">
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Fatura em aberto</span><span className="text-[10px] text-white/40">vence {nextDueDate()}</span></div>
          <motion.p key={statement.outstandingCents} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease }} className="mt-3 text-[clamp(2.1rem,7vw,3.1rem)] font-semibold leading-none tracking-[-0.065em] text-[#f4f4f5]">{amountInReais(statement.outstandingCents)}</motion.p>
          <p className="mt-3 text-[11px] text-white/45">Limite demonstrativo de {amountInReais(CARD_LIMIT_CENTS)}</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.09]"><motion.div initial={{ width: 0 }} animate={{ width: statement.usedPercent + "%" }} transition={{ delay: 0.38, duration: 0.8, ease }} className="h-full rounded-full bg-[#bbaaf8]" /></div>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.07] pt-5"><div><p className="text-[10px] text-white/40">Disponível</p><p className="mt-1 text-[16px] font-semibold tracking-[-0.035em] text-white">{amountInReais(statement.availableCents)}</p></div><div><p className="text-[10px] text-white/40">Compras no mês</p><p className="mt-1 text-[16px] font-semibold tracking-[-0.035em] text-white">{amountInReais(statement.monthPurchasesCents)}</p></div></div>
          <p className="mt-5 border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-white/38">Compras entram na fatura. O saldo da carteira só diminui quando a fatura é paga.</p>
        </motion.section>
      </div>

      <div className="mt-9 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:gap-9">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27, duration: 0.55, ease }} aria-label="Movimentações do cartão">
          <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/42">ATIVIDADE</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">Cartão e fatura</h2></div><span className="text-[10px] text-white/35">{cardEntries.length} registros</span></div>
          <div className="overflow-hidden rounded-[20px] border border-white/[0.055] bg-[#25272b]">
            {cardEntries.length === 0 ? <div className="px-5 py-9 text-center"><CreditCardRoundedIcon sx={{ fontSize: 27 }} className="text-[#b9aaf5]" /><p className="mt-3 text-[12px] font-semibold text-white/75">Pronto para experimentar</p><p className="mt-1 text-[11px] leading-5 text-white/40">Sua primeira compra demonstrativa aparecerá aqui com comprovante em PDF.</p></div> : cardEntries.slice(0, showAllActivity ? undefined : 6).map((entry) => <Link key={entry.id} href={"/dashboard/comprovante/" + entry.id} className="flex min-h-[70px] items-center gap-3 border-b border-white/[0.06] px-4 py-3 transition hover:bg-white/[0.035] last:border-b-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.065] text-[#bfb5ed]">{entry.metodo === CARD_BILL_METHOD ? <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /> : <ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-white/85">{entry.destinatario || entry.descricao}</span><span className="mt-1 block text-[10px] text-white/37">{entry.metodo === CARD_BILL_METHOD ? "Pagamento da fatura" : entry.categoria || "Compra"} · {shortDate.format(new Date(entry.criado_em))}</span></span><span className="shrink-0 text-right"><span className="block text-[12px] font-semibold text-white/80">{money.format(entry.valor)}</span><span className="mt-1 block text-[9px] text-white/35">Comprovante ↗</span></span></Link>)}
            {cardEntries.length > 6 && <button type="button" onClick={() => setShowAllActivity((value) => !value)} className="w-full border-t border-white/[0.06] py-3 text-[11px] font-semibold text-[#bfb5ed] transition hover:bg-white/[0.035]">{showAllActivity ? "Mostrar menos" : `Ver todos os ${cardEntries.length} registros`}</button>}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.55, ease }} aria-label="Análise de gastos">
          <div className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/42">CONTROLE</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">Onde você gastou</h2></div>
          <div className="rounded-[20px] border border-white/[0.055] bg-[#1b1d20] p-5">
            {categoryTotals.length === 0 ? <p className="text-[11px] leading-5 text-white/42">As categorias aparecem conforme você registra compras. Nenhum gasto fictício foi adicionado ao seu histórico.</p> : categoryTotals.map((item, index) => <div key={item.name} className={index ? "mt-4" : ""}><div className="flex items-center justify-between text-[11px]"><span className="text-white/65">{item.name}</span><span className="font-semibold text-white/85">{amountInReais(item.cents)}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.075]"><motion.div initial={{ width: 0 }} animate={{ width: Math.max(4, item.cents / Math.max(statement.monthPurchasesCents, 1) * 100) + "%" }} transition={{ delay: 0.45 + index * 0.07, duration: 0.65, ease }} className="h-full rounded-full bg-[#a899e5]" /></div></div>)}
          </div>
        </motion.section>
      </div>

      <Dialog open={mode !== null} onClose={closeMode} aria-labelledby="card-dialog-title" fullWidth maxWidth="xs" sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }} slotProps={{ paper: { sx: { borderRadius: { xs: "24px 24px 0 0", sm: "24px" }, background: "#1b1d20", color: "white", margin: { xs: 0, sm: "16px" }, width: { xs: "100%", sm: "calc(100% - 32px)" }, maxWidth: "450px" } }, backdrop: { sx: { background: "rgba(0,0,0,.73)", backdropFilter: "blur(6px)" } } }}>
        {mode && (
        <div className="p-5 pb-7 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b9aaf5]">CARTÃO DEMONSTRATIVO</p><h2 id="card-dialog-title" className="mt-1 text-[19px] font-semibold tracking-[-0.035em]">{mode === "edit" ? "Nome no cartão" : mode === "bill" ? "Pagar fatura" : "Pagar com cartão"}</h2></div><button type="button" onClick={closeMode} disabled={pending} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.055] text-white/55 transition hover:bg-white/[0.1]"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button></div>
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
              : <motion.div key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.43, ease }} className="pt-7 text-center"><motion.span initial={{ scale: 0.65 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 17 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#67d798]/[0.11] text-[#70e5a2]"><CheckCircleRoundedIcon sx={{ fontSize: 34 }} /></motion.span><p className="mt-5 text-lg font-semibold tracking-[-0.035em]">Simulação registrada</p><p className="mt-2 text-[12px] leading-5 text-white/45">{mode === "purchase" ? "A compra entrou na fatura e no histórico." : "A fatura foi atualizada e o saldo da carteira recalculado."}</p><Link href={"/dashboard/comprovante/" + resultId} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#c5b8fb] text-xs font-semibold text-[#211b30]"><ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />Ver comprovante e PDF</Link><button type="button" onClick={closeMode} className="mt-3 h-10 w-full text-xs font-medium text-white/50">Voltar ao cartão</button></motion.div>}
          </AnimatePresence>
        </div>
        )}
      </Dialog>
    </div>
  );
}
