"use client";
import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { defaultRules, type CardRules, type TemporaryCard } from "@/lib/card-controls";
import { parseBRL } from "@/lib/transfer";
import { uuidPattern } from "@/lib/bank";

export function useCardPreferences() {
  const [rules, setRules] = useState<CardRules>(defaultRules);
  const [temporary, setTemporary] = useState<TemporaryCard | null>(null);
  const [useTemporary, setUseTemporary] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const frame = requestAnimationFrame(() => { try {
    const raw = JSON.parse(localStorage.getItem("saldo-card-controls-v1") || "{}");
    if (typeof raw.rules?.online === "boolean" && typeof raw.rules?.contactless === "boolean" && Number.isSafeInteger(raw.rules?.capCents) && raw.rules.capCents > 0 && raw.rules.capCents <= 500_000) setRules(raw.rules);
    if (raw.temporary && uuidPattern.test(raw.temporary.id) && /^0000 \d{4} \d{4} \d{4}$/.test(raw.temporary.number) && Number.isFinite(raw.temporary.expires) && typeof raw.temporary.used === "boolean") setTemporary(raw.temporary);
    setUseTemporary(raw.useTemporary === true);
  } catch { /* Local controls. */ } setLoaded(true); }); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem("saldo-card-controls-v1", JSON.stringify({ rules, temporary, useTemporary })); } catch { /* Keep local session usable. */ } }, [loaded, rules, temporary, useTemporary]);
  return { rules, setRules, temporary, setTemporary, useTemporary, setUseTemporary };
}

export function CardSettings({ preferences }: { preferences: ReturnType<typeof useCardPreferences> }) {
  const [mode, setMode] = useState<"rules" | "temporary" | null>(null);
  const [cap, setCap] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now);
  const { rules, setRules, temporary, setTemporary, useTemporary, setUseTemporary } = preferences;
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 5000); return () => window.clearInterval(timer); }, []);
  function generate() {
    const parts = crypto.getRandomValues(new Uint16Array(3));
    setTemporary({ id: crypto.randomUUID(), number: "0000 " + [...parts].map((value) => String(value % 10000).padStart(4, "0")).join(" "), expires: Date.now() + 10 * 60 * 1000, used: false }); setUseTemporary(true); setNow(Date.now()); setNotice("Número fictício criado. Uma compra demonstrativa ou 10 minutos de validade.");
  }
  return <div className="mt-2">
    {[{ id: "rules" as const, title: "Controles de uso", icon: <TuneRoundedIcon sx={{ fontSize: 19 }} />, subtitle: "Online, aproximação e limite por compra" }, { id: "temporary" as const, title: "Cartão temporário", icon: <CreditCardOutlinedIcon sx={{ fontSize: 19 }} />, subtitle: useTemporary ? "Selecionado para a próxima compra" : "Número fictício de uso único" }].map((item) => <button key={item.id} onClick={() => { setMode(item.id); setCap((rules.capCents / 100).toFixed(2).replace(".", ",")); setNotice(""); }} className="flex min-h-16 w-full items-center gap-3 border-b border-white/[.06] px-1 text-left"><span className="text-white/65">{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-white/75">{item.title}</span><span className="mt-1 block text-[10px] text-white/35">{item.subtitle}</span></span><ChevronRightRoundedIcon sx={{ fontSize: 17 }} className="text-white/30" /></button>)}
    <Dialog open={mode !== null} onClose={() => setMode(null)} fullWidth maxWidth="xs" aria-labelledby="settings-title" slotProps={{ paper: { sx: { background: "#151618", color: "white", borderRadius: "24px", margin: "16px", width: "calc(100% - 32px)" } } }}><div className="p-5 sm:p-6"><div className="flex items-center justify-between"><h2 id="settings-title" className="text-lg font-semibold tracking-[-.03em]">{mode === "rules" ? "Controles de uso" : "Cartão temporário"}</h2><button aria-label="Fechar controles" onClick={() => setMode(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[.05]"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button></div>
    {mode === "rules" ? <div className="mt-5">{[{ key: "online" as const, label: "Compras online" }, { key: "contactless" as const, label: "Aproximação" }].map((item) => <button key={item.key} role="switch" aria-checked={rules[item.key]} onClick={() => setRules({ ...rules, [item.key]: !rules[item.key] })} className="flex min-h-14 w-full items-center justify-between border-b border-white/[.07] text-sm"><span>{item.label}</span><span className={"relative h-6 w-10 rounded-full transition " + (rules[item.key] ? "bg-[#b9aaf5]" : "bg-white/15")}><span className={"absolute top-1 h-4 w-4 rounded-full bg-white transition-transform " + (rules[item.key] ? "translate-x-5" : "translate-x-1")} /></span></button>)}<label className="mt-6 block text-xs text-white/50">Limite por compra (até R$ 5.000)<input inputMode="decimal" value={cap} maxLength={12} onChange={(event) => setCap(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-[#0c0d0f] px-3 text-white outline-none focus:ring-1 focus:ring-[#b9aaf5]" /></label><button onClick={() => { const cents = Math.round(parseBRL(cap) * 100); if (cents <= 0 || cents > 500000) { setNotice("Informe de R$ 0,01 a R$ 5.000,00."); return; } setRules({ ...rules, capCents: cents }); setNotice("Limite salvo neste aparelho."); }} className="mt-5 h-11 w-full rounded-full bg-[#c6b8fb] text-xs font-semibold text-[#201a32]">Salvar limite</button></div> : <div className="mt-6">{temporary ? <><p className="text-[10px] text-white/40">NÚMERO FICTÍCIO · NÃO É UM CARTÃO BANCÁRIO</p><p className="mt-4 break-words font-mono text-[clamp(15px,4vw,23px)] tracking-[.025em]">{temporary.number}</p><p className="mt-3 text-xs text-white/50">{temporary.used ? "Já utilizado" : temporary.expires <= now ? "Expirado" : `Expira em ${Math.max(1, Math.ceil((temporary.expires - now) / 60000))} min`} · CVV 000</p><button onClick={async () => { try { await navigator.clipboard.writeText(temporary.number); setNotice("Número fictício copiado."); } catch { setNotice("Selecione o número para copiar."); } }} className="mt-4 min-h-9 text-xs text-[#c6b8fb]">Copiar número</button><button disabled={temporary.used || temporary.expires <= now} onClick={() => setUseTemporary(!useTemporary)} className="mt-4 min-h-11 w-full rounded-full border border-white/10 text-xs disabled:opacity-30">{useTemporary ? "Voltar ao cartão principal" : "Usar na próxima compra"}</button></> : <p className="text-xs leading-5 text-white/50">Crie um número inválido para demonstrar uma compra online. Ele é consumido após o registro e compartilha o limite do cartão principal.</p>}<button onClick={generate} className="mt-4 h-11 w-full rounded-full bg-[#c6b8fb] text-xs font-semibold text-[#201a32]">{temporary ? "Gerar novo número" : "Criar cartão temporário"}</button></div>}
    <p className="mt-5 text-[10px] leading-5 text-white/35">Preferências locais para a demonstração. Não representam controles de uma instituição emissora.</p>{notice && <p role="status" className="mt-4 text-xs leading-5 text-[#94e5b4]">{notice}</p>}</div></Dialog>
  </div>;
}
