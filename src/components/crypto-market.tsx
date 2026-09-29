"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import StarOutlineRoundedIcon from "@mui/icons-material/StarOutlineRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import Link from "next/link";
import { CoinIcon } from "@/components/coin-icon";
import { PriceChart } from "@/components/price-chart";
import { TradePanel, type TradeMode } from "@/components/trade-panel";
import { useMarket } from "@/components/use-market";
import { coins, formatPrice, ranges, type MarketRange } from "@/lib/market";

export function CryptoMarket({ embedded = false, initialCoin = "solana", initialMode = "buy" }: { embedded?: boolean; initialCoin?: string; initialMode?: TradeMode }) {
  const id = useId();
  const [selectedId, setSelectedId] = useState(initialCoin);
  const [range, setRange] = useState<MarketRange>("1d");
  const [tradeMode, setTradeMode] = useState<TradeMode>(initialMode);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeRevision, setTradeRevision] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const tradeRef = useRef<HTMLDivElement>(null);
  const { data, markets, updatedAt, refreshing, error, refresh } = useMarket(selectedId, range);
  const selectedCoin = markets.find((coin) => coin.id === selectedId);
  const selectedMeta = coins.find((coin) => coin.id === selectedId) ?? coins[0];
  const points = data?.chart ?? [];
  const first = points[0]?.price;
  const last = points.at(-1)?.price;
  const periodChange = first && last ? (last - first) / first * 100 : null;
  const positive = periodChange !== null && periodChange >= 0;
  const favorite = favorites.includes(selectedId);

  function openTrade(mode: TradeMode) {
    setTradeMode(mode);
    setTradeRevision((value) => value + 1);
    if (embedded) setTradeOpen(true);
    else {
      tradeRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      tradeRef.current?.focus({ preventScroll: true });
    }
  }

  const chart = (
    <section className={"min-w-0 overflow-hidden rounded-[24px] border border-white/[0.055] bg-[#191c1e] " + (embedded ? "p-4 sm:p-5" : "p-5 sm:p-6")} aria-label="Gráfico de mercado">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CoinIcon key={selectedId} id={selectedId} size={embedded ? 34 : 42} />
          <div><h2 className="text-sm font-semibold tracking-[-0.02em]">{selectedMeta.name}</h2><p className="mt-0.5 text-[10px] text-[#859095]">{selectedMeta.symbol} <span className="px-1 text-white/15">/</span> BRL</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" className={"flex items-center gap-1.5 text-[10px] " + (error ? "text-[#d9a97d]" : "text-[#8f9c98]")}>
            <span className={"h-1.5 w-1.5 rounded-full " + (error ? "bg-[#d9a97d]" : data ? "bg-[#87dcb0]" : "bg-[#77807e]")} />
            {error ? "Sem atualização" : data ? "A cada 30s" : "Conectando"}
          </span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setFavorites((items) => favorite ? items.filter((item) => item !== selectedId) : [...items, selectedId])} aria-label={favorite ? "Remover dos favoritos" : "Favoritar moeda"} aria-pressed={favorite} className={"grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/[0.05] " + (favorite ? "text-[#d9e6bd]" : "text-[#808d91]")}>
            {favorite ? <StarRoundedIcon sx={{ fontSize: 19 }} /> : <StarOutlineRoundedIcon sx={{ fontSize: 19 }} />}
          </motion.button>
        </div>
      </div>

      <div className="mt-6 flex min-h-[70px] flex-wrap items-end justify-between gap-3">
        <div>
          <p className={(embedded ? "text-[32px]" : "text-[38px] sm:text-[44px]") + " font-medium leading-none tracking-[-0.055em] text-[#f5f8f7] tabular-nums"}>{selectedCoin ? formatPrice(selectedCoin.current_price) : "—"}</p>
          <p className={"mt-2.5 flex items-center gap-1.5 text-[11px] font-medium tabular-nums " + (periodChange === null ? "text-[#7c898e]" : positive ? "text-[#88dcb0]" : "text-[#ed97a5]")}>
            {periodChange !== null ? (positive ? "+" : "") + periodChange.toFixed(2) + "%" : "Carregando histórico"}
            <span className="ml-1 font-normal text-[#738086]">{periodChange !== null ? "nos últimos " + (range === "1d" ? "24h" : range === "7d" ? "7 dias" : range === "30d" ? "30 dias" : "12 meses") : ""}</span>
          </p>
        </div>
        {!embedded && <div className="mb-1 hidden items-center gap-2 sm:flex">
          <button onClick={() => openTrade("buy")} className="flex h-9 items-center gap-1 rounded-xl bg-[#c5f5d9] px-3 text-[11px] font-semibold text-[#172c21] transition hover:bg-[#defbe9] active:scale-95"><AddRoundedIcon sx={{ fontSize: 17 }} />Comprar</button>
          <button onClick={() => openTrade("swap")} className="flex h-9 items-center gap-1 rounded-xl bg-white/[0.06] px-3 text-[11px] font-semibold text-[#c8d3d6] transition hover:bg-white/10 active:scale-95"><SwapHorizRoundedIcon sx={{ fontSize: 17 }} />Swap</button>
        </div>}
      </div>

      <div className="relative mt-3" aria-busy={refreshing}>
        <AnimatePresence mode="wait" initial={false}>
          {points.length > 1 ? <motion.div key={selectedId + range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <PriceChart points={points} range={range} compact={embedded} />
          </motion.div> : <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={"grid place-items-center rounded-xl " + (embedded ? "h-[195px] sm:h-[220px]" : "h-[260px] sm:h-[340px]")}>
            {error ? <div className="text-center"><p className="text-xs text-[#a3afb3]">O histórico está indisponível agora.</p><button onClick={refresh} disabled={refreshing} className="mt-3 rounded-lg bg-white/[0.06] px-3 py-2 text-[11px] text-white disabled:opacity-50">Tentar novamente</button></div> : <div className="market-skeleton h-24 w-full rounded-xl" />}
          </motion.div>}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-[#101416]/60 p-1" role="group" aria-label="Período do gráfico">
          {ranges.map((item) => <button type="button" key={item.id} aria-pressed={range === item.id} onClick={() => setRange(item.id)} className={"relative h-8 min-w-10 rounded-lg px-2.5 text-[10px] font-semibold " + (range === item.id ? "text-[#e5eee9]" : "text-[#7e8b90] hover:text-white")}>
            {range === item.id && <motion.span layoutId={id + "-range"} className="absolute inset-0 rounded-lg bg-[#303638]" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
            <span className="relative">{item.label}</span>
          </button>)}
        </div>
        <button onClick={refresh} disabled={refreshing} aria-label="Atualizar mercado" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#8b999e] transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"><RefreshRoundedIcon sx={{ fontSize: 18 }} className={refreshing ? "animate-spin" : ""} /></button>
      </div>

      {embedded ? <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.055] pt-4">
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => openTrade("buy")} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#c5f5d9] text-xs font-semibold text-[#172c21] transition hover:bg-[#defbe9]"><AddRoundedIcon sx={{ fontSize: 18 }} />Comprar {selectedMeta.symbol}</motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => openTrade("swap")} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] text-xs font-semibold text-[#d1dbdd] transition hover:bg-white/10"><SwapHorizRoundedIcon sx={{ fontSize: 19 }} />Trocar moedas</motion.button>
      </div> : <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.055] pt-5">
        {[{ label: "Máxima · 24h", value: selectedCoin ? formatPrice(selectedCoin.high_24h) : "—" }, { label: "Mínima · 24h", value: selectedCoin ? formatPrice(selectedCoin.low_24h) : "—" }, { label: "Volume · 24h", value: selectedCoin ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(selectedCoin.volume_24h) : "—" }].map((stat) => <div key={stat.label}><p className="text-[10px] text-[#7d8b91]">{stat.label}</p><p className="mt-1.5 text-[11px] font-medium text-[#d3dde0] sm:text-xs">{stat.value}</p></div>)}
      </div>}
    </section>
  );

  return (
    <div className={embedded ? "pt-5" : "mx-auto max-w-[1320px] px-4 py-6 sm:px-7 sm:py-8 lg:px-8"}>
      {embedded ? <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-[11px] font-semibold text-[#a1adb0]">De olho no mercado</h2><Link href={"/dashboard/crypto?coin=" + selectedId} className="flex items-center gap-1 text-[10px] text-[#92a199] transition hover:text-[#c6e7d4]">Explorar<ArrowOutwardRoundedIcon sx={{ fontSize: 13 }} /></Link></div> : <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-7 flex items-center justify-between">
        <div><Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-[11px] text-[#8d999e] transition hover:text-white"><ArrowBackRoundedIcon sx={{ fontSize: 14 }} />Sua carteira</Link><h1 className="text-[28px] font-semibold tracking-[-0.05em] text-[#eef3f1]">Mercado cripto<span className="text-[#71a788]">.</span></h1><p className="mt-1 text-xs text-[#7e8a90]">Acompanhe, explore, simule.</p></div>
        <div className="hidden text-right sm:block"><p className="text-[10px] text-[#77858a]">Cotações em reais</p><p className="mt-1.5 text-xs text-[#d0dbd6]">BRL <span className="text-[#64796d]">/</span> Binance</p></div>
      </motion.header>}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Selecionar ativo">
        {(embedded ? coins.slice(0, 4) : coins).map((coin) => <motion.button whileTap={{ scale: 0.97 }} type="button" key={coin.id} aria-label={"Ver " + coin.name} aria-pressed={selectedId === coin.id} onClick={() => setSelectedId(coin.id)} className={"flex min-h-11 shrink-0 items-center gap-2 rounded-[14px] border px-3 text-[11px] font-semibold transition-colors " + (selectedId === coin.id ? "border-[#98d4b1]/20 bg-[#293730]/50 text-[#d2eddd]" : "border-white/[0.04] bg-[#1b1f21] text-[#9aa7ac] hover:bg-[#272d2f]")}>
          <CoinIcon id={coin.id} size={23} />{coin.symbol}{favorites.includes(coin.id) && <StarRoundedIcon sx={{ fontSize: 11 }} className="text-[#d9e6bd]" />}
        </motion.button>)}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#ca976b]/15 bg-[#b98758]/[0.05] px-3 py-2.5 text-[11px] leading-5 text-[#d5b79e]">{error}{data ? " Exibindo a última leitura disponível." : ""}</p>}

      <div className={embedded ? "" : "grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]"}>
        {chart}
        {!embedded && <div ref={tradeRef} tabIndex={-1} className="min-w-0 scroll-mt-5 rounded-[24px] outline-none focus-visible:ring-1 focus-visible:ring-[#8ce8b7]/40"><TradePanel key={selectedId + tradeRevision} markets={markets} updatedAt={updatedAt} initialCoin={selectedId} initialMode={tradeMode} unavailable={!!error} /></div>}
      </div>

      {!embedded && <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.055] bg-[#191c1e] px-4 py-2 sm:px-6">
        <div className="flex items-center justify-between py-4"><h2 className="text-xs font-semibold text-[#c3d0d3]">Todos os ativos</h2><span className="text-[10px] text-[#79898f]">Variação em 24h</span></div>
        {coins.map((coin) => {
          const market = markets.find((item) => item.id === coin.id);
          return <button type="button" key={coin.id} aria-label={"Selecionar " + coin.name} onClick={() => setSelectedId(coin.id)} className="group flex w-full items-center gap-3 border-t border-white/[0.04] py-3 text-left transition hover:bg-white/[0.025]">
            <CoinIcon id={coin.id} size={32} /><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-[#dae3e5]">{coin.name}</span><span className="mt-0.5 block text-[10px] text-[#7d8d93]">{coin.symbol}</span></span>
            <span className="text-right text-xs font-medium tabular-nums text-[#d1dce0]">{market ? formatPrice(market.current_price) : "—"}</span>
            <span className={"w-20 text-right text-[11px] tabular-nums " + (market && market.price_change_percentage_24h < 0 ? "text-[#eb99a6]" : "text-[#87cdab]")}>{market ? (market.price_change_percentage_24h > 0 ? "+" : "") + market.price_change_percentage_24h.toFixed(2) + "%" : "—"}</span>
            <ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} className="hidden text-[#65787e] transition group-hover:text-white sm:block" />
          </button>;
        })}
      </div>}
      <p className={(embedded ? "mt-3" : "mt-5") + " px-1 text-[9px] leading-4 text-[#76848a]"}>{updatedAt ? "Última leitura às " + new Date(updatedAt).toLocaleTimeString("pt-BR") + ". " : ""}Dados Binance · histórico convertido pela cotação atual de USDT/BRL.</p>

      <Dialog open={tradeOpen} onClose={() => setTradeOpen(false)} aria-labelledby={id + "-dialog-title"} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "26px", background: "#1d2022", color: "white", margin: "16px", width: "calc(100% - 32px)" } }, backdrop: { sx: { background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" } } }}>
        <div className="flex items-center justify-between px-5 pt-4"><h2 id={id + "-dialog-title"} className="text-xs font-semibold text-[#97a8ae]">{tradeMode === "buy" ? "Comprar cripto" : "Trocar moedas"}</h2><button aria-label="Fechar negociação" onClick={() => setTradeOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#9ca8ad] transition hover:bg-white/5"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button></div>
        <TradePanel key={selectedId + tradeRevision} markets={markets} updatedAt={updatedAt} initialCoin={selectedId} initialMode={tradeMode} unavailable={!!error} />
      </Dialog>
    </div>
  );
}
