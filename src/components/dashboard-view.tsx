"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import CandlestickChartRoundedIcon from "@mui/icons-material/CandlestickChartRounded";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import QRCode from "qrcode";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { destinationError, destinationKey, parseBRL, splitBRL } from "@/lib/transfer";
import { estimatePortfolioDayChange } from "@/lib/market";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CallSplitRoundedIcon from "@mui/icons-material/CallSplitRounded";
import { ActivityExplorer } from "@/components/activity-explorer";
import { sendTransfer } from "@/app/actions/transactions";

import { CoinIcon } from "@/components/coin-icon";
import { CryptoMarket } from "@/components/crypto-market";
import { MemeRadar } from "@/components/meme-radar";
import { TradePanel } from "@/components/trade-panel";
import { useMarket } from "@/components/use-market";
import type { Transaction } from "@/types/transaction";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 5,
});
const profileStorageKey = "saldo-profile-photos-v1";
const defaultProfilePhoto = "/profile-architecture.jpg";

function AccountPortrait({ photo, initial, className }: { photo: string | null; initial: string; className: string }) {
  return <span className={"grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/[0.12] bg-[#24252a] font-semibold text-[#c5b8fa] " + className}>{photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}</span>;
}

type DashboardViewProps = {
  transactions: Transaction[];
  income: number;
  expenses: number;
  balance: number;
  demoMode: boolean;
};

type ModalKind = "receive" | "send" | "swap" | "buy" | null;
type DashboardTab = "tokens" | "memes" | "nfts" | "activity" | "insights";
type SendStep = "compose" | "review" | "processing" | "success";
type SendMethod = "PIX" | "Carteira";
type SavedContact = { name: string; destination: string; method: SendMethod; pinned: boolean };
type SendCategory = "Transferência" | "Alimentação" | "Moradia" | "Presente";

const sendCategories = [
  { id: "Transferência", label: "Transferência", icon: PaymentsRoundedIcon },
  { id: "Alimentação", label: "Alimentação", icon: RestaurantRoundedIcon },
  { id: "Moradia", label: "Moradia", icon: HomeRoundedIcon },
  { id: "Presente", label: "Presente", icon: CardGiftcardRoundedIcon },
] as const;


const accounts = [
  {
    id: "personal",
    handle: "Solana",
    label: "Conta 1",
    address: "DEMO-SOL-4VvX9NQGZB7rjBfM7K9yvV5SJ6xPkm3BR9U2mZ5wJ1eR",
    multiplier: 1,
    avatar: "1",
  },
  {
    id: "reserve",
    handle: "Reserva",
    label: "Conta 2",
    address: "DEMO-SOL-8Hb2vRrGQm3PyXQYkT6mU7fW9aN4jL2sE5xC1pV7dK3Z",
    multiplier: 0.62,
    avatar: "2",
  },
  {
    id: "travel",
    handle: "Viagem",
    label: "Conta 3",
    address: "DEMO-SOL-6Pa4kQ3vJ8mT2yW7sN5dF9rB1xL6cE4uH3zG7V2qM8aK",
    multiplier: 0.28,
    avatar: "3",
  },
] as const;

const quickActions = [
  { id: "receive", label: "Receber", icon: QrCode2RoundedIcon },
  { id: "send", label: "Enviar", icon: SendOutlinedIcon },
  { id: "swap", label: "Trade", icon: CandlestickChartRoundedIcon },
  { id: "buy", label: "Comprar", icon: PaidOutlinedIcon },
] as const;

const dashboardTabs = [
  { id: "tokens", label: "Tokens", icon: GridViewRoundedIcon },
  { id: "memes", label: "Explorar", icon: ExploreOutlinedIcon },
  { id: "nfts", label: "NFTs", icon: CollectionsRoundedIcon },
  { id: "activity", label: "Histórico", icon: HistoryRoundedIcon },
] as const;

const demoNfts = [
  {
    id: "neon-ape-042",
    name: "Neon Ape #042",
    collection: "Night District",
    floor: "2,84 SOL",
    background:
      "radial-gradient(circle at 28% 24%, rgba(104,223,157,.72), transparent 24%), radial-gradient(circle at 70% 68%, rgba(76,91,86,.9), transparent 34%), linear-gradient(145deg,#1c3028 0%,#101415 52%,#222427 100%)",
  },
  {
    id: "void-cat-118",
    name: "Void Cat #118",
    collection: "Soft Machines",
    floor: "1,31 SOL",
    background:
      "radial-gradient(circle at 74% 24%, rgba(214,216,220,.38), transparent 22%), radial-gradient(circle at 30% 72%, rgba(55,91,77,.92), transparent 36%), linear-gradient(145deg,#232628 0%,#121416 50%,#0d1713 100%)",
  },
  {
    id: "signal-007",
    name: "Signal #007",
    collection: "After Hours",
    floor: "0,92 SOL",
    background:
      "linear-gradient(135deg,rgba(112,224,160,.36) 0 12%,transparent 12% 28%,rgba(112,224,160,.12) 28% 42%,transparent 42%), linear-gradient(145deg,#101513,#25282a 58%,#151718)",
  },
  {
    id: "chrome-bloom-023",
    name: "Chrome Bloom #023",
    collection: "Still Life",
    floor: "3,08 SOL",
    background:
      "radial-gradient(circle at 50% 45%, rgba(231,233,235,.48), transparent 15%), radial-gradient(circle at 48% 48%, rgba(75,143,105,.52), transparent 33%), linear-gradient(150deg,#25282a,#101413 54%,#202224)",
  },
] as const;

const searchItems: { label: string; detail: string; keywords: string; target: "receive" | "send" | "swap" | DashboardTab }[] = [
  { label: "Receber por QR Code", detail: "Abrir endereço da carteira", keywords: "receber qr solana", target: "receive" },
  { label: "Enviar", detail: "Preparar uma transferência", keywords: "enviar transferencia", target: "send" },
  { label: "Trade", detail: "Comprar ou trocar SOL e USDC", keywords: "trade swap trocar sol usdc", target: "swap" },
  { label: "Tokens", detail: "Ver SOL e USDC", keywords: "tokens ativos solana usdc", target: "tokens" },
  { label: "Explorar Solana", detail: "Tokens em alta ao vivo", keywords: "memes memecoins axiom dexscreener radar explorar", target: "memes" },
  { label: "NFTs", detail: "Abrir colecionáveis", keywords: "nft colecao colecionaveis", target: "nfts" },
  { label: "Histórico", detail: "Ver pagamentos e recebimentos", keywords: "atividade historico transacoes pagamentos", target: "activity" },
  { label: "Minha conta", detail: "Endereço, QR e atalhos da carteira", keywords: "conta endereco qr carteira", target: "insights" },
  ...demoNfts.map((nft) => ({ label: nft.name, detail: nft.collection, keywords: "nft " + nft.name + " " + nft.collection, target: "nfts" as const })),
];

const ease = [0.22, 1, 0.36, 1] as const;

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(2) + "%";
}

