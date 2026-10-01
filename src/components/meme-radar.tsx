"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MemeFeed, MemeToken } from "@/lib/memes";
import { evaluatePriceAlerts, type PriceAlert } from "@/lib/price-alerts";

const compactUsd = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ease = [0.22, 1, 0.36, 1] as const;
const alertStorageKey = "saldo-price-alerts-v1";

type RadarFilter = "trending" | "gainers" | "new" | "favorites";
type ChartPoint = { timestamp: number; price: number };

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 0.000000000001) return `US$ ${value.toExponential(2)}`;
  const digits = value < 0.00000001 ? 12 : value < 0.0001 ? 8 : value < 0.01 ? 6 : value < 1 ? 4 : 2;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function formatChange(value: number) {
  return `${value > 0 ? "+" : ""}${percent.format(value)}%`;
}

function ageLabel(createdAt: string | null) {
  if (!createdAt) return "—";
  const hours = Math.max(0, (Date.now() - Date.parse(createdAt)) / 3_600_000);
  if (!Number.isFinite(hours)) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.floor(hours)} h`;
  return `${Math.floor(hours / 24)} dias`;
}

function TokenLogo({ token, size = 42 }: { token: MemeToken; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#303438] text-[11px] font-bold uppercase text-[#c9d3ce] ring-1 ring-inset ring-white/[0.07]">
      {token.image && !broken ? <img src={token.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-full w-full object-cover" /> : token.symbol.slice(0, 2)}
    </span>
  );
}

export function MemeRadar({ compact = false }: { compact?: boolean }) {
  const [feed, setFeed] = useState<MemeFeed | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RadarFilter>("trending");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<MemeToken | null>(null);
  const [period, setPeriod] = useState<"1h" | "24h">("24h");
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [chartError, setChartError] = useState("");
  const [copied, setCopied] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const alertsRef = useRef<PriceAlert[]>([]);
  const [alertTarget, setAlertTarget] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const [alertMessage, setAlertMessage] = useState("");
  const controller = useRef<AbortController | null>(null);

  const saveAlerts = useCallback((next: PriceAlert[]) => {
    alertsRef.current = next;
    setAlerts(next);
    try { localStorage.setItem(alertStorageKey, JSON.stringify(next)); } catch { /* Session-only fallback. */ }
  }, []);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setRefreshing(true);
    try {
      const response = await fetch("/api/memes", { signal: request.signal, cache: "no-store" });
      if (!response.ok) throw new Error("feed-unavailable");
      const result = await response.json() as MemeFeed;
      if (!Array.isArray(result.tokens) || result.tokens.length === 0) throw new Error("empty-feed");
      setFeed(result);
      const evaluated = evaluatePriceAlerts(alertsRef.current, new Map(result.tokens.map((token) => [token.address, token.priceUsd])), Date.now());
      if (evaluated.triggered.length) {
        saveAlerts(evaluated.alerts);
        setAlertMessage(evaluated.triggered.length === 1 ? "Alerta de preço atingido: " + evaluated.triggered[0].name : evaluated.triggered.length + " alertas de preço atingidos.");
      }
      setError("");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("Mercado indisponível no momento. Tente atualizar.");
    } finally {
      if (controller.current === request) setRefreshing(false);
    }
  }, [saveAlerts]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const value: unknown = JSON.parse(localStorage.getItem("saldo-meme-watchlist") ?? "[]");
        if (Array.isArray(value)) setFavorites(value.filter((item): item is string => typeof item === "string"));
      } catch { /* Favorites remain available for this session. */ }
      try {
        const value: unknown = JSON.parse(localStorage.getItem(alertStorageKey) ?? "[]");
        if (Array.isArray(value)) saveAlerts(value.filter((item): item is PriceAlert => Boolean(item && typeof item === "object" && typeof item.address === "string" && typeof item.targetUsd === "number" && (item.direction === "above" || item.direction === "below"))).slice(-40));
      } catch { /* Alerts remain available for this session. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [saveAlerts]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh());
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 30_000);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); controller.current?.abort(); };
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/memes/chart?pool=${selected.poolAddress}&period=${period}`, { signal: abort.signal });
        if (!response.ok) throw new Error("chart-unavailable");
        const body = await response.json() as { points?: ChartPoint[] };
        if (!body.points?.length) throw new Error("empty-chart");
        setChart(body.points);
        setChartError("");
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setChartError("Histórico indisponível para este pool.");
      }
    })();
    return () => abort.abort();
  }, [selected, period]);

  const tokens = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    let result = (feed?.tokens ?? []).filter((token) => !normalized || `${token.name} ${token.symbol} ${token.address}`.toLocaleLowerCase("pt-BR").includes(normalized));
    if (filter === "favorites") result = result.filter((token) => favorites.includes(token.address));
    else if (filter === "gainers") result = result.filter((token) => token.change24h > 0).sort((a, b) => b.change24h - a.change24h);
    else if (filter === "new") result = [...result].sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
    return compact ? result.slice(0, 5) : result;
  }, [feed, query, filter, favorites, compact]);
  const visibleMarket = useMemo(() => tokens.reduce((total, token) => ({
    volume: total.volume + token.volume24hUsd,
    liquidity: total.liquidity + token.liquidityUsd,
  }), { volume: 0, liquidity: 0 }), [tokens]);

  function toggleFavorite(address: string) {
    const next = favorites.includes(address) ? favorites.filter((item) => item !== address) : [...favorites, address];
    setFavorites(next);
    try { localStorage.setItem("saldo-meme-watchlist", JSON.stringify(next)); } catch { /* Session-only fallback. */ }
  }

  function openToken(token: MemeToken) {
    setSelected(token);
    setPeriod("24h");
    setChart([]);
    setChartError("");
    setCopied(false);
    setAlertTarget("");
    setAlertDirection("above");
  }

  function createAlert() {
    if (!selected) return;
    const price = feed?.tokens.find((token) => token.address === selected.address)?.priceUsd ?? selected.priceUsd;
    const targetUsd = Number(alertTarget.trim().replace(",", "."));
    if (!Number.isFinite(targetUsd) || targetUsd <= 0 || (alertDirection === "above" ? targetUsd <= price : targetUsd >= price)) {
      setAlertMessage(alertDirection === "above" ? "Escolha um preço acima do atual." : "Escolha um preço abaixo do atual.");
      return;
    }
    saveAlerts([{ id: crypto.randomUUID(), address: selected.address, name: selected.name, symbol: selected.symbol, targetUsd, direction: alertDirection, createdAt: Date.now(), triggeredAt: null }, ...alertsRef.current].slice(0, 40));
    setAlertTarget("");
    setAlertMessage("Alerta salvo neste navegador. Acompanhamento enquanto a carteira estiver aberta.");
  }

  function removeAlert(id: string) {
    saveAlerts(alertsRef.current.filter((alert) => alert.id !== id));
  }

  async function copyContract() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected.address); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    catch { setCopied(false); }
  }

  const filters: { id: RadarFilter; label: string }[] = [
    { id: "trending", label: "Em alta" },
    { id: "gainers", label: "Maiores altas" },
    { id: "new", label: "Novos" },
    { id: "favorites", label: "Favoritos" },
  ];

  return (
    <section className={compact ? "min-w-0" : "mx-auto max-w-[1180px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:px-8 lg:pb-12"} aria-label="Radar de tokens da Solana">
      {compact ? (
        <div className="mb-3 flex items-end justify-between px-1">
          <div><h2 className="text-[17px] font-semibold tracking-[-0.035em] text-[#f1f4f2]">Tokens em destaque</h2></div>
          <Link href="/dashboard/memes" className="flex items-center gap-0.5 text-[10px] font-semibold text-[#bfb3f2] transition hover:text-[#ded7ff]">Ver todos <ArrowOutwardRoundedIcon sx={{ fontSize: 14 }} /></Link>
        </div>
      ) : (
        <header className="mb-7">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] text-[#8c9892] transition hover:text-white"><ArrowBackRoundedIcon sx={{ fontSize: 15 }} />Sua carteira</Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-[36px] font-semibold leading-none tracking-[-0.065em] sm:text-[48px]">Explorar Solana<span className="text-[#b9aaf5]">.</span></h1><p className="mt-3 max-w-[560px] text-xs leading-5 text-white/42">Descubra pares em movimento, com preços e liquidez atualizados.</p></div>
            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.045] px-3 text-[11px] font-semibold text-[#d4ded7] transition hover:bg-white/[0.08] disabled:opacity-50"><RefreshRoundedIcon sx={{ fontSize: 17 }} className={refreshing ? "animate-spin" : ""} />Atualizar</button>
          </div>
        </header>
      )}

      {alertMessage && <motion.div role="status" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-[#8f80c8]/20 bg-[#26232f] px-3 py-2.5 text-[11px] text-[#ddd6f6]"><span className="flex items-center gap-2"><NotificationsNoneRoundedIcon sx={{ fontSize: 17 }} />{alertMessage}</span><button type="button" onClick={() => setAlertMessage("")} aria-label="Fechar aviso"><CloseRoundedIcon sx={{ fontSize: 16 }} /></button></motion.div>}
      {!compact && alerts.length > 0 && <details className="mb-5 rounded-[15px] border border-white/[0.055] bg-[#121316] px-3.5 py-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-[#d8d9dd]"><NotificationsNoneRoundedIcon sx={{ fontSize: 17 }} />Alertas de preço <span className="ml-auto rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-white/55">{alerts.filter((alert) => !alert.triggeredAt).length} ativos</span></summary><div className="mt-3 space-y-1.5">{alerts.map((alert) => <div key={alert.id} className="flex items-center gap-2 rounded-xl bg-[#1a1b1e] px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-[10px] text-white/70">{alert.name} · {alert.direction === "above" ? "acima de" : "abaixo de"} {formatPrice(alert.targetUsd)}</span><span className={"shrink-0 text-[9px] " + (alert.triggeredAt ? "text-[#80e1aa]" : "text-white/38")}>{alert.triggeredAt ? "Atingido" : "Aguardando"}</span><button type="button" onClick={() => removeAlert(alert.id)} aria-label={"Remover alerta de " + alert.name} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/40 hover:bg-white/[0.07]"><CloseRoundedIcon sx={{ fontSize: 15 }} /></button></div>)}</div></details>}
      {!compact && <div className="mb-6 grid grid-cols-2 gap-4 border-y border-white/[0.07] py-5 sm:gap-10">
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/37">Volume · 24h</p><motion.p key={visibleMarket.volume} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-[clamp(1.15rem,3.5vw,1.7rem)] font-semibold tracking-[-0.045em] text-white">{feed ? compactUsd.format(visibleMarket.volume) : "—"}</motion.p></div>
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/37">Liquidez</p><motion.p key={visibleMarket.liquidity} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-[clamp(1.15rem,3.5vw,1.7rem)] font-semibold tracking-[-0.045em] text-white">{feed ? compactUsd.format(visibleMarket.liquidity) : "—"}</motion.p></div>
        <p className="col-span-2 -mt-2 text-[9px] text-white/26">Totais dos pares exibidos nesta seleção</p>
      </div>}

      {!compact && <div className="mb-4 space-y-3">
        <label className="flex h-11 items-center gap-2.5 rounded-[15px] border border-white/[0.065] bg-[#111214] px-3.5 text-[#8c9893] focus-within:border-[#b9aaf5]/45"><SearchRoundedIcon sx={{ fontSize: 19 }} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar token ou contrato" className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-[#78827e]" /></label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1"><FilterAltRoundedIcon sx={{ fontSize: 17 }} className="mr-1 shrink-0 text-[#81838c]" />{filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={"shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold transition " + (filter === item.id ? "bg-[#c7bbf8] text-[#241c39]" : "bg-white/[0.055] text-[#a2a3aa] hover:bg-white/[0.1]")}>{item.label}</button>)}</div>
      </div>}

      <div className="space-y-2">
        {!compact && <div className="flex items-center justify-between px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/33"><span>Token</span><span>Preço / 24h</span></div>}
        {tokens.length > 0 ? <AnimatePresence initial={false}>{tokens.map((token, index) => <motion.div key={token.address} layout initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.24, ease, delay: Math.min(index * 0.025, 0.12) }} className="group flex min-w-0 items-center overflow-hidden rounded-[18px] border border-white/[0.045] bg-[#151619] transition-colors hover:border-white/[0.1] hover:bg-[#1b1c20]">
          <button type="button" onClick={() => openToken(token)} className="grid min-w-0 flex-1 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3.5 text-left sm:grid-cols-[45px_minmax(0,1fr)_auto] sm:px-4 sm:py-4">
            <TokenLogo token={token} size={compact ? 40 : 45} />
            <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-[#f0f3f1] sm:text-sm">{token.name}</span><span className="mt-0.5 block truncate text-[10px] text-[#929c99]">{token.symbol}</span></span>
            <span className="shrink-0 text-right"><span className="block text-[12px] font-semibold tabular-nums text-[#eff2f0] sm:text-sm">{formatPrice(token.priceUsd)}</span><span className={"mt-0.5 block text-[10px] font-semibold tabular-nums " + (token.change24h > 0 ? "text-[#6de09c]" : token.change24h < 0 ? "text-[#fa8191]" : "text-white/50")}>{formatChange(token.change24h)}</span></span>
            <span className="col-span-3 flex min-w-0 flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.045] pt-2 text-[9px] font-medium text-white/42"><span>Vol {compactUsd.format(token.volume24hUsd)}</span><span>Liq {compactUsd.format(token.liquidityUsd)}</span></span>
          </button>
          {!compact && <button type="button" onClick={() => toggleFavorite(token.address)} aria-label={favorites.includes(token.address) ? `Remover ${token.name} dos favoritos` : `Favoritar ${token.name}`} aria-pressed={favorites.includes(token.address)} className={"mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-white/[0.07] " + (favorites.includes(token.address) ? "text-[#d5edac]" : "text-[#6d7773]")}>{favorites.includes(token.address) ? <StarRoundedIcon sx={{ fontSize: 19 }} /> : <StarBorderRoundedIcon sx={{ fontSize: 19 }} />}</button>}
        </motion.div>)}</AnimatePresence> : <div className="grid min-h-28 place-items-center rounded-[18px] border border-white/[0.045] bg-[#151619] px-5 text-center text-xs text-[#929d97]">{error ? <div><p>{error}</p><button type="button" onClick={() => void refresh()} className="mt-2 text-[#a8d6b7] underline">Tentar novamente</button></div> : feed ? filter === "favorites" ? "Sua lista está vazia. Toque na estrela para guardar um token." : "Nenhum token corresponde a este filtro." : <div className="w-full space-y-2"><div className="market-skeleton h-10 rounded-xl" /><div className="market-skeleton h-10 rounded-xl" /></div>}</div>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[9px] text-white/34"><span className="flex items-center gap-1.5"><span className={"h-1.5 w-1.5 rounded-full " + (error ? "bg-[#a37f78]" : "bg-[#6fd69c]")} />{feed ? "Cotações atualizadas" : error ? "Sem atualização" : "Conectando ao mercado"}</span><span>{feed ? new Date(feed.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span></div>
      {!compact && <p className="mt-5 max-w-[680px] text-[10px] leading-[1.6] text-[#77837b]">Dados de terceiros podem atrasar. Tokens em tendência não pertencem à sua carteira. Confira o contrato, a liquidez e os riscos antes de operar. Este painel não executa ordens.</p>}

      <Dialog open={selected !== null} onClose={() => setSelected(null)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: "24px", background: "#1a1e1f", color: "#fff", margin: "12px", width: "calc(100% - 24px)", maxHeight: "calc(100% - 24px)" } }, backdrop: { sx: { background: "rgba(0,0,0,.74)", backdropFilter: "blur(8px)" } } }}>
        {selected && <div className="min-w-0 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><TokenLogo token={selected} size={49} /><div className="min-w-0"><h2 className="truncate text-[18px] font-semibold tracking-[-0.035em]">{selected.name}</h2><p className="mt-0.5 text-[11px] text-[#91a096]">{selected.symbol} · Solana</p></div></div><button onClick={() => setSelected(null)} aria-label="Fechar detalhes" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-[#b9c3bc] transition hover:bg-white/[0.1]"><CloseRoundedIcon sx={{ fontSize: 19 }} /></button></div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Preço em dólar</p><p className="mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.055em] tabular-nums sm:text-[38px]">{formatPrice(selected.priceUsd)}</p></div><span className={"rounded-full px-2.5 py-1.5 text-xs font-bold tabular-nums " + (selected.change24h >= 0 ? "bg-[#73dd9b]/10 text-[#72e09d]" : "bg-[#f6818d]/10 text-[#f6818d]")}>{formatChange(selected.change24h)} · 24h</span></div>
          <div className="mt-5 flex items-center justify-between"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#c2d0c6]"><AutoGraphRoundedIcon sx={{ fontSize: 17 }} />Histórico do pool</div><div className="flex rounded-lg bg-white/[0.055] p-0.5">{(["1h", "24h"] as const).map((item) => <button key={item} onClick={() => { setPeriod(item); setChart([]); setChartError(""); }} aria-pressed={period === item} className={"rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition " + (period === item ? "bg-[#3a4540] text-white" : "text-[#8b9890]")}>{item}</button>)}</div></div>
          <div className="mt-2 h-[190px] w-full overflow-hidden rounded-xl bg-[#111715]/60">{chart.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 15, right: 8, left: 8, bottom: 8 }}><defs><linearGradient id="meme-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={selected.change24h >= 0 ? "#75dba1" : "#ec8491"} stopOpacity={0.28} /><stop offset="100%" stopColor={selected.change24h >= 0 ? "#75dba1" : "#ec8491"} stopOpacity={0} /></linearGradient></defs><XAxis dataKey="timestamp" hide /><YAxis hide domain={["dataMin", "dataMax"]} /><Tooltip contentStyle={{ background: "#242b28", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "white", fontSize: 11 }} labelFormatter={(label) => new Date(Number(label)).toLocaleString("pt-BR")} formatter={(value) => [formatPrice(Number(value)), "Preço"]} /><Area type="monotone" dataKey="price" stroke={selected.change24h >= 0 ? "#83e3ad" : "#f18e9a"} strokeWidth={2} fill="url(#meme-chart-fill)" isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-[11px] text-[#829087]">{chartError || "Carregando gráfico…"}</div>}</div>
          <div className="mt-4 grid grid-cols-3 gap-2">{[{ label: "5 min", value: formatChange(selected.change5m), tone: selected.change5m }, { label: "1 hora", value: formatChange(selected.change1h), tone: selected.change1h }, { label: "24 horas", value: formatChange(selected.change24h), tone: selected.change24h }].map((stat) => <div key={stat.label} className="rounded-[12px] bg-white/[0.045] px-2.5 py-2.5"><p className="text-[9px] text-white/36">{stat.label}</p><p className={"mt-1 text-[11px] font-semibold tabular-nums " + (stat.tone > 0 ? "text-[#76dca0]" : stat.tone < 0 ? "text-[#ee8d99]" : "text-[#c8cec9]")}>{stat.value}</p></div>)}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">{[{ label: "Liquidez", value: compactUsd.format(selected.liquidityUsd) }, { label: "Volume 24h", value: compactUsd.format(selected.volume24hUsd) }, { label: "Compras / vendas · 1h", value: `${selected.buys1h} / ${selected.sells1h}` }, { label: "Pool criado há", value: ageLabel(selected.createdAt) }].map((stat) => <div key={stat.label} className="rounded-[12px] bg-white/[0.045] px-3 py-2.5"><p className="text-[9px] text-white/36">{stat.label}</p><p className="mt-1 text-[11px] font-semibold text-[#e4e9e5]">{stat.value}</p></div>)}</div>
          <div className="mt-3 flex items-center justify-between border-y border-white/[0.065] py-3"><span className="text-[10px] text-white/40">Rotatividade · 24h</span><span className="text-[11px] font-semibold tabular-nums text-white/75">{selected.liquidityUsd > 0 ? (selected.volume24hUsd / selected.liquidityUsd).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "× a liquidez" : "—"}</span></div>
          <div className="mt-4"><p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70"><NotificationsNoneRoundedIcon sx={{ fontSize: 17 }} />Alerta de preço</p><p className="mt-1 text-[10px] leading-4 text-white/36">Avisa nesta tela se o token continuar no feed e uma atualização alcançar o valor escolhido.</p><div className="mt-3 flex gap-2"><select aria-label="Direção do alerta" value={alertDirection} onChange={(event) => setAlertDirection(event.target.value as "above" | "below")} className="h-10 rounded-xl bg-[#24252a] px-2 text-[10px] text-white"><option value="above">Acima</option><option value="below">Abaixo</option></select><input aria-label="Preço alvo em dólar" inputMode="decimal" value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)} placeholder="Preço alvo em US$" className="h-10 min-w-0 flex-1 rounded-xl bg-[#24252a] px-3 text-[11px] text-white outline-none placeholder:text-white/35" /><button type="button" onClick={createAlert} className="h-10 rounded-xl bg-[#c7bbf8] px-3 text-[10px] font-bold text-[#231f30]">Criar</button></div>{alerts.filter((alert) => alert.address === selected.address).map((alert) => <p key={alert.id} className="mt-2 text-[10px] text-white/50">{alert.triggeredAt ? "Atingido" : "Aguardando"} · {alert.direction === "above" ? "acima de" : "abaixo de"} {formatPrice(alert.targetUsd)}</p>)}</div>
          <button type="button" onClick={() => void copyContract()} className="mt-3 flex w-full items-center justify-between gap-2 rounded-[12px] border border-white/[0.055] bg-white/[0.025] px-3 py-2.5 text-left text-[10px] text-[#96a79b] transition hover:bg-white/[0.05]"><span className="min-w-0 truncate">Contrato · {selected.address}</span><span className="flex shrink-0 items-center gap-1 text-[#cde5d1]"><ContentCopyRoundedIcon sx={{ fontSize: 15 }} />{copied ? "Copiado" : "Copiar"}</span></button>
          <div className="mt-4 grid grid-cols-2 gap-2"><a href={`https://dexscreener.com/solana/${selected.address}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-1 rounded-xl bg-[#c7bbf8] px-2 text-[11px] font-bold text-[#241c39] transition hover:bg-[#ded6ff]">DEX Screener <OpenInNewRoundedIcon sx={{ fontSize: 15 }} /></a><a href={`https://www.geckoterminal.com/solana/pools/${selected.poolAddress}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-1 rounded-xl bg-white/[0.07] px-2 text-[11px] font-semibold text-[#e4ede6] transition hover:bg-white/[0.12]">GeckoTerminal <OpenInNewRoundedIcon sx={{ fontSize: 15 }} /></a></div>
          <a href="https://axiom.trade/" target="_blank" rel="noopener noreferrer" className="mt-2 flex h-9 items-center justify-center gap-1 text-[10px] font-semibold text-[#a9b9ac] transition hover:text-white">Abrir Axiom e buscar pelo contrato <OpenInNewRoundedIcon sx={{ fontSize: 14 }} /></a>
          <p className="text-center text-[9px] leading-4 text-[#78877e]">Copie o contrato acima para pesquisar na Axiom. Links externos; este app não envia ordens.</p>
        </div>}
      </Dialog>
    </section>
  );
}
