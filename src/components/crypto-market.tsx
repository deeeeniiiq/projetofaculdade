"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
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
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<"all" | "favorites" | "gainers" | "losers">("all");
  const tradeRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { data, markets, updatedAt, refreshing, error, refresh } = useMarket(selectedId, range);
  const selectedCoin = markets.find((coin) => coin.id === selectedId);
  const selectedMeta = coins.find((coin) => coin.id === selectedId) ?? coins[0];
  const points = data?.chart ?? [];
  const first = points[0]?.price;
  const last = points.at(-1)?.price;
  const periodChange = first && last ? (last - first) / first * 100 : null;
  const positive = periodChange !== null && periodChange >= 0;
  const favorite = favorites.includes(selectedId);
  const movers = useMemo(() => [...markets].filter((coin) => Number.isFinite(coin.price_change_percentage_24h)).sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h), [markets]);
  const listedCoins = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    const result = coins.filter((coin) => {
      if (term && !(`${coin.name} ${coin.symbol}`).toLocaleLowerCase("pt-BR").includes(term)) return false;
      if (marketFilter === "favorites") return favorites.includes(coin.id);
      const change = markets.find((market) => market.id === coin.id)?.price_change_percentage_24h;
      if (marketFilter === "gainers") return change !== undefined && change > 0;
      if (marketFilter === "losers") return change !== undefined && change < 0;
      return true;
    });
    if (marketFilter === "gainers" || marketFilter === "losers") result.sort((a, b) => {
      const left = markets.find((market) => market.id === a.id)?.price_change_percentage_24h ?? 0;
      const right = markets.find((market) => market.id === b.id)?.price_change_percentage_24h ?? 0;
      return marketFilter === "gainers" ? right - left : left - right;
    });
    return result;
  }, [query, marketFilter, favorites, markets]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("saldo-market-watchlist") || "[]") as unknown;
        if (Array.isArray(stored)) setFavorites(stored.filter((value): value is string => typeof value === "string" && coins.some((coin) => coin.id === value)));
      } catch { /* Browsing remains available without local storage. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleFavorite(coinId: string) {
    const next = favorites.includes(coinId) ? favorites.filter((item) => item !== coinId) : [...favorites, coinId];
    setFavorites(next);
    try { localStorage.setItem("saldo-market-watchlist", JSON.stringify(next)); } catch { /* Session-only watchlist. */ }
  }

  function selectCoin(coinId: string) {
    setSelectedId(coinId);
    if (!embedded) chartRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

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
            {error ? "Sem atualização" : data ? "Atualização automática" : "Conectando"}
          </span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleFavorite(selectedId)} aria-label={favorite ? "Remover dos favoritos" : "Favoritar moeda"} aria-pressed={favorite} className={"grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/[0.05] " + (favorite ? "text-[#d9e6bd]" : "text-[#808d91]")}>
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
        <div><Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-[11px] text-[#8d999e] transition hover:text-white"><ArrowBackRoundedIcon sx={{ fontSize: 14 }} />Sua carteira</Link><h1 className="text-[28px] font-semibold tracking-[-0.05em] text-[#eef3f1]">Mercado cripto<span className="text-[#71a788]">.</span></h1><p className="mt-1 text-xs text-[#7e8a90]">Cotações, gráficos e trocas simuladas.</p></div>
        <div className="hidden text-right sm:block"><p className="text-[10px] text-[#77858a]">Cotações em reais</p><p className="mt-1.5 text-xs text-[#d0dbd6]">BRL <span className="text-[#64796d]">/</span> {data?.source ?? "mercado"}</p></div>
      </motion.header>}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Selecionar ativo">
        {(embedded ? coins.slice(0, 4) : coins).map((coin) => <motion.button whileTap={{ scale: 0.97 }} type="button" key={coin.id} aria-label={"Ver " + coin.name} aria-pressed={selectedId === coin.id} onClick={() => selectCoin(coin.id)} className={"flex min-h-11 shrink-0 items-center gap-2 rounded-[14px] border px-3 text-[11px] font-semibold transition-colors " + (selectedId === coin.id ? "border-[#98d4b1]/20 bg-[#293730]/50 text-[#d2eddd]" : "border-white/[0.04] bg-[#1b1f21] text-[#9aa7ac] hover:bg-[#272d2f]")}>
          <CoinIcon id={coin.id} size={23} />{coin.symbol}{favorites.includes(coin.id) && <StarRoundedIcon sx={{ fontSize: 11 }} className="text-[#d9e6bd]" />}
        </motion.button>)}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-[#ca976b]/15 bg-[#b98758]/[0.05] px-3 py-2.5 text-[11px] leading-5 text-[#d5b79e]">{error}{data ? " Exibindo a última leitura disponível." : ""}</p>}

      <div ref={chartRef} className={(embedded ? "" : "grid scroll-mt-5 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]")}>
        {chart}
        {!embedded && <div ref={tradeRef} tabIndex={-1} className="min-w-0 scroll-mt-5 rounded-[24px] outline-none focus-visible:ring-1 focus-visible:ring-[#8ce8b7]/40"><TradePanel key={selectedId + tradeRevision} markets={markets} updatedAt={updatedAt} initialCoin={selectedId} initialMode={tradeMode} unavailable={!!error} /></div>}
      </div>

      {!embedded && <section className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.055] bg-[#17191b] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold text-[#eeeef0]">Pulso do mercado</p><p className="mt-1 text-[11px] text-[#858a8e]">Movimentos das últimas 24 horas</p></div><TrendingUpRoundedIcon sx={{ fontSize: 21 }} className="text-[#78dfaa]" /></div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[...movers.slice(0, 2), movers.at(-1)].filter((coin): coin is NonNullable<typeof coin> => Boolean(coin)).map((coin, index) => <motion.button key={coin.id} type="button" whileTap={{ scale: 0.98 }} onClick={() => selectCoin(coin.id)} className="flex min-w-0 items-center gap-2.5 rounded-[16px] border border-white/[0.045] bg-[#212427] px-3 py-3 text-left transition hover:bg-[#2b2e30]">
            <CoinIcon id={coin.id} size={34} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#f0f1f1]">{coin.name}</span><span className="mt-0.5 block text-[10px] text-[#858d90]">{index === 2 ? "Em queda" : "Em alta"}</span></span><span className={"text-xs font-semibold tabular-nums " + (coin.price_change_percentage_24h >= 0 ? "text-[#86dba9]" : "text-[#eb9ba6]")}>{coin.price_change_percentage_24h > 0 ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%</span>
          </motion.button>)}
        </div>
      </section>}

      {!embedded && <section className="mt-4 overflow-hidden rounded-[24px] border border-white/[0.055] bg-[#17191b] px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#ecedee]">Explorar ativos</h2><p className="mt-1 text-[11px] text-[#7e898d]">{markets.length || coins.length} moedas · cotações em reais</p></div><span className="text-[11px] text-[#79898f]">24h</span></div>
        <label className="mt-4 flex h-11 items-center gap-2.5 rounded-xl border border-white/[0.07] bg-[#0f1113] px-3 text-[#848d91] focus-within:border-[#8ce8b7]/40"><SearchRoundedIcon sx={{ fontSize: 19 }} /><span className="sr-only">Buscar criptomoeda</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar moeda ou símbolo" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#777f83]" /></label>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filtrar mercado">
          {([{ id: "all", label: "Todas" }, { id: "favorites", label: "Favoritas" }, { id: "gainers", label: "Em alta" }, { id: "losers", label: "Em queda" }] as const).map((filter) => <button key={filter.id} type="button" aria-pressed={marketFilter === filter.id} onClick={() => setMarketFilter(filter.id)} className={"min-h-9 shrink-0 rounded-full px-3 text-xs font-medium transition " + (marketFilter === filter.id ? "bg-[#d2f7e0] text-[#152a1e]" : "bg-white/[0.05] text-[#9da8a5] hover:bg-white/[0.09]")}>{filter.label}</button>)}
        </div>
        <div className="mt-3" aria-live="polite">
        {listedCoins.map((coin) => {
          const market = markets.find((item) => item.id === coin.id);
          return <div key={coin.id} className="flex min-w-0 items-center gap-2 border-t border-white/[0.045] py-1.5">
            <button type="button" aria-label={"Ver gráfico de " + coin.name} onClick={() => selectCoin(coin.id)} className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left transition hover:bg-white/[0.04]">
              <CoinIcon id={coin.id} size={36} /><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#e5e8e7]">{coin.name}</span><span className="mt-0.5 block text-[11px] text-[#859195]">{coin.symbol}</span></span>
              <span className="min-w-0 shrink-0 text-right"><span className="block text-xs font-semibold tabular-nums text-[#edf0ee] sm:text-sm">{market ? formatPrice(market.current_price) : "—"}</span><span className={"mt-0.5 block text-[11px] tabular-nums " + (market && market.price_change_percentage_24h < 0 ? "text-[#eb99a6]" : "text-[#87cdab]")}>{market ? (market.price_change_percentage_24h > 0 ? "+" : "") + market.price_change_percentage_24h.toFixed(2) + "%" : "—"}</span></span>
              <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} className="hidden shrink-0 text-[#697b7e] transition group-hover:text-white sm:block" />
            </button>
            <button type="button" onClick={() => toggleFavorite(coin.id)} aria-label={(favorites.includes(coin.id) ? "Remover " : "Adicionar ") + coin.name + (favorites.includes(coin.id) ? " dos favoritos" : " aos favoritos")} aria-pressed={favorites.includes(coin.id)} className={"grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-white/[0.06] " + (favorites.includes(coin.id) ? "text-[#d7e5ba]" : "text-[#737e80]")}>{favorites.includes(coin.id) ? <StarRoundedIcon sx={{ fontSize: 18 }} /> : <StarOutlineRoundedIcon sx={{ fontSize: 18 }} />}</button>
          </div>;
        })}
        {listedCoins.length === 0 && <p className="py-9 text-center text-sm text-[#909a9d]">{marketFilter === "favorites" ? "Nenhuma favorita ainda. Toque na estrela de uma moeda." : "Nenhuma moeda encontrada."}</p>}
        </div>
      </section>}
      <p className={(embedded ? "mt-3" : "mt-5") + " px-1 text-[11px] leading-4 text-[#76848a]"}>{updatedAt ? "Última leitura às " + new Date(updatedAt).toLocaleTimeString("pt-BR") + ". " : ""}{data?.source === "CoinGecko" ? "Dados CoinGecko em BRL." : "Dados Binance · histórico convertido pela cotação atual de USDT/BRL."}</p>

      <Dialog open={tradeOpen} onClose={() => setTradeOpen(false)} aria-labelledby={id + "-dialog-title"} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "26px", background: "#1d2022", color: "white", margin: "16px", width: "calc(100% - 32px)" } }, backdrop: { sx: { background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" } } }}>
        <div className="flex items-center justify-between px-5 pt-4"><h2 id={id + "-dialog-title"} className="text-xs font-semibold text-[#97a8ae]">{tradeMode === "buy" ? "Comprar cripto" : "Trocar moedas"}</h2><button aria-label="Fechar negociação" onClick={() => setTradeOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#9ca8ad] transition hover:bg-white/5"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button></div>
        <TradePanel key={selectedId + tradeRevision} markets={markets} updatedAt={updatedAt} initialCoin={selectedId} initialMode={tradeMode} unavailable={!!error} />
      </Dialog>
    </div>
  );
}