function initialsFor(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "•";
}

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  busy = false,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  busy?: boolean;
}) {
  const id = useId();
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={id} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "26px", background: "#191c1e", color: "white", margin: "16px", width: "calc(100% - 32px)" } }, backdrop: { sx: { background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" } } }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id={id} className="text-lg font-semibold tracking-[-0.035em] text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-[#858f93]">{subtitle}</p></div>
          <button type="button" disabled={busy} onClick={onClose} aria-label={busy ? "Aguarde o registro" : "Fechar"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-[#aaaab0] transition hover:bg-white/[0.09] hover:text-white"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </Dialog>
  );
}

export function DashboardView({
  transactions,
  balance,
  demoMode,
}: DashboardViewProps) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] =
    useState<(typeof accounts)[number]["id"]>("personal");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const { markets, updatedAt, error: marketError } = useMarket("solana", "1d");
  const marketLoading = markets.length === 0;
  const [toast, setToast] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMethod, setSendMethod] = useState<SendMethod>("PIX");
  const [sendMessage, setSendMessage] = useState("");
  const [sendCategory, setSendCategory] = useState<SendCategory>("Transferência");
  const [sendStep, setSendStep] = useState<SendStep>("compose");
  const [sendProgress, setSendProgress] = useState(0);
  const [sendError, setSendError] = useState("");
  const [createdTransfer, setCreatedTransfer] = useState<Transaction | null>(null);
  const [duplicateTransfer, setDuplicateTransfer] = useState<Transaction | null>(null);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const sending = useRef(false);
  const requestId = useRef("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTotal, setSplitTotal] = useState("");
  const [splitPeople, setSplitPeople] = useState(2);
  const split = splitBRL(parseBRL(splitTotal), splitPeople);
  const [sendStartedAt, setSendStartedAt] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("tokens");
  const [balancesVisible, setBalancesVisible] = useState(true);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const account =
    accounts.find((item) => item.id === selectedAccountId) ?? accounts[0];
  const accountPhoto = profilePhotos[account.id] ?? (account.id === "personal" ? defaultProfilePhoto : null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(profileStorageKey) ?? "{}");
        if (saved && typeof saved === "object" && !Array.isArray(saved)) {
          setProfilePhotos(Object.fromEntries(Object.entries(saved).filter(([key, value]) =>
            accounts.some((item) => item.id === key) && typeof value === "string" && value.startsWith("data:image/jpeg;base64,") && value.length < 200_000,
          )));
        }
      } catch { /* The sample portrait remains visible when local storage is unavailable. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function changeProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8_000_000) {
      setToast("Escolha uma foto JPG, PNG ou WebP de até 8 MB.");
      return;
    }
    const selectedId = account.id;
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("invalid-image")); image.src = objectUrl; });
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas-unavailable");
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
      const encoded = canvas.toDataURL("image/jpeg", 0.8);
      const next = { ...profilePhotos, [selectedId]: encoded };
      setProfilePhotos(next);
      try { localStorage.setItem(profileStorageKey, JSON.stringify(next)); setToast("Foto atualizada neste navegador."); }
      catch { setToast("Foto atualizada só nesta sessão; armazenamento indisponível."); }
    } catch { setToast("Não foi possível abrir esta foto. Tente outro arquivo."); }
    finally { URL.revokeObjectURL(objectUrl); }
  }

  function restoreProfilePhoto() {
    const next = { ...profilePhotos };
    delete next[account.id];
    setProfilePhotos(next);
    try { localStorage.setItem(profileStorageKey, JSON.stringify(next)); } catch { /* Session-only fallback. */ }
    setToast("Foto padrão restaurada.");
  }

  const accountBalance = balance * account.multiplier;
  const sendNumericAmount = parseBRL(sendAmount);
  const postSendBalance = Math.max(accountBalance - sendNumericAmount, 0);
  const sendImpactPercent = Math.min(
    Math.max((sendNumericAmount / Math.max(accountBalance, 1)) * 100, 0),
    100,
  );
  const suggestedAmounts = [50, 100, 250, 500].filter((value) => value <= accountBalance);
  const sendHistory = useMemo(() => transactions.filter((transaction) =>
    transaction.tipo === "despesa" && transaction.identificador &&
    destinationKey(transaction.metodo || "", transaction.identificador) === destinationKey(sendMethod, sendAddress)
  ), [sendAddress, sendMethod, transactions]);
  const recentRecipients = useMemo(() => {
    const grouped = new Map<string, { name: string; destination: string; method: SendMethod; initials: string; historyCount: number }>();
    for (const transaction of transactions) {
      if (transaction.tipo !== "despesa" || (transaction.metodo !== "PIX" && transaction.metodo !== "Carteira") || !transaction.destinatario || !transaction.identificador) continue;
      const method = transaction.metodo === "Carteira" ? "Carteira" : "PIX";
      const key = destinationKey(method, transaction.identificador);
      const existing = grouped.get(key);
      if (existing) existing.historyCount++;
      else grouped.set(key, { name: transaction.destinatario, destination: transaction.identificador, method, initials: initialsFor(transaction.destinatario), historyCount: 1 });
    }
    return [...grouped.values()].sort((a,b) => Number(favorites.includes(destinationKey(b.method,b.destination))) - Number(favorites.includes(destinationKey(a.method,a.destination)))).slice(0,6);
  }, [transactions, favorites]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const value: unknown = JSON.parse(localStorage.getItem("saldo-favorite-destinations") || "[]");
        if (Array.isArray(value)) setFavorites(value.filter((item): item is string => typeof item === "string"));
      } catch { /* A blocked browser store does not prevent sending. */ }
      try {
        const value: unknown = JSON.parse(localStorage.getItem("saldo-saved-contacts-v1") || "[]");
        if (Array.isArray(value)) setSavedContacts(value.filter((item): item is SavedContact => Boolean(item && typeof item === "object" && typeof item.name === "string" && typeof item.destination === "string" && (item.method === "PIX" || item.method === "Carteira"))).slice(0, 30));
      } catch { /* Contacts remain available for this session. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleFavorite() {
    const key = destinationKey(sendMethod, sendAddress);
    const next = favorites.includes(key) ? favorites.filter((item) => item !== key) : [...favorites, key];
    setFavorites(next);
    try { localStorage.setItem("saldo-favorite-destinations", JSON.stringify(next)); }
    catch { setToast("Favorito mantido apenas nesta sessão."); }
  }

  function updateSavedContacts(next: SavedContact[]) {
    setSavedContacts(next);
    try { localStorage.setItem("saldo-saved-contacts-v1", JSON.stringify(next)); }
    catch { setToast("Contatos mantidos apenas nesta sessão."); }
  }

  function saveCurrentContact() {
    const name = sendRecipient.trim();
    const destination = sendAddress.trim();
    if (!name || destinationError(sendMethod, destination)) {
      setSendError("Preencha um nome e um destino válido antes de salvar o contato.");
      return;
    }
    const key = destinationKey(sendMethod, destination);
    const next = [{ name, destination, method: sendMethod, pinned: true }, ...savedContacts.filter((contact) => destinationKey(contact.method, contact.destination) !== key)].slice(0, 30);
    updateSavedContacts(next);
    setToast("Contato favorito salvo neste navegador.");
  }

  function toggleContactPin(contact: SavedContact) {
    updateSavedContacts(savedContacts.map((item) => destinationKey(item.method, item.destination) === destinationKey(contact.method, contact.destination) ? { ...item, pinned: !item.pinned } : item));
  }

  function removeContact(contact: SavedContact) {
    updateSavedContacts(savedContacts.filter((item) => destinationKey(item.method, item.destination) !== destinationKey(contact.method, contact.destination)));
  }

  const solana = markets.find((coin) => coin.id === "solana");
  const usdc = markets.find((coin) => coin.id === "usd-coin");
  const positivePortfolio = Math.max(accountBalance, 0);
  const solValue = positivePortfolio * 0.52;
  const usdcValue = positivePortfolio * 0.48;
  const hasPortfolioQuote = Boolean(!marketError && solana?.current_price && usdc?.current_price);
  const performance = hasPortfolioQuote ? estimatePortfolioDayChange([
    { value: solValue, changePercent: solana?.price_change_percentage_24h ?? 0 },
    { value: usdcValue, changePercent: usdc?.price_change_percentage_24h ?? 0 },
  ]) : null;
  const portfolioGain = performance?.amount ?? 0;
  const gainPercent = performance?.percent ?? 0;
  const positive = performance !== null && portfolioGain > 0;
  const negative = performance !== null && portfolioGain < 0;
  const solQuantity =
    solana?.current_price && solana.current_price > 0 ? solValue / solana.current_price : 0;
  const usdcQuantity =
    usdc?.current_price && usdc.current_price > 0 ? usdcValue / usdc.current_price : 0;

  const positiveBalanceBackground = "radial-gradient(ellipse 66% 62% at 50% 40%, rgba(23,113,65,0.67) 0%, rgba(18,71,45,0.34) 43%, rgba(6,7,8,0) 82%)";
  const negativeBalanceBackground = "radial-gradient(ellipse 66% 62% at 50% 40%, rgba(130,39,53,0.45) 0%, rgba(75,30,42,0.25) 43%, rgba(6,7,8,0) 82%)";

  const assets = [
      {
        id: "solana",
        name: "Solana",
        symbol: "SOL",
        quantity: solQuantity,
        value: solValue,
        change: solana?.price_change_percentage_24h ?? 0,
        image: solana?.image ?? "",
      },
      {
        id: "usd-coin",
        name: "USDC",
        symbol: "USDC",
        quantity: usdcQuantity,
        value: usdcValue,
        change: usdc?.price_change_percentage_24h ?? 0,
        image: usdc?.image ?? "",
      },
    ];

  useEffect(() => {
    let alive = true;

    async function makeQr() {
      try {
        const dataUrl = await QRCode.toDataURL("solana:" + account.address, {
          width: 420,
          margin: 1,
          color: { dark: "#0b0a0f", light: "#ffffff" },
        });
        if (alive) setQrDataUrl(dataUrl);
      } catch {
        if (alive) setQrDataUrl("");
      }
    }

    void makeQr();

    return () => {
      alive = false;
    };
  }, [account.address]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === "Escape") setSearchOpen(false);
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  function openAction(action: (typeof quickActions)[number]["id"]) {
    if (action === "send") {
      if (sendStep === "success") resetSend();
      requestId.current = crypto.randomUUID();
      setSendStep("compose");
      setSendError("");
      setCreatedTransfer(null);
    }
    setModal(action);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(account.address);
      setToast("Endereço copiado.");
    } catch {
      setToast("Não foi possível copiar automaticamente.");
    }
  }

  function resetSend() {
    requestId.current = crypto.randomUUID();
    setSplitOpen(false);
    setSplitTotal("");
    setSendRecipient("");
    setSendAddress("");
    setSendAmount("");
    setSendMethod("PIX");
    setSendMessage("");
    setSendCategory("Transferência");
    setSendError("");
    setCreatedTransfer(null);
    setDuplicateTransfer(null);
    setDuplicateAcknowledged(false);
    setSendProgress(0);
    setSendStep("compose");
  }

  function reviewSend() {
    const amount = parseBRL(sendAmount);
    if (sendRecipient.trim().length < 2) {
      setSendError("Informe quem vai receber.");
      return;
    }
    const invalidDestination = destinationError(sendMethod, sendAddress);
    if (invalidDestination) {
      setSendError(invalidDestination);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSendError("Informe um valor maior que zero.");
      return;
    }
    if (amount > accountBalance) {
      setSendError("Saldo insuficiente para essa transferência.");
      return;
    }
    const cutoff = Date.now() - 10 * 60 * 1000;
    const possibleDuplicate =
      sendHistory.find(
        (transaction) =>
          Math.abs(transaction.valor - amount) < 0.005 &&
          new Date(transaction.criado_em).getTime() >= cutoff,
      ) ?? null;
    setDuplicateTransfer(possibleDuplicate);
    setDuplicateAcknowledged(false);
    setSendError("");
    setSendStep("review");
  }

  async function confirmSend() {
    const amount = parseBRL(sendAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (duplicateTransfer && !duplicateAcknowledged) {
      setSendError("Confirme que você reconhece a possível transferência duplicada antes de continuar.");
      return;
    }

    if (sending.current) return;
    sending.current = true;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setSendStep("processing");
    setSendError("");
    setSendStartedAt(Date.now());
    setSendProgress(1);
    const visualStartedAt = Date.now();
    const secondStage = window.setTimeout(() => setSendProgress(2), 480);
    try {
      const result = await new Promise<Awaited<ReturnType<typeof sendTransfer>>>((resolve, reject) => {
        startTransition(async () => {
          try { resolve(await sendTransfer({
            requestId: requestId.current, recipient: sendRecipient, destination: sendAddress,
            amount, method: sendMethod, message: sendMessage, category: sendCategory,
          })); } catch (error) { reject(error); }
        });
      });
      if (!result.ok) { setSendError(result.error); setSendStep("review"); return; }
      const remaining = Math.max(0, 1250 - (Date.now() - visualStartedAt));
      if (remaining) await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
      setSendProgress(3);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 430));
      setCreatedTransfer(result.transaction);
      setSendStep("success");
      router.refresh();
    } catch {
      setSendError("Não foi possível confirmar a resposta. Tente novamente: o mesmo identificador evita registrar este envio duas vezes.");
      setSendStep("review");
    } finally { window.clearTimeout(secondStage); sending.current = false; }
  }

  async function copyTransferCode() {
    if (!createdTransfer) return;
    const code = `SLD-${createdTransfer.id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    try {
      await navigator.clipboard.writeText(code);
      setToast("Código do comprovante copiado.");
    } catch {
      setToast("Não foi possível copiar o código.");
    }
  }

  async function shareTransfer() {
    if (!createdTransfer) return;
    const url = `${window.location.origin}/dashboard/comprovante/${createdTransfer.id}`;
    const code = `SLD-${createdTransfer.id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Comprovante de transferência",
          text: `${code} · ${currency.format(createdTransfer.valor)} para ${createdTransfer.destinatario || sendRecipient}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast("Link do comprovante copiado.");
    } catch {
      setToast("Compartilhamento cancelado.");
    }
  }

  function finishSend() {
    setModal(null);
    setDashboardTab("activity");
    setToast("Transferência salva no histórico.");

  }


  function selectTab(tab: DashboardTab) {
    setDashboardTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById("wallet-content")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
    });
  }

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredSearchItems = normalizedSearch
    ? searchItems.filter((item) =>
        (item.label + " " + item.detail + " " + item.keywords)
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch),
      )
    : searchItems.slice(0, 7);

  const gainClass = positive
    ? "text-[#45e28b]"
    : negative
      ? "text-[#ff6879]"
      : "text-white/45";

  const gainPillClass = positive
    ? "bg-[#35d87c]/15 text-[#45e28b]"
    : negative
      ? "bg-[#ff6577]/12 text-[#ff7383]"
      : "bg-white/[0.055] text-white/45";

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen overflow-hidden bg-[#060708] text-white">
      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void changeProfilePhoto(event)} className="sr-only" tabIndex={-1} aria-label="Selecionar foto de perfil" />

      <main className="relative mx-auto w-full max-w-[760px] px-4 pb-24 pt-5 sm:px-7 sm:pt-7 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, ease }}
          className="relative z-30 flex items-center justify-between gap-3"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-2xl p-1 pr-2 text-left transition hover:bg-white/[0.04]"
            >
              <AccountPortrait photo={accountPhoto} initial={account.avatar} className="h-11 w-11 text-sm" />
              <span>
                <span className="block text-[10px] font-medium text-white/45">{account.handle}</span>
                <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold tracking-[-0.02em] text-[#f4f4f5]">
                  {account.label}
                  <KeyboardArrowDownRoundedIcon
                    sx={{
                      fontSize: 18,
                      transform: accountMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform .2s ease",
                    }}
                  />
                </span>
              </span>
            </button>

            <AnimatePresence>
              {accountMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.2, ease }}
                  className="absolute left-0 top-[58px] z-50 w-[260px] rounded-[22px] border border-white/[0.08] bg-[#1b1c1f]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                >
                  {accounts.map((item) => {
                    const selected = item.id === account.id;
                    const rowClass = selected
                      ? "bg-white/[0.07]"
                      : "hover:bg-white/[0.045]";

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(item.id);
                          setAccountMenuOpen(false);
                        }}
                        className={"flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition " + rowClass}
                      >
                        <AccountPortrait photo={profilePhotos[item.id] ?? (item.id === "personal" ? defaultProfilePhoto : null)} initial={item.avatar} className="h-9 w-9 text-xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-white">{item.label}</span>
                          <span className="mt-0.5 block text-[10px] text-white/40">{item.handle}</span>
                        </span>
                        {selected && (
                          <CheckCircleRoundedIcon
                            sx={{ fontSize: 17 }}
                            className="text-[#67df9c]"
                          />
                        )}
                      </button>
                    );
                  })}

                  <div className="my-2 h-px bg-white/[0.06]" />

                  <button type="button" onClick={() => { setAccountMenuOpen(false); photoInputRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-xs font-semibold text-[#aaaab0] transition hover:bg-white/[0.045] hover:text-white"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.045]"><AddAPhotoOutlinedIcon sx={{ fontSize: 17 }} /></span>Alterar foto</button>
                  <button type="button" onClick={() => { setAccountMenuOpen(false); selectTab("insights"); }} className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-xs font-semibold text-[#aaaab0] transition hover:bg-white/[0.045] hover:text-white"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.045]"><PersonRoundedIcon sx={{ fontSize: 17 }} /></span>Detalhes da conta</button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      window.dispatchEvent(new Event("saldo:lock"));
                    }}
                    className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-xs font-semibold text-[#aaaab0] transition hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.045]">
                      <LockRoundedIcon sx={{ fontSize: 17 }} />
                    </span>
                    Bloquear carteira
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5">
            {demoMode && (
              <span className="hidden rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 sm:inline-flex">
                demo
              </span>
            )}
            <button
              type="button"
              onClick={() => setModal("receive")}
              aria-label="Abrir QR Code"
              className="grid h-10 w-10 place-items-center rounded-full text-[#d8d8db] transition hover:bg-white/[0.055]"
            >
              <QrCodeScannerRoundedIcon sx={{ fontSize: 23 }} />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar na carteira"
              className="grid h-10 w-10 place-items-center rounded-full text-[#d8d8db] transition hover:bg-white/[0.055]"
            >
              <SearchRoundedIcon sx={{ fontSize: 25 }} />
            </button>
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.7, ease }}
          className="relative isolate mt-7 px-1 pb-8 pt-10 text-center sm:mt-9 sm:pb-9 sm:pt-12"
        >
          <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-110px] h-[430px] w-[160vw] max-w-[1300px] -translate-x-1/2 sm:top-[-145px] sm:h-[490px]" style={{ backgroundImage: positiveBalanceBackground }} initial={false} animate={{ opacity: positive ? 1 : 0 }} transition={{ duration: 0.9, ease }} />
          <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-110px] h-[430px] w-[160vw] max-w-[1300px] -translate-x-1/2 sm:top-[-145px] sm:h-[490px]" style={{ backgroundImage: negativeBalanceBackground }} initial={false} animate={{ opacity: negative ? 1 : 0 }} transition={{ duration: 0.9, ease }} />
          <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/46">
            Saldo total
          </p>
          <div className="mt-3 flex items-center justify-center gap-2.5">
            <motion.h1
              key={account.id + String(balancesVisible)}
              initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.38, ease }}
              className={(currency.format(accountBalance).length > 15 ? "text-[clamp(1.9rem,7vw,4.1rem)]" : currency.format(accountBalance).length > 12 ? "text-[clamp(2.3rem,8vw,4.8rem)]" : "text-[clamp(3.15rem,10vw,5.4rem)]") + " min-w-0 font-semibold leading-none tracking-[-0.075em] text-[#fafafa]"}
            >
              {balancesVisible ? currency.format(accountBalance) : "••••••"}
            </motion.h1>
            <button
              type="button"
              onClick={() => setBalancesVisible((visible) => !visible)}
              aria-label={balancesVisible ? "Ocultar valores" : "Mostrar valores"}
              className="mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/35 transition duration-200 hover:bg-white/[0.07] hover:text-white/75 active:scale-90"
            >
              {balancesVisible ? (
                <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold tabular-nums">
            <motion.span key={performance ? gainPercent.toFixed(2) : "loading"} initial={{ opacity: 0.45, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease }} className={gainClass}>
              {!performance ? marketError ? "Cotação indisponível" : "Atualizando" : balancesVisible ? (portfolioGain > 0 ? "+" : "") + currency.format(portfolioGain) : "••••"}
            </motion.span>
            <span className={"rounded-md px-2 py-1 text-xs " + gainPillClass}>
              {performance ? formatPercent(gainPercent) : "—"}
            </span>
          </div>
          <button type="button" disabled={!performance} onClick={() => setPerformanceOpen((open) => !open)} aria-expanded={performanceOpen && !!performance} aria-controls="balance-performance-details" className="mx-auto mt-2 flex min-h-8 items-center justify-center gap-1 rounded-full px-2.5 text-[10px] font-medium text-white/42 transition-colors hover:bg-white/[0.045] hover:text-white/72 disabled:cursor-default disabled:hover:bg-transparent">
            Variação estimada · 24h
            <KeyboardArrowDownRoundedIcon sx={{ fontSize: 15, transform: performanceOpen && performance ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s ease" }} />
          </button>
          <AnimatePresence initial={false}>
            {performanceOpen && performance && (
              <motion.div id="balance-performance-details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} className="mx-auto max-w-[310px] overflow-hidden text-left">
                <div className="mt-4 border-t border-white/[0.09] pt-3">
                  <p className="mb-3 text-[10px] text-white/42">Composição estimada da carteira</p>
                  <div className="flex items-center justify-between py-1.5 text-[11px]"><span className="text-white/65">Solana <span className="text-white/35">· 52%</span></span><span className={solana && solana.price_change_percentage_24h >= 0 ? "text-[#53db91]" : "text-[#ff8190]"}>{formatPercent(solana?.price_change_percentage_24h ?? 0)}</span></div>
                  <div className="flex items-center justify-between py-1.5 text-[11px]"><span className="text-white/65">USDC <span className="text-white/35">· 48%</span></span><span className={usdc && usdc.price_change_percentage_24h >= 0 ? "text-[#53db91]" : "text-[#ff8190]"}>{formatPercent(usdc?.price_change_percentage_24h ?? 0)}</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.56, ease }}
          className="mt-3 grid grid-cols-4 gap-2 sm:gap-3"
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.21 + index * 0.065, duration: 0.5, ease }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openAction(action.id)}
                className="group flex min-h-[90px] min-w-0 flex-col items-center justify-center gap-2 rounded-[18px] border border-white/[0.04] bg-[#17181b] px-1 transition-colors hover:border-white/[0.1] hover:bg-[#202125] sm:min-h-[102px]"
              >
                <Icon
                  sx={{ fontSize: { xs: 24, sm: 27 } }}
                  className="text-[#b9aaf5] transition-transform duration-300 group-hover:scale-110"
                />
                <span className="text-[10px] font-semibold text-[#c9cacc] sm:text-[11px]">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </motion.section>


        <motion.nav
          id="wallet-content"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.58, ease }}
          className="mt-6 grid grid-cols-4 gap-1 rounded-[18px] border border-white/[0.045] bg-[#101113] p-1.5"
        >
          {dashboardTabs.map((tab) => {
            const Icon = tab.icon;
            const active = dashboardTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                aria-pressed={active}
                className={
                  "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-[13px] px-1 text-[10px] font-semibold transition sm:min-h-11 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-[11px] " +
                  (active ? "text-white" : "text-white/36 hover:text-white/70")
                }
              >
                {active && (
                  <motion.span
                    layoutId="dashboard-tab"
                    className="absolute inset-0 rounded-[13px] bg-[#242529] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]"
                    transition={{ duration: 0.28, ease }}
                  />
                )}
                <Icon sx={{ fontSize: 17 }} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </motion.nav>

        <AnimatePresence mode="wait" initial={false}>
          {dashboardTab === "tokens" && (
            <motion.section
              key="tokens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease }}
              className="mt-5 space-y-2"
            >
              <div className="flex items-center justify-between px-1 pb-1">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Ativos</h2>
                  <p className="mt-1 text-[10px] text-white/35">Solana e USDC · carteira demonstrativa</p>
                </div>
                <Link href="/dashboard/crypto" className="text-[11px] font-semibold text-[#9b9da1] transition hover:text-[#e0e1e3]">
                  Mercado
                </Link>
              </div>

              {assets.map((asset, index) => {
                const changePositive = asset.change >= 0;
                const changeClass = changePositive ? "text-[#45e28b]" : "text-[#ff6e7f]";
                const dayChange = asset.change > -100 ? asset.value * asset.change / (100 + asset.change) : 0;

                return (
                  <motion.div key={asset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.055, duration: 0.36, ease }}>
                    <Link href={"/dashboard/crypto?coin=" + asset.id} className="flex min-h-[68px] min-w-0 items-center gap-3 rounded-[18px] border border-white/[0.045] bg-[#121315] px-3.5 py-2.5 transition hover:border-white/[0.09] hover:bg-[#1d1e21] active:scale-[0.99] sm:px-4">
                      <CoinIcon id={asset.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold tracking-[-0.025em] text-[#f2f3f4]">{asset.name}</p>
                        <p className="mt-0.5 truncate text-[10px] font-medium text-[#87898e]">{!balancesVisible ? "•••• " + asset.symbol : marketLoading ? "Atualizando…" : number.format(asset.quantity) + " " + asset.symbol}</p>
                      </div>
                      <div className="max-w-[46%] shrink-0 text-right">
                        <p className="text-[14px] font-semibold tracking-[-0.025em] text-[#f2f3f4]">{balancesVisible ? currency.format(asset.value) : "••••"}</p>
                        <p aria-label={marketLoading ? "Cotação em atualização" : `Variação em 24 horas: ${formatPercent(asset.change)}`} className={"mt-0.5 text-[10px] font-semibold tabular-nums " + changeClass}>{marketLoading ? "—" : balancesVisible ? (dayChange > 0 ? "+" : "") + currency.format(dayChange) : "••••"}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              <div className="pt-5"><MemeRadar compact /></div>
              {transactions[0] && <Link href={"/dashboard/comprovante/" + transactions[0].id} className="mt-5 flex min-w-0 items-center gap-2.5 border-t border-white/[0.065] px-1 py-4 text-[11px] transition hover:text-white"><ReceiptLongRoundedIcon sx={{ fontSize: 18 }} className="shrink-0 text-[#a79cbc]" /><span className="min-w-0 flex-1 truncate text-white/47">Última atividade · {transactions[0].destinatario || transactions[0].descricao}</span><span className="shrink-0 text-white/42">Ver recibo ↗</span></Link>}
              <CryptoMarket embedded />
            </motion.section>
          )}

          {dashboardTab === "memes" && (
            <motion.section key="memes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }} className="mt-5">
              <MemeRadar compact />
              <Link href="/dashboard/memes" className="mt-3 flex h-10 items-center justify-center gap-1 rounded-xl border border-white/[0.055] bg-[#17181a] text-[11px] font-semibold text-[#c8c9ce] transition hover:bg-[#25262a]">Ver todos os tokens <ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} /></Link>
            </motion.section>
          )}

          {dashboardTab === "nfts" && (
            <motion.section key="nfts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }} className="mt-5">
              <div className="flex items-end justify-between px-1 pb-3">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/32">Colecionáveis</h2>
                  <p className="mt-1 text-[10px] text-white/24">4 NFTs demonstrativos nesta conta</p>
                </div>
                <span className="rounded-full bg-[#b9aaf5]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#b9aaf5]">Demo</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {demoNfts.map((nft, index) => (
                  <motion.button
                    key={nft.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.055, duration: 0.38, ease }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setToast(nft.name + " · visualização demonstrativa")}
                    className="group overflow-hidden rounded-[20px] border border-white/[0.045] bg-[#151618] text-left transition hover:border-white/[0.09]"
                  >
                    <div className="relative aspect-square overflow-hidden" style={{ backgroundImage: nft.background }}>
                      <div className="absolute left-[18%] top-[18%] h-[42%] w-[42%] rounded-full border border-white/10 bg-white/[0.035] backdrop-blur-[2px] transition duration-500 group-hover:scale-110" />
                      <div className="absolute bottom-[14%] right-[12%] h-[32%] w-[32%] rotate-12 rounded-[28%] border border-white/[0.07] bg-black/20 transition duration-500 group-hover:-rotate-3" />
                      <span className="absolute right-2.5 top-2.5 rounded-full border border-white/[0.07] bg-black/30 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white/55 backdrop-blur-md">NFT</span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-[12px] font-semibold tracking-[-0.015em] text-[#eff0f1]">{nft.name}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-[9px] text-[#77797e]">{nft.collection}</p>
                        <p className="shrink-0 text-[9px] font-semibold text-[#aeb0b4]">{nft.floor}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {dashboardTab === "activity" && (
            <motion.section key="activity" id="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }} className="mt-5">
              <div className="flex items-end justify-between px-1 pb-3">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/32">Atividade</h2>
                  <p className="mt-1 text-[10px] text-white/24">Pagamentos e recebimentos com comprovante</p>
                </div>
                <Link href="/dashboard/nova-transacao" className="rounded-full bg-white/[0.045] px-3 py-1.5 text-[10px] font-semibold text-[#a9abae] transition hover:bg-white/[0.075] hover:text-white">Adicionar</Link>
              </div>
              <ActivityExplorer transactions={transactions} />
            </motion.section>
          )}

          {dashboardTab === "insights" && (
            <motion.section key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }} className="mt-5">
              <div className="flex items-center justify-between gap-3 px-1 pb-5"><div className="flex items-center gap-3"><AccountPortrait photo={accountPhoto} initial={account.avatar} className="h-14 w-14 text-lg" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">CARTEIRA</p><h2 className="mt-1 text-[19px] font-semibold tracking-[-0.04em] text-white">{account.label}</h2><p className="mt-0.5 text-[10px] text-[#b9aaf5]">Solana · demo</p></div></div><button type="button" onClick={() => photoInputRef.current?.click()} aria-label="Alterar foto de perfil" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.06] bg-[#17181b] text-white/65 transition hover:bg-[#24252a]"><AddAPhotoOutlinedIcon sx={{ fontSize: 18 }} /></button></div>
              <div className="rounded-[19px] border border-white/[0.045] bg-[#121315] px-4 py-5 sm:px-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/36">Endereço da conta</p>
                <p className="mt-3 break-all font-mono text-[12px] leading-6 text-white/80">{account.address}</p>
                <div className="mt-5 flex gap-2"><button type="button" onClick={copyAddress} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25252b] px-3.5 text-[11px] font-semibold text-white/80 transition hover:bg-[#303037]"><ContentCopyRoundedIcon sx={{ fontSize: 16 }} />Copiar</button><button type="button" onClick={() => setModal("receive")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25252b] px-3.5 text-[11px] font-semibold text-white/80 transition hover:bg-[#303037]"><QrCodeScannerRoundedIcon sx={{ fontSize: 16 }} />Ver QR</button></div>
              </div>
              <p className="mt-3 px-1 text-[10px] leading-5 text-white/35">Endereço de demonstração. Esta conta não assina transações na rede Solana.</p>
              {profilePhotos[account.id] && <button type="button" onClick={restoreProfilePhoto} className="mt-2 px-1 text-[10px] font-medium text-white/45 underline underline-offset-4 transition hover:text-white">Restaurar foto padrão</button>}
              <div className="mt-8 border-t border-white/[0.07]"><button type="button" onClick={() => selectTab("activity")} className="flex min-h-14 w-full items-center justify-between border-b border-white/[0.07] px-1 text-left text-[12px] font-medium text-white/72 transition hover:text-white"><span className="flex items-center gap-3"><HistoryRoundedIcon sx={{ fontSize: 18 }} className="text-[#b9aaf5]" />Histórico da carteira</span><ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} /></button><Link href="/dashboard/cartao" className="flex min-h-14 items-center justify-between border-b border-white/[0.07] px-1 text-[12px] font-medium text-white/72 transition hover:text-white"><span className="flex items-center gap-3"><CreditCardOutlinedIcon sx={{ fontSize: 18 }} className="text-[#b9aaf5]" />Cartão virtual</span><ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} /></Link></div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-start justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-md sm:pt-[16vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setSearchOpen(false);
            }}
          >
            <motion.div initial={{ opacity: 0, y: -12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.99 }} transition={{ duration: 0.24, ease }} className="w-full max-w-[560px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#1b1d1f]/98 shadow-[0_30px_100px_rgba(0,0,0,.65)]">
              <div className="flex h-14 items-center gap-3 border-b border-white/[0.06] px-4">
                <SearchRoundedIcon sx={{ fontSize: 21 }} className="text-white/35" />
                <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar ações, tokens ou NFTs" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/24" />
                <button type="button" onClick={() => setSearchOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-white/30 transition hover:bg-white/[0.06] hover:text-white"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button>
              </div>
              <div className="max-h-[430px] overflow-y-auto p-2">
                {filteredSearchItems.length > 0 ? filteredSearchItems.map((item, index) => (
                  <button
                    key={item.label + index}
                    type="button"
                    onClick={() => {
                      if (item.target === "send") openAction("send");
                      else if (item.target === "receive" || item.target === "swap") setModal(item.target);
                      else selectTab(item.target);
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex w-full items-center gap-3 rounded-[15px] px-3 py-3 text-left transition hover:bg-white/[0.055]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.045] text-white/55"><SearchRoundedIcon sx={{ fontSize: 17 }} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[#e6e7e8]">{item.label}</span><span className="mt-0.5 block truncate text-[9px] text-[#74767a]">{item.detail}</span></span>
                    <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} className="text-white/18" />
                  </button>
                )) : <div className="grid min-h-28 place-items-center px-4 text-center"><p className="text-xs text-white/35">Nada encontrado para “{searchQuery}”.</p></div>}
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/22"><span>Spotlight</span><span>Esc para fechar</span></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 12, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-[100] flex max-w-[calc(100%-32px)] items-center gap-2 rounded-full border border-white/[0.08] bg-[#242529]/95 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_18px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl"
          >
            <CheckCircleRoundedIcon sx={{ fontSize: 17 }} className="shrink-0 text-[#67df9c]" />
            <span className="truncate">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalShell
        open={modal === "receive"}
        title="Receber"
        subtitle={"Mostre o QR ou compartilhe o endereço da conta " + account.label + "."}
        onClose={() => setModal(null)}
      >
        <div className="rounded-[24px] bg-white p-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code da carteira" className="mx-auto aspect-square w-full" />
          ) : (
            <div className="grid aspect-square place-items-center text-sm font-semibold text-black/45">
              Gerando QR…
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">Endereço demonstrativo</p>
          <p className="mt-2 break-all text-xs leading-5 text-[#c7c7cb]">{account.address}</p>
        </div>

        <button
          type="button"
          onClick={copyAddress}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#eceeef] text-sm font-bold text-[#17191b] transition hover:bg-white active:scale-[0.99]"
        >
          <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
          Copiar endereço
        </button>

        <p className="mt-3 text-center text-[10px] leading-4 text-white/30">
          Endereço demonstrativo para a interface. Não envie fundos reais para ele.
        </p>
      </ModalShell>

      <ModalShell
        open={modal === "send"}
        busy={sendStep === "processing"}
        title={sendStep === "success" ? "Envio registrado" : sendStep === "processing" ? "Registrando" : sendStep === "review" ? "Revise o envio" : "Enviar dinheiro"}
        subtitle={sendStep === "success" ? "Histórico atualizado. Seu comprovante está disponível." : sendStep === "processing" ? "Aguarde a confirmação do registro." : "Simulação acadêmica. Registra a saída no app, sem enviar PIX ou cripto reais."}
        onClose={() => {
          if (sendStep === "processing") return;
          if (sendStep === "success") finishSend();
          else setModal(null);
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {sendStep === "compose" && (
            <motion.div key="compose" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.22, ease }}>
              <div className="mb-5 flex items-center gap-1.5">
                {[0, 1, 2].map((step) => <span key={step} className={`h-1 flex-1 rounded-full ${step === 0 ? "bg-[#67df9c]" : "bg-white/[0.07]"}`} />)}
              </div>

              {recentRecipients.length > 0 && <div className="mb-5">
                <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Recentes</span><span className="text-[9px] text-white/22">toque para preencher</span></div>
                <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                  {recentRecipients.map((recipient) => (
                    <button key={destinationKey(recipient.method,recipient.destination)} type="button" onClick={() => { setSendRecipient(recipient.name); setSendAddress(recipient.destination); setSendMethod(recipient.method); setSendError(""); }} className="group min-w-[112px] rounded-[16px] border border-white/[0.055] bg-white/[0.035] p-2.5 text-left transition hover:bg-white/[0.065]">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#2d3032] text-[10px] font-bold text-[#e4e5e7] ring-1 ring-inset ring-white/[0.05]">{favorites.includes(destinationKey(recipient.method,recipient.destination)) ? <StarRoundedIcon sx={{ fontSize: 16 }} /> : recipient.initials}</span>
                      <span className="mt-2 block truncate text-[10px] font-semibold text-[#d9dade]">{recipient.name}</span>
                      <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[0.08em] text-white/25">{recipient.method}{"historyCount" in recipient ? ` · ${recipient.historyCount}x` : ""}</span>
                    </button>
                  ))}
                </div>
              </div>}

              <div className="grid grid-cols-2 gap-2 rounded-[15px] bg-black/20 p-1">
                {(["PIX", "Carteira"] as SendMethod[]).map((method) => (
                  <button key={method} type="button" onClick={() => { setSendMethod(method); setSendAddress(""); setSendError(""); }} className={`rounded-[12px] px-3 py-2.5 text-[10px] font-bold transition ${sendMethod === method ? "bg-white/[0.09] text-white shadow-[0_4px_16px_rgba(0,0,0,.2)]" : "text-white/35 hover:text-white/65"}`}>{method}</button>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Como classificar</span>
                  <span className="text-[9px] text-white/22">aparece no histórico</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {sendCategories.map((category) => {
                    const Icon = category.icon;
                    const active = sendCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSendCategory(category.id)}
                        className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[14px] border px-1.5 text-center transition ${active ? "border-[#67df9c]/20 bg-[#67df9c]/[0.08] text-[#8be8b2]" : "border-white/[0.05] bg-white/[0.025] text-white/35 hover:bg-white/[0.05] hover:text-white/60"}`}
                      >
                        <Icon sx={{ fontSize: 17 }} />
                        <span className="max-w-full truncate text-[8px] font-semibold">{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Quem recebe</span>
                <div className="mt-2 flex h-12 items-center gap-2 rounded-[16px] border border-white/[0.07] bg-white/[0.04] px-3.5 focus-within:border-white/20 focus-within:bg-white/[0.055]">
                  <PersonRoundedIcon sx={{ fontSize: 18 }} className="text-white/24" />
                  <input maxLength={80} value={sendRecipient} onChange={(event) => { setSendRecipient(event.target.value); setSendError(""); }} placeholder="Nome da pessoa ou empresa" className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
                </div>
              </label>

              <label className="mt-3 block">
                <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">{sendMethod === "PIX" ? "Chave PIX" : "Endereço da carteira"}</span>
                <input maxLength={180} value={sendAddress} onChange={(event) => { setSendAddress(event.target.value); setSendError(""); }} placeholder={sendMethod === "PIX" ? "CPF, e-mail, telefone ou chave aleatória" : "Cole o endereço da carteira"} className="mt-2 h-12 w-full rounded-[16px] border border-white/[0.07] bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.055]" />
              </label>

              <div className="mt-3 border-b border-white/[0.055] pb-3">
                <button type="button" aria-expanded={contactsOpen} onClick={() => setContactsOpen(!contactsOpen)} className="flex min-h-10 w-full items-center gap-2 text-left text-[11px] font-semibold text-[#c7c3db]"><ContactsOutlinedIcon sx={{ fontSize: 18 }} />Contatos salvos <span className="ml-auto text-[10px] font-normal text-white/34">{savedContacts.length} neste aparelho</span><KeyboardArrowDownRoundedIcon sx={{ fontSize: 17, transform: contactsOpen ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} /></button>
                <AnimatePresence initial={false}>{contactsOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="space-y-2 pt-2">
                  {[...savedContacts].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((contact) => <div key={destinationKey(contact.method, contact.destination)} className="flex min-w-0 items-center gap-2 rounded-[13px] bg-[#18191c] p-2">
                    <button type="button" onClick={() => { setSendRecipient(contact.name); setSendAddress(contact.destination); setSendMethod(contact.method); setSendError(""); }} className="flex min-w-0 flex-1 items-center gap-2 text-left"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#303037] text-[10px] font-semibold text-white/75">{initialsFor(contact.name)}</span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-white/75">{contact.name}</span><span className="block truncate text-[9px] text-white/35">{contact.method} · {contact.destination}</span></span></button>
                    <button type="button" onClick={() => toggleContactPin(contact)} aria-label={(contact.pinned ? "Desafixar " : "Fixar ") + contact.name} className={"grid h-8 w-8 shrink-0 place-items-center rounded-full " + (contact.pinned ? "text-[#d1bffa]" : "text-white/35")}>{contact.pinned ? <StarRoundedIcon sx={{ fontSize: 17 }} /> : <StarBorderRoundedIcon sx={{ fontSize: 17 }} />}</button>
                    <button type="button" onClick={() => removeContact(contact)} aria-label={"Excluir " + contact.name} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/35 hover:text-[#f59aa5]"><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></button>
                  </div>)}
                  {savedContacts.length === 0 && <p className="py-2 text-[10px] text-white/38">Preencha nome e destino acima para salvar o primeiro contato.</p>}
                  <button type="button" onClick={saveCurrentContact} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#25252b] text-[10px] font-semibold text-white/70"><StarBorderRoundedIcon sx={{ fontSize: 16 }} />Salvar destinatário preenchido</button>
                </div></motion.div>}</AnimatePresence>
              </div>

              <label className="mt-3 block">
                <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Valor</span><span className="text-[9px] text-white/24">Saldo {currency.format(accountBalance)}</span></div>
                <div className="mt-2 flex h-16 items-center rounded-[18px] border border-white/[0.07] bg-white/[0.04] px-4 focus-within:border-[#67df9c]/30 focus-within:bg-white/[0.055]">
                  <span className="text-sm font-semibold text-white/30">R$</span>
                  <input value={sendAmount} onChange={(event) => { setSendAmount(event.target.value); setSendError(""); }} inputMode="decimal" placeholder="0,00" className="h-full min-w-0 flex-1 bg-transparent px-2 text-2xl font-semibold tracking-[-0.04em] text-white outline-none placeholder:text-white/16" />
                  <button type="button" onClick={() => setSendAmount(Math.max(accountBalance, 0).toFixed(2))} className="rounded-full bg-[#67df9c]/10 px-2.5 py-1 text-[9px] font-bold text-[#67df9c] transition hover:bg-[#67df9c]/16">MÁX</button>
                </div>
                {suggestedAmounts.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                    {suggestedAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setSendAmount(value.toFixed(2)); setSendError(""); }}
                        className="shrink-0 rounded-full border border-white/[0.055] bg-white/[0.025] px-2.5 py-1.5 text-[9px] font-semibold text-white/38 transition hover:border-white/[0.1] hover:bg-white/[0.05] hover:text-white/70"
                      >
                        {currency.format(value)}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <AnimatePresence initial={false}>
                {sendNumericAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    className="mt-3 overflow-hidden rounded-[15px] border border-white/[0.05] bg-black/20 px-3.5 py-3"
                  >
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.11em] text-white/22">Impacto no saldo</p>
                        <p className="mt-1 text-[10px] text-white/42">Você fica com <span className="font-semibold text-white/70">{currency.format(postSendBalance)}</span></p>
                      </div>
                      <span className="text-[9px] font-semibold text-white/28">{sendImpactPercent.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <motion.div
                        animate={{ width: `${sendImpactPercent}%` }}
                        transition={{ duration: 0.32, ease }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,#4abf7b,#7be5aa)]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <label className="mt-3 block">
                <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Mensagem <span className="font-medium normal-case tracking-normal text-white/20">opcional</span></span>
                <div className="mt-2 flex min-h-12 items-center gap-2 rounded-[16px] border border-white/[0.07] bg-white/[0.04] px-3.5 focus-within:border-white/20">
                  <NotesRoundedIcon sx={{ fontSize: 17 }} className="text-white/22" />
                  <input value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} maxLength={240} placeholder="Ex: jantar, aluguel, presente..." className="h-11 min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/20" />
                </div>
              </label>

              <div className="mt-3 rounded-2xl border border-white/[0.07] bg-black/15">
                <button type="button" aria-expanded={splitOpen} onClick={() => setSplitOpen(!splitOpen)} className="flex w-full items-center justify-between p-3 text-xs text-white/65"><span className="flex items-center gap-2"><CallSplitRoundedIcon sx={{fontSize:18}} />Dividir uma conta</span><KeyboardArrowDownRoundedIcon sx={{fontSize:18, transform: splitOpen ? "rotate(180deg)" : "none"}} /></button>
                <AnimatePresence initial={false}>{splitOpen && <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <div className="space-y-3 px-3 pb-3">
                    <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-white/50">Total da conta<input aria-label="Total da conta" inputMode="decimal" value={splitTotal} onChange={e=>setSplitTotal(e.target.value)} placeholder="300,00" className="mt-1 h-10 w-full rounded-xl bg-white/5 px-3 text-white outline-none focus:ring-1 focus:ring-[#67df9c]" /></label>
                    <label className="text-[11px] text-white/50">Pessoas<select aria-label="Pessoas" value={splitPeople} onChange={e=>setSplitPeople(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl bg-[#25292b] px-3 text-white">{[2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} pessoas</option>)}</select></label></div>
                    <p className="text-[11px] text-white/45">Sua parte: <strong className="text-[#8be8b2]">{currency.format(split?.share || 0)}</strong>{!!split?.remainder && <span> · Restam {currency.format(split.remainder)} para quem fechou a conta.</span>}</p>
                    <button type="button" disabled={!split || split.share <= 0} onClick={()=>{if(split){setSendAmount(split.share.toFixed(2));setSendMessage("Minha parte da conta • 1 de " + splitPeople);setSplitOpen(false);}}} className="w-full rounded-xl bg-white/10 py-2 text-xs font-semibold disabled:opacity-30">Usar minha parte no envio</button>
                  </div>
                </motion.div>}</AnimatePresence>
              </div>

              {sendError && <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mt-3 rounded-[12px] bg-[#ff6879]/8 px-3 py-2 text-[10px] font-medium text-[#ff7c8b]">{sendError}</motion.p>}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-[13px] bg-black/20 p-2.5"><p className="text-[8px] uppercase tracking-[0.1em] text-white/22">Taxa</p><p className="mt-1 text-[10px] font-semibold text-white/65">R$ 0,00</p></div>
                <div className="rounded-[13px] bg-black/20 p-2.5"><p className="text-[8px] uppercase tracking-[0.1em] text-white/22">Prazo</p><p className="mt-1 text-[10px] font-semibold text-white/65">No app</p></div>
                <div className="rounded-[13px] bg-black/20 p-2.5"><p className="text-[8px] uppercase tracking-[0.1em] text-white/22">Comprovante</p><p className="mt-1 text-[10px] font-semibold text-[#67df9c]">Automático</p></div>
              </div>

              <motion.button whileTap={{ scale: 0.985 }} type="button" onClick={reviewSend} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#eceeef] text-sm font-bold text-[#17191b] transition hover:bg-white">
                Revisar envio <ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} />
              </motion.button>
            </motion.div>
          )}

          {sendStep === "review" && (
            <motion.div key="review" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22, ease }}>
              <div className="mb-5 flex items-center gap-1.5">{[0, 1, 2].map((step) => <span key={step} className={`h-1 flex-1 rounded-full ${step <= 1 ? "bg-[#67df9c]" : "bg-white/[0.07]"}`} />)}</div>
              <button type="button" onClick={() => setSendStep("compose")} className="mb-4 inline-flex items-center gap-1 text-[10px] font-semibold text-white/35 transition hover:text-white/70"><ArrowBackRoundedIcon sx={{ fontSize: 16 }} />Editar dados</button>

              <div className="rounded-[22px] border border-white/[0.06] bg-black/20 px-4 pb-5 pt-6 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#2b2e30] text-[12px] font-bold text-[#e7e8e9] ring-1 ring-inset ring-white/[0.06]">{sendRecipient.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "•"}</span>
                <p className="mt-3 text-[11px] text-white/35">Você está enviando</p>
                <p className="mt-1 text-[34px] font-semibold tracking-[-0.055em] text-white">{currency.format(sendNumericAmount)}</p>
                <p className="mt-2 text-[12px] font-semibold text-[#d9dade]">para {sendRecipient}</p>
                <p className="mt-1 break-all text-[9px] text-white/28">{sendAddress}</p>
                <span className="mt-3 inline-flex rounded-full bg-white/[0.045] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.09em] text-white/38">{sendCategory}</span>
              </div>

              <button type="button" aria-pressed={favorites.includes(destinationKey(sendMethod,sendAddress))} onClick={toggleFavorite} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 py-2.5 text-xs text-[#c9d4cd]"><StarRoundedIcon sx={{fontSize:17}} />{favorites.includes(destinationKey(sendMethod,sendAddress)) ? "Destino favorito neste aparelho" : "Favoritar destino neste aparelho"}</button>
              <div className="mt-3 overflow-hidden rounded-[18px] border border-white/[0.055] bg-white/[0.025]">
                {[['Método', sendMethod], ['Categoria', sendCategory], ['Mensagem', sendMessage || 'Sem mensagem'], ['Taxa', 'R$ 0,00'], ['Saldo após envio', currency.format(postSendBalance)]].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-white/[0.045] px-4 py-3 last:border-b-0"><span className="text-[10px] text-white/28">{label}</span><span className="max-w-[65%] truncate text-right text-[10px] font-semibold text-white/65">{value}</span></div>
                ))}
              </div>

              <div className="mt-3 rounded-[16px] border border-white/[0.05] bg-black/15 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-semibold text-white/28">Saldo antes</span>
                  <span className="text-[10px] font-semibold text-white/58">{currency.format(accountBalance)}</span>
                </div>
                <div className="my-2.5 h-px bg-white/[0.045]" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-semibold text-white/28">Saldo depois</span>
                  <motion.span key={postSendBalance} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] font-bold text-[#89e8b3]">{currency.format(postSendBalance)}</motion.span>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-3 rounded-[16px] bg-[#67df9c]/[0.07] p-3 ring-1 ring-inset ring-[#67df9c]/10">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#67df9c]/10 text-[#67df9c]"><ShieldRoundedIcon sx={{ fontSize: 17 }} /></span>
                <div>
                  <p className="text-[10px] font-semibold text-[#bcefd2]">{sendHistory.length > 0 ? "Destino reconhecido no histórico" : "Novo destino"}</p>
                  <p className="mt-1 text-[9px] leading-4 text-[#73a68a]">
                    {sendHistory.length > 0
                      ? `Você já registrou ${sendHistory.length} ${sendHistory.length === 1 ? "pagamento" : "pagamentos"} para este destino. O formato foi conferido; a titularidade não é validada por banco.`
                      : "Este destino ainda não aparece no seu histórico. Confira a chave ou carteira antes de confirmar."}
                  </p>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {duplicateTransfer && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -5, height: 0 }}
                    className="mt-3 overflow-hidden rounded-[16px] border border-[#f2ba64]/15 bg-[#f2ba64]/[0.07] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f2ba64]/10 text-[#f2ba64]"><WarningAmberRoundedIcon sx={{ fontSize: 17 }} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-[#f4cb8d]">Possível envio duplicado</p>
                        <p className="mt-1 text-[9px] leading-4 text-[#ae8a57]">Já existe um envio de {currency.format(duplicateTransfer.valor)} para este destino nos últimos 10 minutos.</p>
                        <button
                          type="button"
                          onClick={() => { setDuplicateAcknowledged((value) => !value); setSendError(""); }}
                          className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition ${duplicateAcknowledged ? "bg-[#67df9c]/12 text-[#8be8b2]" : "bg-white/[0.055] text-white/45 hover:bg-white/[0.08]"}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${duplicateAcknowledged ? "bg-[#67df9c]" : "bg-white/20"}`} />
                          {duplicateAcknowledged ? "Reconhecido" : "Estou ciente, enviar mesmo assim"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {sendError && <p className="mt-3 rounded-[12px] bg-[#ff6879]/8 px-3 py-2 text-[10px] font-medium text-[#ff7c8b]">{sendError}</p>}

              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} type="button" onClick={confirmSend} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#67df9c] text-sm font-bold text-[#0c2115] shadow-[0_12px_34px_rgba(103,223,156,.14)] transition hover:bg-[#76e7aa]"><SendRoundedIcon sx={{ fontSize: 18 }} />{duplicateTransfer && !duplicateAcknowledged ? "Revisar duplicidade" : "Confirmar simulação"}</motion.button>
            </motion.div>
          )}

          {sendStep === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} className="py-8 text-center">
              <div className="relative mx-auto h-24 w-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.25, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border border-transparent border-t-[#67df9c] border-r-[#67df9c]/25" />
                <motion.div animate={{ scale: [0.88, 1, 0.88], opacity: [0.28, 0.62, 0.28] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-3 rounded-full bg-[#67df9c]/10 shadow-[0_0_42px_rgba(103,223,156,.12)]" />
                <motion.span animate={{ y: [1, -2, 1], x: [-1, 2, -1] }} transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 grid place-items-center text-[#67df9c]"><SendRoundedIcon sx={{ fontSize: 29 }} /></motion.span>
              </div>
              <p className="mt-5 text-lg font-semibold tracking-[-0.03em] text-white">Registrando {currency.format(sendNumericAmount)}</p>
              <p className="mt-1 text-xs text-white/32">para {sendRecipient}</p>
              <div className="mx-auto mt-6 max-w-[292px] text-left">
                {["Dados revisados", "Registrando simulação", "Preparando comprovante"].map((label, index) => {
                  const stage = index + 1;
                  const done = sendProgress >= stage;
                  const current = sendProgress === index;
                  return (
                    <motion.div key={label} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }} className="relative flex min-h-[48px] items-center gap-3">
                      {index < 2 && <span className="absolute left-[10px] top-[32px] h-[28px] w-px bg-white/[0.06]" />}
                      <span className={`relative z-10 grid h-[21px] w-[21px] shrink-0 place-items-center rounded-full border transition ${done ? "border-[#67df9c]/30 bg-[#67df9c]/12 text-[#67df9c]" : current ? "border-white/15 bg-white/[0.04] text-white/55" : "border-white/[0.06] bg-[#191c1e] text-white/15"}`}>
                        {done ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : current ? <motion.span animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 0.8, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-current" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-semibold transition ${done ? "text-white/62" : current ? "text-white/48" : "text-white/20"}`}>{label}</p>
                        <p className="mt-0.5 text-[8px] text-white/18">{done ? "Concluído" : current ? "Processando agora" : "Na sequência"}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <p className="mx-auto mt-5 max-w-[255px] text-[9px] leading-4 text-white/20">Você pode fechar a carteira depois da confirmação. O registro é persistido antes do comprovante aparecer.</p>
            </motion.div>
          )}

          {sendStep === "success" && createdTransfer && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.34, ease }} className="text-center">
              <div className="relative mx-auto h-20 w-20">
                {[[-34, -22], [34, -20], [-41, 9], [42, 12], [-24, 34], [27, 35]].map(([x, y], index) => (
                  <motion.span
                    key={`${x}-${y}`}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x, y, scale: [0, 1, 0.6], opacity: [0, 0.75, 0] }}
                    transition={{ duration: 0.72, delay: 0.08 + index * 0.035, ease }}
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#82e9ae] shadow-[0_0_10px_rgba(130,233,174,.6)]"
                  />
                ))}
                <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.35, opacity: [0, 0.24, 0] }} transition={{ duration: 0.8 }} className="absolute inset-0 rounded-full bg-[#67df9c]" />
                <motion.span initial={{ scale: 0.55, rotate: -18 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="absolute inset-2 grid place-items-center rounded-full bg-[#67df9c] text-[#102218]"><CheckCircleRoundedIcon sx={{ fontSize: 34 }} /></motion.span>
              </div>
              <p className="mt-5 text-[11px] font-semibold text-[#78dca4]">Simulação registrada</p>
              <p className="mt-1 text-[38px] font-semibold tracking-[-0.06em] text-white">{currency.format(createdTransfer.valor)}</p>
              <p className="mt-2 text-xs text-white/38">para <span className="font-semibold text-white/70">{createdTransfer.destinatario || sendRecipient}</span></p>

              <p className="mt-2 text-[10px] text-white/35">Registro iniciado às {new Date(sendStartedAt).toLocaleTimeString("pt-BR")} · sem movimentação bancária</p>
              <div className="receipt-reveal mt-5 rounded-[18px] border border-white/[0.055] bg-black/20 p-3 text-left">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/22">Comprovante</p><p className="mt-1 font-mono text-[9px] text-white/45">SLD-{createdTransfer.id.replaceAll("-", "").slice(0, 12).toUpperCase()}</p></div><button type="button" onClick={copyTransferCode} className="rounded-full bg-[#67df9c]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[#67df9c] transition hover:bg-[#67df9c]/16">copiar ID</button></div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {[['Histórico', 'salvo'], ['PDF', 'pronto'], ['Taxa', 'R$ 0']].map(([label, value]) => (
                    <div key={label} className="rounded-[10px] bg-white/[0.025] px-2 py-2">
                      <p className="text-[7px] font-bold uppercase tracking-[0.09em] text-white/18">{label}</p>
                      <p className="mt-1 text-[9px] font-semibold text-white/52">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={`/dashboard/comprovante/${createdTransfer.id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-3 text-[10px] font-semibold text-[#dfe1e3] transition hover:bg-white/[0.07]"><ReceiptLongRoundedIcon sx={{ fontSize: 17 }} />Ver comprovante</Link>
                <a href={`/api/receipt/${createdTransfer.id}/pdf`} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-3 text-[10px] font-semibold text-[#dfe1e3] transition hover:bg-white/[0.07]"><PictureAsPdfRoundedIcon sx={{ fontSize: 17 }} />Baixar PDF</a>
                <button type="button" onClick={copyTransferCode} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-3 text-[10px] font-semibold text-[#dfe1e3] transition hover:bg-white/[0.07]"><ContentCopyRoundedIcon sx={{ fontSize: 17 }} />Copiar ID</button>
                <button type="button" onClick={shareTransfer} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-3 text-[10px] font-semibold text-[#dfe1e3] transition hover:bg-white/[0.07]"><ShareRoundedIcon sx={{ fontSize: 17 }} />Compartilhar</button>
                <button type="button" onClick={() => { const recipient = sendRecipient; const address = sendAddress; const method = sendMethod; resetSend(); setSendRecipient(recipient); setSendAddress(address); setSendMethod(method); }} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-3 text-[10px] font-semibold text-[#dfe1e3] transition hover:bg-white/[0.07]"><ReplayRoundedIcon sx={{ fontSize: 17 }} />Repetir</button>
                <button type="button" onClick={finishSend} className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#eceeef] px-3 text-[10px] font-bold text-[#17191b] transition hover:bg-white"><HistoryRoundedIcon sx={{ fontSize: 17 }} />Ver histórico</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalShell>

      <ModalShell
        open={modal === "swap" || modal === "buy"}
        title={modal === "buy" ? "Comprar cripto" : "Trade"}
        subtitle="Explore as cotações e revise sua simulação."
        onClose={() => setModal(null)}
      >
        <TradePanel key={modal} markets={markets} updatedAt={updatedAt} initialCoin="solana" initialMode={modal === "swap" ? "swap" : "buy"} unavailable={!!marketError} />
      </ModalShell>
    </div>
    </MotionConfig>
  );
}
