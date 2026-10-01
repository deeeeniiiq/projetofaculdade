"use client";

import { useEffect, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import QrCodeRoundedIcon from "@mui/icons-material/QrCodeRounded";
import ContentPasteRoundedIcon from "@mui/icons-material/ContentPasteRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SubscriptionsOutlinedIcon from "@mui/icons-material/SubscriptionsOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import DocumentScannerOutlinedIcon from "@mui/icons-material/DocumentScannerOutlined";
import QRCode from "qrcode";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { bankOperation, payPixCode } from "@/app/actions/bank";
import { sendTransfer } from "@/app/actions/transactions";
import { allocateCents, brazilDay, buildPix, demoBoleto, detectSubscriptions, monthlySummary, nextMonthlyDate, parseBoleto, parsePix, reserveBalance, uuidPattern, RESERVE_IN, RESERVE_OUT, type Collection, type Goal, type ScheduledPayment } from "@/lib/bank";
import { destinationError, parseBRL } from "@/lib/transfer";
import type { Transaction } from "@/types/transaction";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const dateLabel = (date: string) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date + "T15:00:00Z").getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(date + "T15:00:00Z"));
const ease = [0.22, 1, 0.36, 1] as const;
const storageKey = "saldo-bank-services-v1";
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d0e10] px-3.5 text-sm text-white outline-none transition focus:border-[#b9aaf5]/60";
type Mode = "receive" | "pix" | "boleto" | "schedule" | "recurring" | "goals" | "deposit" | "withdraw" | "split" | "statement" | "insights" | "subscriptions" | "agenda" | null;
type Fields = { amount: string; name: string; key: string; message: string; date: string; people: string; payload: string };
type Review = { title: string; name: string; cents: number; destination: string };
const emptyFields = (): Fields => ({ amount: "", name: "", key: "", message: "", date: brazilDay(), people: "", payload: "" });

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-medium text-white/55">{label}{children}</label>; }
function Primary({ children, onClick, disabled, type = "button" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "submit" | "button" }) { return <button type={type} onClick={onClick} disabled={disabled} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#c6b8fb] px-4 text-sm font-semibold text-[#201a32] transition hover:bg-[#d5c9ff] active:scale-[.98] disabled:opacity-40">{children}</button>; }
function Service({ title, detail, icon, onClick, index }: { title: string; detail: string; icon: ReactNode; onClick: () => void; index: number }) { return <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 * index, duration: .45, ease }} whileTap={{ scale: .99 }} onClick={onClick} className="group flex min-h-[76px] w-full items-center gap-4 rounded-[18px] bg-[#121315] px-4 py-3 text-left transition hover:bg-[#1a1b1e]"><span className="text-[#c6b8fb]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white/90">{title}</span><span className="mt-1 block text-[11px] text-white/40">{detail}</span></span><ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-white/30 transition group-hover:translate-x-1" /></motion.button>; }

export function PixRequest({ cents, name = "Daniel", message = "", reference = "SALDODEMO" }: { cents: number; name?: string; message?: string; reference?: string }) {
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("");
  let payload = "";
  try { payload = buildPix(cents, name, message, reference); } catch { /* Amount has not been entered. */ }
  useEffect(() => { let alive = true; if (payload) QRCode.toDataURL(payload, { width: 480, margin: 3, color: { dark: "#111214", light: "#ffffff" }, errorCorrectionLevel: "M" }).then((value) => { if (alive) setQr(value); }).catch(() => { if (alive) setStatus("Não foi possível gerar o QR."); }); return () => { alive = false; }; }, [payload]);
  async function copy() { try { await navigator.clipboard.writeText(payload); setStatus("PIX copiado"); } catch { setStatus("Copie o código no campo abaixo."); } }
  async function share() { try { if (navigator.share) await navigator.share({ title: "Cobrança demonstrativa", text: payload }); else await copy(); } catch { /* Share cancellation needs no toast. */ } }
  if (!payload) return null;
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center"><p className="text-[32px] font-semibold tracking-[-.06em]">{money(cents)}</p>{qr && <div className="mx-auto my-5 max-w-[240px] rounded-[20px] bg-white p-1"><Image src={qr} unoptimized alt="QR de cobrança demonstrativa" width={240} height={240} className="h-auto w-full rounded-[17px]" /></div>}<p className="text-xs text-white/55">{name} · {message || "Cobrança"}</p><p className="mt-2 text-[10px] leading-5 text-white/35">Chave fictícia demo@saldo.invalid. Para testar o fluxo nesta carteira; não recebe dinheiro real.</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={copy} className="min-h-11 rounded-full bg-white/[.07] text-xs font-semibold">Copiar PIX</button><button onClick={share} className="min-h-11 rounded-full bg-white/[.07] text-xs font-semibold">Compartilhar</button></div>{qr && <a href={qr} download="cobranca-saldo.png" className="mt-4 inline-block py-2 text-xs text-[#c6b8fb]">Salvar QR em imagem</a>}<textarea aria-label="Código PIX gerado" readOnly value={payload} className="mt-3 h-20 w-full resize-none rounded-xl bg-[#0d0e10] p-3 text-[9px] text-white/40" /><p role="status" className="mt-2 text-xs text-[#94e5b4]">{status}</p></motion.div>;
}

export function BankHub({ transactions, cashCents }: { transactions: Transaction[]; cashCents: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [schedules, setSchedules] = useState<ScheduledPayment[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(brazilDay());
  const [month, setMonth] = useState(brazilDay().slice(0, 7));
  const [goalId, setGoalId] = useState("");
  const [activeSchedule, setActiveSchedule] = useState<ScheduledPayment | null>(null);
  const [selectedShare, setSelectedShare] = useState<{ cents: number; message: string; reference: string } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [requestId, setRequestId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const cents = Math.round(parseBRL(fields.amount) * 100);
  const summary = monthlySummary(transactions, month);
  const subscriptions = detectSubscriptions(transactions);
  const allGoals = [...goals];
  for (const transaction of transactions) if ([RESERVE_IN, RESERVE_OUT].includes(transaction.metodo || "") && transaction.identificador && uuidPattern.test(transaction.identificador) && !allGoals.some((goal) => goal.id === transaction.identificador)) allGoals.push({ id: transaction.identificador, name: transaction.destinatario || "Meu cofre", target: 0, date: "" });
  const totalReserved = allGoals.reduce((sum, goal) => sum + reserveBalance(transactions, goal.id), 0);
  const activeTasks = schedules.filter((task) => !task.paused).sort((a, b) => a.date.localeCompare(b.date));
  const dueTasks = activeTasks.filter((task) => task.date <= today);
  const title = { receive: "Cobrar com PIX", pix: "PIX copia e cola", boleto: "Pagar boleto", schedule: "Agendar PIX", recurring: "PIX recorrente", goals: "Meus cofres", deposit: "Guardar no cofre", withdraw: "Resgatar do cofre", split: "Dividir uma cobrança", statement: "Extrato em PDF", insights: "Visão do mês", subscriptions: "Assinaturas detectadas", agenda: "Agenda de pagamentos" };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (Array.isArray(raw.goals)) setGoals(raw.goals.filter((goal: Goal) => uuidPattern.test(goal.id) && typeof goal.name === "string" && Number.isSafeInteger(goal.target) && goal.target > 0));
        if (Array.isArray(raw.schedules)) setSchedules(raw.schedules.filter((task: ScheduledPayment) => uuidPattern.test(task.id) && typeof task.recipient === "string" && typeof task.destination === "string" && Number.isSafeInteger(task.cents) && task.cents > 0 && /^\d{4}-\d{2}-\d{2}$/.test(task.date)));
        if (Array.isArray(raw.collections)) setCollections(raw.collections.filter((item: Collection) => uuidPattern.test(item.id) && typeof item.title === "string" && Array.isArray(item.people) && item.people.length <= 20 && item.people.every((person) => typeof person.name === "string" && Number.isSafeInteger(person.cents) && person.cents > 0)));
      } catch { /* A corrupted local preference never blocks the server ledger. */ }
      setLoaded(true);
    });
    const timer = window.setInterval(() => setToday(brazilDay()), 60000);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, []);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem(storageKey, JSON.stringify({ goals, schedules, collections })); } catch { /* Keep a usable in-session workspace. */ } }, [goals, schedules, collections, loaded]);

  function set(key: keyof Fields, value: string) { setFields((previous) => ({ ...previous, [key]: value })); }
  function open(next: Mode) { setMode(next); setFields(emptyFields()); setError(""); setNotice(""); setReview(null); setReceipt(""); setProcessing(false); setActiveSchedule(null); setSelectedShare(null); setRequestId(crypto.randomUUID()); }
  function close() { if (processing || pending) return; setMode(null); }
  function saveForm(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      if (mode === "pix") {
        const pix = parsePix(fields.payload);
        const value = pix.cents || cents;
        if (value <= 0) throw new Error("Este código não tem valor. Informe o valor para pagar.");
        const invalid = destinationError("PIX", pix.destination); if (invalid) throw new Error(invalid);
        setReview({ title: "Confirmar PIX demonstrativo", name: pix.recipient, cents: value, destination: pix.destination });
      } else if (mode === "boleto") {
        const boleto = parseBoleto(fields.payload);
        if (fields.name.trim().length < 2) throw new Error("Informe o beneficiário que está no boleto.");
        setReview({ title: "Confirmar boleto demonstrativo", name: fields.name.trim(), cents: boleto.cents, destination: `Banco ${boleto.bank} · final ${boleto.line.slice(-8)}` });
      } else if (mode === "deposit" || mode === "withdraw") {
        const goal = allGoals.find((item) => item.id === goalId);
        if (!goal || cents <= 0) throw new Error("Selecione o cofre e informe um valor.");
        if (mode === "withdraw" && cents > reserveBalance(transactions, goal.id)) throw new Error("Valor acima do saldo do cofre.");
        setReview({ title: mode === "deposit" ? "Confirmar aporte" : "Confirmar resgate", name: goal.name, cents, destination: "Movimentação interna · sem taxa" });
      } else if (mode === "schedule" || mode === "recurring") {
        if (fields.name.trim().length < 2 || fields.name.length > 80 || cents <= 0 || cents > 100_000_000) throw new Error("Informe destinatário e valor válidos.");
        const invalid = destinationError("PIX", fields.key); if (invalid) throw new Error(invalid);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || fields.date < today) throw new Error("Escolha hoje ou uma data futura.");
        setSchedules((items) => [...items, { id: crypto.randomUUID(), recipient: fields.name.trim(), destination: fields.key.trim(), cents, date: fields.date, recurring: mode === "recurring", day: Number(fields.date.slice(-2)), paused: false }]);
        open("agenda"); setNotice("Instrução salva. Você confirma o pagamento na data; não há débito automático em segundo plano.");
      } else if (mode === "goals") {
        if (fields.name.trim().length < 2 || fields.name.length > 40 || cents <= 0 || cents > 100_000_000) throw new Error("Dê um nome e uma meta ao cofre.");
        setGoals((items) => [...items, { id: crypto.randomUUID(), name: fields.name.trim(), target: cents, date: fields.date }]); setFields(emptyFields()); setNotice("Cofre criado. Faça o primeiro aporte quando quiser.");
      } else if (mode === "split") {
        const people = fields.people.split(/[,\n]/).map((name) => name.trim()).filter(Boolean);
        if (fields.name.trim().length < 2 || fields.name.length > 60 || people.length < 2 || people.length > 20 || people.some((name) => name.length > 40) || cents > 100_000_000) throw new Error("Informe um título e de 2 a 20 nomes separados por vírgula.");
        const parts = allocateCents(cents, people.length);
        setCollections((items) => [{ id: crypto.randomUUID(), title: fields.name.trim(), cents, people: people.map((name, index) => ({ name, cents: parts[index], paid: false })) }, ...items]); setFields(emptyFields()); setNotice("Cobrança dividida sem perder centavos. Os estados de recebimento são marcados por você.");
      }
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Revise os campos."); }
  }
  function execute() {
    if (pending || processing || !review) return;
    const task = activeSchedule;
    setProcessing(true); setError("");
    startTransition(async () => {
      try {
        const started = Date.now();
        const result = task
          ? await sendTransfer({ requestId: task.id, recipient: task.recipient, destination: task.destination, amount: task.cents / 100, method: "PIX", message: task.recurring ? "Instrução recorrente confirmada pelo usuário" : "Agendamento confirmado pelo usuário" })
          : mode === "pix" ? await payPixCode(requestId, fields.payload, review.cents / 100)
          : await bankOperation({ requestId, kind: mode === "boleto" ? "boleto" : mode === "withdraw" ? "withdraw" : "deposit", cents: review.cents, name: review.name, identifier: mode === "boleto" ? fields.payload : goalId });
        if (!result.ok) throw new Error(result.error);
        const id = "transactionId" in result ? result.transactionId : result.transaction.id;
        await new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, 1300 - (Date.now() - started))));
        if (task) setSchedules((items) => items.flatMap((item) => item.id !== task.id ? [item] : item.recurring ? [{ ...item, id: crypto.randomUUID(), date: nextMonthlyDate(item.day, item.date), receipt: id }] : []));
        setReceipt(id); setReview(null); router.refresh();
      } catch (problem) { setError(problem instanceof Error ? problem.message : "A conexão falhou. Tente confirmar novamente; o mesmo identificador evita duplicação."); }
      finally { setProcessing(false); }
    });
  }
  const services = [
    { mode: "receive" as Mode, title: "Cobrar com PIX", detail: "Valor, mensagem e QR para compartilhar", icon: <QrCodeRoundedIcon /> },
    { mode: "pix" as Mode, title: "PIX copia e cola", detail: "Leia o código antes de confirmar", icon: <ContentPasteRoundedIcon /> },
    { mode: "boleto" as Mode, title: "Pagar boleto", detail: "Linha digitável com validação de dígitos", icon: <DocumentScannerOutlinedIcon /> },
    { mode: "schedule" as Mode, title: "Agendar um PIX", detail: "Prepare agora, confirme na data", icon: <CalendarMonthOutlinedIcon /> },
    { mode: "recurring" as Mode, title: "PIX recorrente", detail: "Uma instrução que acompanha cada mês", icon: <RepeatRoundedIcon /> },
    { mode: "split" as Mode, title: "Dividir uma cobrança", detail: "Um QR por pessoa, valores exatos", icon: <GroupsOutlinedIcon /> },
    { mode: "goals" as Mode, title: "Cofres", detail: "Guardar, resgatar e acompanhar a meta", icon: <SavingsOutlinedIcon /> },
    { mode: "subscriptions" as Mode, title: "Assinaturas", detail: "Encontre cobranças que se repetem", icon: <SubscriptionsOutlinedIcon /> },
    { mode: "statement" as Mode, title: "Extrato mensal", detail: "PDF com saldo e lançamentos do mês", icon: <ReceiptLongOutlinedIcon /> },
    { mode: "insights" as Mode, title: "Visão do mês", detail: "Entradas, saídas e composição", icon: <BarChartRoundedIcon /> },
  ];

  return <div className="mx-auto max-w-[850px] px-4 pb-28 pt-6 text-white sm:px-8 sm:pt-10">
    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between"><div className="flex items-center gap-3"><Link aria-label="Voltar à carteira" href="/dashboard" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.04] text-white/60"><ArrowBackRoundedIcon sx={{ fontSize: 20 }} /></Link><h1 className="text-xl font-semibold tracking-[-.04em]">Banco</h1></div><span className="text-[9px] uppercase tracking-[.14em] text-white/30">DEMONSTRATIVO</span></motion.header>
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, ease }} className="py-9"><p className="text-xs text-white/40">Disponível na carteira</p><p className="mt-2 text-[clamp(2rem,7vw,3.4rem)] font-semibold tracking-[-.065em]">{money(cashCents)}</p><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/40"><button onClick={() => open("goals")}>Nos cofres <span className="ml-1 text-white/75">{money(totalReserved)}</span></button><button onClick={() => open("agenda")}>Agenda <span className="ml-1 text-[#c6b8fb]">{dueTasks.length ? `${dueTasks.length} para confirmar` : `${activeTasks.length} instruções`}</span></button></div></motion.div>
    {dueTasks.length > 0 && <button onClick={() => open("agenda")} className="mb-6 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-[#19171f] px-4 text-left"><CalendarMonthOutlinedIcon className="text-[#c6b8fb]" /><span className="min-w-0 flex-1 text-xs text-white/75">Você tem pagamentos prontos para revisar</span><ChevronRightRoundedIcon sx={{ fontSize: 18 }} /></button>}
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-white/35">PAGAR & RECEBER</p><div className="grid gap-2.5 sm:grid-cols-2">{services.slice(0, 6).map((service, index) => <Service key={service.mode} {...service} index={index} onClick={() => open(service.mode)} />)}</div>
    <p className="mb-3 mt-8 text-[10px] font-semibold uppercase tracking-[.14em] text-white/35">SUA CONTA</p><div className="grid gap-2.5 sm:grid-cols-2">{services.slice(6).map((service, index) => <Service key={service.mode} {...service} index={index + 6} onClick={() => open(service.mode)} />)}</div>
    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[.07] pt-5 text-xs text-white/45"><button onClick={() => open("agenda")} className="py-2">Abrir agenda</button><Link href="/dashboard/nova-transacao" className="py-2">Registrar movimentação</Link><Link href="/dashboard" className="py-2">Ver carteira</Link></div><p className="mt-3 max-w-lg text-[10px] leading-5 text-white/30">Pagamentos e comprovantes demonstrativos. Agenda, metas e cobranças são preferências deste navegador. Os lançamentos financeiros usam o banco de dados da aplicação.</p>

    <Dialog open={mode !== null} onClose={close} fullWidth maxWidth="sm" aria-labelledby="bank-title" sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }} slotProps={{ paper: { sx: { borderRadius: { xs: "26px 26px 0 0", sm: "26px" }, background: "#151618", color: "white", margin: { xs: 0, sm: "20px" }, width: { xs: "100%", sm: "calc(100% - 40px)" }, maxHeight: "90dvh" } }, backdrop: { sx: { background: "rgba(0,0,0,.76)", backdropFilter: "blur(8px)" } } }}>
      {mode && <div className="overflow-y-auto px-5 pb-8 pt-5 sm:p-7"><div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/15 sm:hidden" /><div className="mb-6 flex items-center justify-between gap-3"><h2 id="bank-title" className="text-xl font-semibold tracking-[-.04em]">{title[mode]}</h2><button onClick={close} disabled={pending || processing} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.05]"><CloseRoundedIcon sx={{ fontSize: 19 }} /></button></div>
      <AnimatePresence mode="wait">
        {processing ? <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center"><div className="bank-processing mx-auto mb-6 h-14 w-14 rounded-full border-2 border-white/10 border-t-[#c6b8fb]" /><p className="font-semibold">Registrando sua operação</p><p className="mt-3 text-xs text-white/40">Validando o saldo e emitindo o comprovante demonstrativo</p></motion.div> : receipt ? <motion.div key="success" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="py-5 text-center"><motion.div initial={{ scale: .5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 17 }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#94e5b4]/10 text-[#94e5b4]"><CheckRoundedIcon sx={{ fontSize: 32 }} /></motion.div><h3 className="mt-5 text-xl font-semibold">Operação registrada</h3><p className="mt-3 text-xs leading-5 text-white/45">O histórico e os valores foram atualizados. Comprovante demonstrativo disponível.</p><Link href={`/dashboard/comprovante/${receipt}`} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-[#c6b8fb] text-sm font-semibold text-[#201a32]">Ver comprovante</Link><a href={`/api/receipt/${receipt}/pdf`} className="mt-3 block py-3 text-xs text-white/65">Baixar PDF</a></motion.div> : review ? <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}><p className="text-[11px] text-white/45">{review.title}</p><p className="mt-3 text-4xl font-semibold tracking-[-.06em]">{money(review.cents)}</p><p className="mt-7 font-medium">{review.name}</p><p className="mt-2 break-all text-xs leading-5 text-white/45">{review.destination}</p><p className="mt-6 border-t border-white/[.07] pt-4 text-[11px] leading-5 text-white/40">Esta confirmação registra uma simulação. Não movimenta dinheiro em um banco ou blockchain.</p><Primary onClick={execute} disabled={pending}>Confirmar operação</Primary><button onClick={() => { setReview(null); setActiveSchedule(null); }} className="mt-3 min-h-10 w-full text-xs text-white/50">Voltar</button></motion.div> : <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {["receive", "pix", "boleto", "schedule", "recurring", "goals", "deposit", "withdraw", "split"].includes(mode) && <form onSubmit={saveForm} className="space-y-4">
            {["receive", "schedule", "recurring", "goals", "split", "boleto"].includes(mode) && <Field label={mode === "goals" ? "Nome do cofre" : mode === "split" ? "O que estão dividindo?" : mode === "receive" ? "Nome exibido" : "Destinatário / beneficiário informado"}><input value={fields.name} onChange={(event) => set("name", event.target.value)} placeholder={mode === "receive" ? "Daniel" : mode === "goals" ? "Minha próxima viagem" : "Nome"} maxLength={mode === "goals" ? 40 : 60} className={inputClass} /></Field>}
            {["pix", "boleto"].includes(mode) && <Field label={mode === "pix" ? "Cole o código PIX" : "Linha digitável (47 dígitos)"}><textarea value={fields.payload} onChange={(event) => set("payload", event.target.value)} maxLength={1000} className={inputClass + " h-24 resize-none py-3 font-mono text-[11px]"} /></Field>}
            {mode === "boleto" && <button type="button" onClick={() => { set("payload", demoBoleto()); set("name", "Loja demonstração"); }} className="text-xs text-[#c6b8fb]">Usar boleto fictício para testar</button>}
            {mode !== "boleto" && <Field label={mode === "goals" ? "Valor da meta" : mode === "pix" ? "Valor (usado se o código não tiver valor)" : "Valor em reais"}><input inputMode="decimal" value={fields.amount} onChange={(event) => set("amount", event.target.value)} placeholder="0,00" maxLength={15} className={inputClass + " text-lg"} /></Field>}
            {mode === "receive" && <><Field label="Mensagem"><input value={fields.message} onChange={(event) => set("message", event.target.value)} maxLength={50} placeholder="Almoço, presente…" className={inputClass} /></Field><PixRequest cents={cents} name={fields.name || "Daniel"} message={fields.message} /></>}
            {["schedule", "recurring"].includes(mode) && <><Field label="Chave PIX"><input value={fields.key} onChange={(event) => set("key", event.target.value)} maxLength={180} placeholder="E-mail, CPF, telefone ou chave aleatória" className={inputClass} /></Field><Field label="Primeira data"><input type="date" min={today} value={fields.date} onChange={(event) => set("date", event.target.value)} className={inputClass} /></Field><p className="text-[10px] leading-5 text-white/40">{mode === "recurring" ? "Mensal. Em meses curtos, o dia é ajustado ao último dia; o dia original é preservado para o mês seguinte. " : ""}A instrução fica neste navegador e depende de sua confirmação para gerar uma transação.</p></>}
            {mode === "goals" && <Field label="Data da meta"><input type="date" min={today} value={fields.date} onChange={(event) => set("date", event.target.value)} className={inputClass} /></Field>}
            {(mode === "deposit" || mode === "withdraw") && <Field label="Cofre"><select value={goalId} onChange={(event) => setGoalId(event.target.value)} className={inputClass}><option value="">Selecione</option>{allGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name} · {money(reserveBalance(transactions, goal.id))}</option>)}</select></Field>}
            {mode === "split" && <Field label="Pessoas (separe por vírgula)"><textarea value={fields.people} onChange={(event) => set("people", event.target.value)} placeholder="Daniel, Maria, Pedro" maxLength={850} className={inputClass + " h-20 resize-none py-3"} /></Field>}
            {mode !== "receive" && <Primary type="submit">{["schedule", "recurring"].includes(mode) ? "Salvar instrução" : mode === "goals" ? "Criar cofre" : mode === "split" ? "Dividir cobrança" : "Revisar operação"}</Primary>}
          </form>}
          {mode === "goals" && <div className="mt-7 space-y-3">{allGoals.map((goal) => { const saved = reserveBalance(transactions, goal.id), progress = goal.target ? Math.min(100, saved / goal.target * 100) : 0; return <div key={goal.id} className="rounded-2xl bg-[#0d0e10] p-4"><div className="flex items-center justify-between gap-3"><h3 className="min-w-0 truncate text-sm font-semibold">{goal.name}</h3>{saved === 0 && !transactions.some((entry) => entry.identificador === goal.id) && <button aria-label={`Excluir cofre ${goal.name}`} onClick={() => setGoals((items) => items.filter((item) => item.id !== goal.id))} className="text-white/35"><DeleteOutlineRoundedIcon sx={{ fontSize: 19 }} /></button>}</div><p className="mt-3 text-xl font-semibold">{money(saved)}</p>{goal.target > 0 && <><p className="mt-1 text-[10px] text-white/40">Meta {money(goal.target)}{goal.date ? ` · ${dateLabel(goal.date)}` : ""}</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#c6b8fb]" /></div></>}<div className="mt-4 flex gap-5 text-xs text-[#c6b8fb]"><button onClick={() => { open("deposit"); setGoalId(goal.id); }} className="min-h-9">Guardar</button><button disabled={saved <= 0} onClick={() => { open("withdraw"); setGoalId(goal.id); }} className="min-h-9 disabled:opacity-30">Resgatar</button></div></div>; })}<p className="text-[10px] leading-5 text-white/35">O aporte reduz o saldo disponível e o resgate o devolve. São movimentos internos, sem contá-los como renda ou gasto. Nenhum rendimento é prometido.</p></div>}
          {mode === "agenda" && <><p className="text-xs leading-5 text-white/45">Você confirma cada instrução no dia. Pausar ou cancelar remove a previsão, sem alterar o histórico.</p><div className="mt-4 space-y-3">{schedules.length === 0 && <p className="py-5 text-sm text-white/50">Sua agenda está livre.</p>}{[...schedules].sort((a, b) => a.date.localeCompare(b.date)).map((task) => <div key={task.id} className="rounded-2xl bg-[#0d0e10] p-4"><div className="flex justify-between gap-3"><p className="min-w-0 truncate text-sm font-semibold">{task.recipient}</p><p className="shrink-0 text-sm font-semibold">{money(task.cents)}</p></div><p className="mt-2 text-[10px] text-white/40">{dateLabel(task.date)} · {task.recurring ? "Mensal" : "Uma vez"} · {task.paused ? "Pausado" : task.date <= today ? "Aguardando confirmação" : "Preparado"}</p><div className="mt-3 flex items-center gap-4"><button disabled={task.paused || task.date > today} onClick={() => { setActiveSchedule(task); setError(""); setReview({ title: "Revisar instrução de PIX", name: task.recipient, cents: task.cents, destination: task.destination }); }} className="min-h-9 text-xs text-[#c6b8fb] disabled:opacity-25">Confirmar agora</button><button aria-label={task.paused ? "Retomar instrução" : "Pausar instrução"} onClick={() => setSchedules((items) => items.map((item) => item.id === task.id ? { ...item, paused: !item.paused } : item))} className="ml-auto text-white/40">{task.paused ? <PlayArrowRoundedIcon sx={{ fontSize: 21 }} /> : <PauseRoundedIcon sx={{ fontSize: 21 }} />}</button><button aria-label="Cancelar instrução" onClick={() => setSchedules((items) => items.filter((item) => item.id !== task.id))} className="text-white/40"><DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} /></button></div>{task.receipt && <Link href={`/dashboard/comprovante/${task.receipt}`} className="mt-2 block text-[10px] text-white/40">Ver último comprovante ↗</Link>}</div>)}</div>{activeTasks.length > 0 && <p className="mt-5 text-xs leading-5 text-white/45">Saldo previsto após as próximas instruções: <span className={cashCents - activeTasks.reduce((sum, task) => sum + task.cents, 0) < 0 ? "text-[#f18c9b]" : "text-white/80"}>{money(cashCents - activeTasks.reduce((sum, task) => sum + task.cents, 0))}</span>. Considera uma ocorrência de cada instrução e não inclui receitas futuras.</p>}<Primary onClick={() => open("schedule")}>Novo agendamento</Primary></>}
          {mode === "split" && <div className="mt-8 space-y-4">{collections.map((collection) => <div key={collection.id} className="rounded-2xl bg-[#0d0e10] p-4"><div className="flex justify-between gap-3"><h3 className="min-w-0 truncate text-sm font-semibold">{collection.title}</h3><button aria-label="Excluir cobrança" onClick={() => setCollections((items) => items.filter((item) => item.id !== collection.id))} className="text-white/35"><DeleteOutlineRoundedIcon sx={{ fontSize: 19 }} /></button></div><p className="mt-2 text-[10px] text-white/40">Marcado recebido {money(collection.people.filter((person) => person.paid).reduce((sum, person) => sum + person.cents, 0))} de {money(collection.cents)}</p>{collection.people.map((person, index) => <div key={index} className="mt-4 flex items-center gap-3 text-xs"><button aria-label={`Marcar recebimento de ${person.name}`} aria-pressed={person.paid} onClick={() => setCollections((items) => items.map((item) => item.id === collection.id ? { ...item, people: item.people.map((member, position) => position === index ? { ...member, paid: !member.paid } : member) } : item))} className={"grid h-7 w-7 shrink-0 place-items-center rounded-full border " + (person.paid ? "border-[#94e5b4]/30 bg-[#94e5b4]/10 text-[#94e5b4]" : "border-white/15 text-transparent")}><CheckRoundedIcon sx={{ fontSize: 15 }} /></button><span className="min-w-0 flex-1 truncate">{person.name}</span><span>{money(person.cents)}</span><button onClick={() => setSelectedShare({ cents: person.cents, message: `${collection.title} - ${person.name}`, reference: collection.id.replaceAll("-", "").slice(0, 20) + index })} className="grid h-8 w-8 place-items-center text-[#c6b8fb]" aria-label={`QR para ${person.name}`}><QrCodeRoundedIcon sx={{ fontSize: 21 }} /></button></div>)}</div>)}{selectedShare && <PixRequest {...selectedShare} />}<p className="text-[10px] leading-5 text-white/35">Marcar recebido organiza a cobrança e não credita saldo. Para registrar uma entrada demonstrativa, use Registrar movimentação.</p></div>}
          {(mode === "statement" || mode === "insights") && <><Field label="Mês"><input type="month" value={month} onChange={(event) => setMonth(event.target.value || today.slice(0, 7))} className={inputClass} /></Field><div className="mt-7 flex justify-between gap-4"><div><p className="text-xs text-white/40">Entradas</p><p className="mt-2 text-xl font-semibold text-[#94e5b4]">{money(summary.income)}</p></div><div className="text-right"><p className="text-xs text-white/40">Saídas reconhecidas</p><p className="mt-2 text-xl font-semibold">{money(summary.expenses)}</p></div></div><p className="mt-4 text-[10px] leading-5 text-white/35">Inclui compras no crédito e exclui pagamento de fatura e movimentos entre cofres, evitando dupla contagem.</p>{mode === "statement" ? <><a href={`/api/transactions/statement?month=${month}`} className="mt-7 flex min-h-12 items-center justify-center rounded-full bg-[#c6b8fb] text-sm font-semibold text-[#201a32]">Baixar extrato PDF</a><p className="mt-4 text-xs leading-5 text-white/40">Saldo inicial e final, impacto no saldo disponível, compras no crédito em separado e identificadores dos registros.</p></> : <div className="mt-8 space-y-5">{summary.categories.length === 0 && <p className="text-sm text-white/40">Ainda não há saídas neste mês.</p>}{summary.categories.map(([category, amount]) => <div key={category}><div className="flex justify-between gap-3 text-xs"><span className="text-white/65">{category}</span><span>{money(amount)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><motion.div initial={{ width: 0 }} animate={{ width: `${summary.expenses ? amount / summary.expenses * 100 : 0}%` }} transition={{ duration: .65, ease }} className="h-full rounded-full bg-[#b9aaf5]" /></div></div>)}<p className="border-t border-white/[.07] pt-5 text-xs text-white/45">Resultado do mês <span className="float-right font-semibold text-white">{money(summary.income - summary.expenses)}</span></p><Primary onClick={() => open("statement")}>Exportar este mês</Primary></div>}</>}
          {mode === "subscriptions" && <><p className="text-xs leading-5 text-white/45">Sugestões encontradas em lançamentos de meses diferentes ou com categoria Assinaturas. Não consulta contratos nem cancela serviços.</p><div className="mt-5 space-y-3">{subscriptions.length === 0 && <p className="py-7 text-sm text-white/50">Nenhuma repetição detectada ainda.</p>}{subscriptions.map(({ latest, count }) => <div key={latest.id} className="rounded-2xl bg-[#0d0e10] p-4"><p className="text-sm font-semibold">{latest.destinatario || latest.descricao}</p><p className="mt-2 text-xs text-white/50">Última cobrança {money(Math.round(latest.valor * 100))} · {count} registros</p><p className="mt-1 text-[10px] text-white/35">Projeção de 12 cobranças iguais: {money(Math.round(latest.valor * 100) * 12)}</p><button onClick={() => { open("recurring"); setFields({ ...emptyFields(), name: latest.destinatario || latest.descricao, amount: latest.valor.toFixed(2).replace(".", ","), key: latest.metodo === "PIX" ? latest.identificador || "" : "" }); }} className="mt-3 min-h-9 text-xs text-[#c6b8fb]">Preparar instrução recorrente</button><Link href={`/dashboard/comprovante/${latest.id}`} className="ml-4 text-[10px] text-white/40">Ver lançamento ↗</Link></div>)}</div></>}
        </motion.div>}
      </AnimatePresence>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#f18c9b]/10 p-3 text-xs leading-5 text-[#f18c9b]">{error}</p>}{notice && <p role="status" className="mt-4 text-xs leading-5 text-[#94e5b4]">{notice}</p>}
      </div>}
    </Dialog>
  </div>;
}
