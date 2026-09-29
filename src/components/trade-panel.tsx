"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { CoinIcon } from "@/components/coin-icon";
import { coins, convertAmount, formatPrice, formatQuantity, isQuoteFresh, parseAmount, type MarketCoin } from "@/lib/market";

export type TradeMode = "buy" | "swap";
type Quote = { amount: number; received: number; from: string; to: string; toId: string; timestamp: number };

export function TradePanel({ markets, updatedAt, initialCoin = "solana", initialMode = "buy", unavailable = false }: {
  markets: MarketCoin[]; updatedAt?: string; initialCoin?: string; initialMode?: TradeMode; unavailable?: boolean;
}) {
  const id = useId();
  const [mode, setMode] = useState<TradeMode>(initialMode);
  const [fromId, setFromId] = useState(initialCoin === "usd-coin" ? "solana" : "usd-coin");
  const [toId, setToId] = useState(initialCoin);
  const [amount, setAmount] = useState(initialMode === "buy" ? "500" : "1");
  const [step, setStep] = useState<"edit" | "review" | "done">("edit");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const from = markets.find((coin) => coin.id === fromId);
  const to = markets.find((coin) => coin.id === toId);
  const fromPrice = mode === "buy" ? 1 : from?.current_price ?? 0;
  const numericAmount = parseAmount(amount);
  const received = convertAmount(numericAmount, fromPrice, to?.current_price ?? 0);
  const valid = received > 0 && (mode === "buy" || fromId !== toId) && !unavailable;
  const quoteTimestamp = updatedAt ? Date.parse(updatedAt) : 0;
  const fromSymbol = mode === "buy" ? "BRL" : from?.symbol.toUpperCase() ?? "—";
  const toSymbol = to?.symbol.toUpperCase() ?? coins.find((coin) => coin.id === toId)?.symbol ?? "—";

  function review() {
    if (!valid) return;
    if (!isQuoteFresh(quoteTimestamp)) {
      setError("A cotação expirou. Atualize o mercado antes de continuar.");
      return;
    }
    setQuote({ amount: numericAmount, received, from: fromSymbol, to: toSymbol, toId, timestamp: quoteTimestamp });
    setError("");
    setStep("review");
  }

  function confirm() {
    if (!quote || !isQuoteFresh(quote.timestamp) || unavailable) {
      setError("Atualize a cotação e revise os valores novamente.");
      setStep("edit");
      return;
    }
    setStep("done");
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-white/[0.065] bg-[#1d2022] p-5 sm:p-6" aria-label="Compra e troca de moedas">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-[-0.02em]">{step === "review" ? "Revise a simulação" : step === "done" ? "Tudo pronto" : "Movimente sua carteira"}</h2>
        <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[9px] font-medium text-[#9da3a6]">Simulação</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {step === "edit" ? (
          <motion.div key="edit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <form onSubmit={(event) => { event.preventDefault(); review(); }}>
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#131617] p-1" role="group" aria-label="Tipo de operação">
              {(["buy", "swap"] as const).map((item) => (
                <button type="button" key={item} aria-pressed={mode === item} onClick={() => { setMode(item); setAmount(item === "buy" ? "500" : "1"); setError(""); }} className={`relative h-10 rounded-lg text-xs font-semibold ${mode === item ? "text-white" : "text-[#8b9295] hover:text-white"}`}>
                  {mode === item && <motion.span layoutId={`${id}-trade-mode`} className="absolute inset-0 rounded-lg bg-[#303537]" transition={{ type: "spring", stiffness: 440, damping: 36 }} />}
                  <span className="relative">{item === "buy" ? "Comprar" : "Swap"}</span>
                </button>
              ))}
            </div>
            <div className="rounded-[18px] border border-white/[0.035] bg-[#141718] p-4 transition-colors focus-within:border-[#78e5ad]/40">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`${id}-amount`} className="text-[11px] text-[#8b9497]">{mode === "buy" ? "Você paga" : "Você troca"}</label>
                {mode === "buy" ? <span className="text-[11px] font-semibold text-[#b6bec1]">BRL</span> : (
                  <div className="flex items-center gap-1.5"><CoinIcon key={fromId} id={fromId} size={20} /><select aria-label="Moeda de origem" value={fromId} onChange={(event) => { const next = event.target.value; setFromId(next); if (next === toId) setToId(fromId); }} className="max-w-24 bg-transparent text-xs font-semibold">{coins.map((coin) => <option className="bg-[#202426]" key={coin.id} value={coin.id}>{coin.symbol}</option>)}</select></div>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {mode === "buy" && <span className="text-lg text-[#667174]">R$</span>}
                <input id={`${id}-amount`} value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} inputMode="decimal" autoComplete="off" maxLength={18} placeholder="0,00" className="w-full min-w-0 bg-transparent text-[32px] font-medium tracking-[-0.045em] text-white outline-none" />
              </div>
              {mode === "buy" && <div className="mt-3 flex gap-1.5">{[100, 250, 500, 1000].map((value) => <button key={value} type="button" aria-label={`Usar R$ ${value}`} onClick={() => setAmount(String(value))} className={`flex-1 rounded-lg py-1.5 text-[10px] transition ${numericAmount === value ? "bg-[#78e5ad]/10 text-[#8ee6b6]" : "bg-white/[0.04] text-[#979fa2] hover:bg-white/[0.08]"}`}>{value.toLocaleString("pt-BR")}</button>)}</div>}
            </div>
            <div className="relative z-10 -my-3 flex justify-center">
              <motion.button type="button" aria-label={mode === "swap" ? "Inverter moedas" : "Trocar usando cripto"} whileTap={{ rotate: 180, scale: 0.9 }} onClick={() => { if (mode === "swap") { setFromId(toId); setToId(fromId); setAmount(received > 0 ? received.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : "1"); } else { setMode("swap"); setAmount("1"); } }} className="grid h-10 w-10 place-items-center rounded-xl border-[4px] border-[#1d2022] bg-[#343b3e] text-[#c9d2d5] transition hover:bg-[#444e51]">
                {mode === "swap" ? <SwapVertRoundedIcon sx={{ fontSize: 18 }} /> : <ArrowDownwardRoundedIcon sx={{ fontSize: 17 }} />}
              </motion.button>
            </div>
            <div className="rounded-[18px] border border-white/[0.035] bg-[#141718] p-4 pt-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[#8b9497]">Você recebe</p>
                <div className="flex items-center gap-1.5"><CoinIcon key={toId} id={toId} size={22} /><select aria-label="Moeda de destino" value={toId} onChange={(event) => { const next = event.target.value; setToId(next); if (next === fromId) setFromId(toId); }} className="max-w-24 bg-transparent text-xs font-semibold">{coins.map((coin) => <option className="bg-[#202426]" key={coin.id} value={coin.id}>{coin.symbol}</option>)}</select></div>
              </div>
              <p className="mt-3 truncate text-[28px] font-medium tracking-[-0.045em] text-[#dce5e1]" aria-live="polite">{valid ? "≈ " + formatQuantity(received) : "—"}</p>
              <p className="mt-1 text-[10px] text-[#747f83]">{to && to.current_price > 0 ? `1 ${toSymbol} = ${formatPrice(to.current_price)}` : "Aguardando cotação"}</p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-[#858f93]"><span>Cotação de referência</span><span>Taxas não incluídas</span></div>
            {error && <p role="alert" className="mt-3 text-xs text-[#f0a0ad]">{error}</p>}
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={!valid} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#c5f5d9] text-xs font-bold text-[#15271d] transition-colors hover:bg-[#defbe9] disabled:cursor-not-allowed disabled:opacity-35">
              {unavailable ? "Cotação indisponível" : "Revisar simulação"}<ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
            </motion.button>
            <p className="mt-3 text-center text-[10px] leading-4 text-[#788387]">Explore a conversão. Nenhum dinheiro será movimentado.</p>
          </form>
          </motion.div>
        ) : quote ? (
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <div className="py-6 text-center">
              {step === "done" ? <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 16 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#78e5ad]/10 text-[#8ce8b7]"><CheckRoundedIcon sx={{ fontSize: 30 }} /></motion.span> : <CoinIcon id={quote.toId} size={52} />}
              <p className="mt-5 text-[28px] font-semibold tracking-[-0.05em]">{formatQuantity(quote.received)} <span className="text-base text-[#97a3a7]">{quote.to}</span></p>
              <p className="mt-2 text-xs text-[#97a3a7]">{step === "done" ? "Simulação concluída" : "Quantidade estimada"}</p>
            </div>
            <dl className="space-y-3 rounded-2xl bg-[#141718] p-4 text-xs"><div className="flex justify-between gap-4"><dt className="text-[#879296]">De</dt><dd>{quote.from === "BRL" ? formatPrice(quote.amount) : `${formatQuantity(quote.amount)} ${quote.from}`}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#879296]">Para</dt><dd>{quote.to}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#879296]">Operação</dt><dd>Demonstração</dd></div></dl>
            <p className="my-5 text-center text-[11px] leading-5 text-[#8a9599]">{step === "done" ? "Seu saldo permanece igual. Esta simulação não gerou uma ordem de compra ou transação na blockchain." : "Valores de referência, sem taxas ou execução de ordem. Revise antes de simular."}</p>
            <motion.button whileTap={{ scale: 0.98 }} type="button" onClick={step === "done" ? () => { setStep("edit"); setQuote(null); } : confirm} className="h-12 w-full rounded-[14px] bg-[#c5f5d9] text-xs font-bold text-[#15271d] transition hover:bg-[#defbe9]">{step === "done" ? "Nova simulação" : "Confirmar simulação"}</motion.button>
            {step === "review" && <button type="button" onClick={() => setStep("edit")} className="mt-3 h-10 w-full text-xs text-[#a1abae] transition hover:text-white">Editar valores</button>}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
