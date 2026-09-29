"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import Dialog from "@mui/material/Dialog";
import AddCardRoundedIcon from "@mui/icons-material/AddCardRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import QRCode from "qrcode";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { TransactionList } from "@/components/transaction-list";
import { CoinIcon } from "@/components/coin-icon";
import { CryptoMarket } from "@/components/crypto-market";
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

type DashboardViewProps = {
  transactions: Transaction[];
  income: number;
  expenses: number;
  balance: number;
  demoMode: boolean;
};

type ModalKind = "receive" | "send" | "swap" | "buy" | null;
type DashboardTab = "tokens" | "nfts" | "activity" | "insights";

const accounts = [
  {
    id: "personal",
    handle: "@cirmit",
    label: "Pessoal",
    address: "4VvX9NQGZB7rjBfM7K9yvV5SJ6xPkm3BR9U2mZ5wJ1eR",
    multiplier: 1,
    avatar: "C",
  },
  {
    id: "reserve",
    handle: "@reserve",
    label: "Reserva",
    address: "8Hb2vRrGQm3PyXQYkT6mU7fW9aN4jL2sE5xC1pV7dK3Z",
    multiplier: 0.62,
    avatar: "R",
  },
  {
    id: "travel",
    handle: "@travel",
    label: "Viagem",
    address: "6Pa4kQ3vJ8mT2yW7sN5dF9rB1xL6cE4uH3zG7V2qM8aK",
    multiplier: 0.28,
    avatar: "V",
  },
] as const;

const quickActions = [
  { id: "receive", label: "Receber", icon: QrCodeScannerRoundedIcon },
  { id: "send", label: "Enviar", icon: ArrowOutwardRoundedIcon },
  { id: "swap", label: "Swap", icon: SwapVertRoundedIcon },
  { id: "buy", label: "Comprar", icon: AddCardRoundedIcon },
] as const;

const dashboardTabs = [
  { id: "tokens", label: "Tokens", icon: GridViewRoundedIcon },
  { id: "nfts", label: "NFTs", icon: CollectionsRoundedIcon },
  { id: "activity", label: "Atividade", icon: HistoryRoundedIcon },
  { id: "insights", label: "Insights", icon: InsightsRoundedIcon },
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

const ease = [0.22, 1, 0.36, 1] as const;

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(2) + "%";
}

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={id} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "26px", background: "#191c1e", color: "white", margin: "16px", width: "calc(100% - 32px)" } }, backdrop: { sx: { background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)" } } }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id={id} className="text-lg font-semibold tracking-[-0.035em] text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-[#858f93]">{subtitle}</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-[#aaaab0] transition hover:bg-white/[0.09] hover:text-white"><CloseRoundedIcon sx={{ fontSize: 18 }} /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </Dialog>
  );
}

export function DashboardView({
  transactions,
  income,
  expenses,
  balance,
  demoMode,
}: DashboardViewProps) {
  const [selectedAccountId, setSelectedAccountId] =
    useState<(typeof accounts)[number]["id"]>("personal");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const { markets, updatedAt, error: marketError } = useMarket("solana", "1d");
  const marketLoading = markets.length === 0;
  const [toast, setToast] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("tokens");
  const [balancesVisible, setBalancesVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const account =
    accounts.find((item) => item.id === selectedAccountId) ?? accounts[0];

  const accountBalance = balance * account.multiplier;
  const netGain = (income - expenses) * account.multiplier;
  const gainPercent = income > 0 ? (netGain / (income * account.multiplier)) * 100 : 0;
  const positive = netGain > 0;
  const negative = netGain < 0;

  const solana = markets.find((coin) => coin.id === "solana");
  const usdc = markets.find((coin) => coin.id === "usd-coin");
  const positivePortfolio = Math.max(accountBalance, 0);
  const solValue = positivePortfolio * 0.52;
  const usdcValue = positivePortfolio * 0.48;
  const solQuantity =
    solana?.current_price && solana.current_price > 0 ? solValue / solana.current_price : 0;
  const usdcQuantity =
    usdc?.current_price && usdc.current_price > 0 ? usdcValue / usdc.current_price : 0;

  const glow = positive
    ? "radial-gradient(ellipse 115% 70% at 50% -16%, rgba(23,104,64,0.52) 0%, rgba(24,76,52,0.31) 24%, rgba(24,45,36,0.15) 45%, rgba(17,18,20,0) 73%), linear-gradient(180deg, #14241c 0%, #151a18 18%, #111315 42%, #111214 100%)"
    : negative
      ? "radial-gradient(ellipse 115% 70% at 50% -16%, rgba(112,43,53,0.38) 0%, rgba(69,35,40,0.20) 30%, rgba(17,18,20,0) 72%), linear-gradient(180deg, #211719 0%, #171617 20%, #111214 48%, #111214 100%)"
      : "radial-gradient(ellipse 110% 65% at 50% -16%, rgba(82,86,85,0.22) 0%, rgba(17,18,20,0) 70%), linear-gradient(180deg, #181a1b 0%, #131516 35%, #111214 100%)";

  const assets = useMemo(
    () => [
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
    ],
    [solQuantity, solValue, solana, usdcQuantity, usdcValue, usdc],
  );

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

  function confirmSend() {
    if (!sendAddress.trim() || !Number.isFinite(Number(sendAmount)) || Number(sendAmount) <= 0) return;
    setModal(null);
    setSendAddress("");
    setSendAmount("");
    setToast("Simulação concluída. Nenhuma transação foi enviada à blockchain.");
  }


  function selectTab(tab: DashboardTab) {
    setDashboardTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById("wallet-content")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
    });
  }

  const searchItems = [
    { label: "Receber por QR Code", detail: "Abrir endereço da carteira", keywords: "receber qr solana", action: () => setModal("receive") },
    { label: "Enviar", detail: "Preparar uma transferência", keywords: "enviar transferencia", action: () => setModal("send") },
    { label: "Swap", detail: "Trocar SOL e USDC", keywords: "swap trocar sol usdc", action: () => setModal("swap") },
    { label: "Tokens", detail: "Ver SOL e USDC", keywords: "tokens ativos solana usdc", action: () => selectTab("tokens") },
    { label: "NFTs", detail: "Abrir colecionáveis", keywords: "nft colecao colecionaveis", action: () => selectTab("nfts") },
    { label: "Atividade", detail: "Ver pagamentos e recebimentos", keywords: "atividade transacoes pagamentos", action: () => selectTab("activity") },
    { label: "Insights", detail: "Ver distribuição e fluxo", keywords: "insights carteira portfolio", action: () => selectTab("insights") },
    ...demoNfts.map((nft) => ({
      label: nft.name,
      detail: nft.collection,
      keywords: "nft " + nft.name + " " + nft.collection,
      action: () => selectTab("nfts"),
    })),
  ];

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
    <div
      className="relative min-h-screen overflow-hidden bg-[#111214] text-white"
      style={{ backgroundImage: glow }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(180deg,rgba(17,18,20,0)_0%,rgba(17,18,20,0.04)_34%,rgba(17,18,20,0.58)_72%,#111214_100%)]" />

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
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.07] bg-[#292b2d] text-sm font-black text-[#e0e1e3]">
                {account.avatar}
              </span>
              <span>
                <span className="block text-[11px] font-semibold text-white/50">{account.handle}</span>
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
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2d2f31] text-xs font-black text-[#e0e1e3]">
                          {item.avatar}
                        </span>
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
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.56, ease }}
          className="pt-16 text-center sm:pt-20"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/32">
            saldo da carteira
          </p>
          <div className="mt-3 flex items-center justify-center gap-2.5">
            <motion.h1
              key={account.id + String(balancesVisible)}
              initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.38, ease }}
              className="text-[clamp(3.15rem,10vw,5.4rem)] font-semibold leading-none tracking-[-0.075em] text-[#fafafa]"
            >
              {balancesVisible ? currency.format(accountBalance) : "••••••"}
            </motion.h1>
            <button
              type="button"
              onClick={() => setBalancesVisible((visible) => !visible)}
              aria-label={balancesVisible ? "Ocultar valores" : "Mostrar valores"}
              className="mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/28 transition hover:bg-white/[0.05] hover:text-white/65"
            >
              {balancesVisible ? (
                <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold">
            <span className={gainClass}>
              {balancesVisible ? (netGain > 0 ? "+" : "") + currency.format(netGain) : "••••"}
            </span>
            <span className={"rounded-md px-2 py-1 text-xs " + gainPillClass}>
              {formatPercent(gainPercent)}
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.56, ease }}
          className="mt-12 grid grid-cols-4 gap-2 sm:gap-3"
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openAction(action.id)}
                className="group flex min-h-[84px] min-w-0 flex-col items-center justify-center gap-2 rounded-[18px] border border-white/[0.035] bg-[#292b2e]/94 px-1.5 transition hover:bg-[#303235] sm:min-h-[92px] sm:rounded-[20px]"
              >
                <Icon
                  sx={{ fontSize: { xs: 24, sm: 27 } }}
                  className="text-[#d8dadd] transition-transform duration-300 group-hover:scale-105"
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
          transition={{ delay: 0.23, duration: 0.58, ease }}
          className="mt-7 grid grid-cols-4 gap-1 rounded-[18px] border border-white/[0.045] bg-black/15 p-1.5"
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
                    className="absolute inset-0 rounded-[13px] bg-white/[0.075] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
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
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/32">Ativos</h2>
                  <p className="mt-1 text-[10px] text-white/24">Preço de mercado atualizado</p>
                </div>
                <Link href="/dashboard/crypto" className="text-[11px] font-semibold text-[#9b9da1] transition hover:text-[#e0e1e3]">
                  Mercado
                </Link>
              </div>

              {assets.map((asset, index) => {
                const changePositive = asset.change >= 0;
                const changeClass = changePositive ? "text-[#45e28b]" : "text-[#ff6e7f]";

                return (
                  <motion.div key={asset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.055, duration: 0.36, ease }}>
                    <Link href={"/dashboard/crypto?coin=" + asset.id} className="flex min-h-[68px] min-w-0 items-center gap-3 rounded-[18px] border border-white/[0.035] bg-[#282a2d]/94 px-3.5 py-2.5 transition hover:bg-[#2e3033] active:scale-[0.99] sm:px-4">
                      <CoinIcon id={asset.id} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold tracking-[-0.025em] text-[#f2f3f4]">{asset.name}</p>
                        <p className="mt-0.5 truncate text-[10px] font-medium text-[#87898e]">{!balancesVisible ? "•••• " + asset.symbol : marketLoading ? "Atualizando…" : number.format(asset.quantity) + " " + asset.symbol}</p>
                      </div>
                      <div className="max-w-[46%] shrink-0 text-right">
                        <p className="text-[14px] font-semibold tracking-[-0.025em] text-[#f2f3f4]">{balancesVisible ? currency.format(asset.value) : "••••"}</p>
                        <p className={"mt-0.5 text-[10px] font-semibold " + changeClass}>{marketLoading ? "—" : formatPercent(asset.change)}</p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              <CryptoMarket embedded />
            </motion.section>
          )}

          {dashboardTab === "nfts" && (
            <motion.section key="nfts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }} className="mt-5">
              <div className="flex items-end justify-between px-1 pb-3">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/32">Colecionáveis</h2>
                  <p className="mt-1 text-[10px] text-white/24">4 NFTs demonstrativos nesta conta</p>
                </div>
                <span className="rounded-full bg-[#67df9c]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#67df9c]">Demo</span>
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
                    className="group overflow-hidden rounded-[20px] border border-white/[0.045] bg-[#242629] text-left transition hover:border-white/[0.09]"
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
              <TransactionList transactions={transactions} />
            </motion.section>
          )}

          {dashboardTab === "insights" && (
            <motion.section key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }} className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-white/[0.045] bg-[#242629]/94 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[#dfe1e3]"><BoltRoundedIcon sx={{ fontSize: 18 }} /><h2 className="text-[13px] font-semibold">Wallet Pulse</h2></div>
                    <p className="mt-1 text-[10px] leading-4 text-[#77797e]">Leitura rápida do seu portfólio e do fluxo financeiro.</p>
                  </div>
                  <span className={"rounded-full px-2.5 py-1 text-[9px] font-bold " + (positive ? "bg-[#67df9c]/10 text-[#67df9c]" : negative ? "bg-[#ff6e7f]/10 text-[#ff7887]" : "bg-white/[0.05] text-white/40")}>{positive ? "Positivo" : negative ? "Negativo" : "Neutro"}</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-[16px] bg-black/20 p-3"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/28">Entradas</p><p className="mt-2 truncate text-[12px] font-semibold text-[#dfe1e3]">{balancesVisible ? currency.format(income * account.multiplier) : "••••"}</p></div>
                  <div className="rounded-[16px] bg-black/20 p-3"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/28">Saídas</p><p className="mt-2 truncate text-[12px] font-semibold text-[#dfe1e3]">{balancesVisible ? currency.format(expenses * account.multiplier) : "••••"}</p></div>
                  <div className="rounded-[16px] bg-black/20 p-3"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/28">Eventos</p><p className="mt-2 text-[12px] font-semibold text-[#dfe1e3]">{transactions.length}</p></div>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/[0.045] bg-[#242629]/94 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-semibold text-[#e4e5e6]">Distribuição da carteira</p><p className="mt-1 text-[9px] text-[#6f7175]">Estimativa visual baseada no saldo atual</p></div><span className="text-[10px] font-semibold text-white/35">SOL / USDC</span></div>
                <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/[0.04]"><div className="w-[52%] rounded-full bg-[#67df9c]/80" /><div className="w-[48%] bg-[#7f848b]/55" /></div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]"><div className="flex items-center justify-between"><span className="text-white/35">Solana</span><span className="font-semibold text-white/70">52%</span></div><div className="flex items-center justify-between"><span className="text-white/35">USDC</span><span className="font-semibold text-white/70">48%</span></div></div>
              </div>

              <button type="button" onClick={() => setSearchOpen(true)} className="flex w-full items-center justify-between rounded-[20px] border border-white/[0.045] bg-[#242629]/94 px-4 py-3.5 text-left transition hover:bg-[#2a2c2f]">
                <span><span className="block text-[11px] font-semibold text-[#e4e5e6]">Spotlight da carteira</span><span className="mt-1 block text-[9px] text-[#6f7175]">Busque ações, ativos e NFTs em um só lugar</span></span>
                <span className="rounded-lg border border-white/[0.07] bg-black/20 px-2 py-1 text-[9px] font-semibold text-white/34">Ctrl K</span>
              </button>
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
                      item.action();
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
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">Endereço Solana</p>
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
        title="Enviar"
        subtitle="Prepare uma transferência. Nesta versão, a confirmação é apenas uma simulação visual."
        onClose={() => setModal(null)}
      >
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Destino</span>
          <input
            value={sendAddress}
            onChange={(event) => setSendAddress(event.target.value)}
            placeholder="Endereço da carteira"
            className="mt-2 h-12 w-full rounded-[16px] border border-white/[0.07] bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.055]"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/35">Valor</span>
          <div className="mt-2 flex h-14 items-center rounded-[16px] border border-white/[0.07] bg-white/[0.04] px-4 focus-within:border-white/20">
            <span className="text-sm font-semibold text-white/35">R$</span>
            <input
              value={sendAmount}
              onChange={(event) => setSendAmount(event.target.value.replace(",", "."))}
              inputMode="decimal"
              placeholder="0,00"
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-xl font-semibold tracking-[-0.03em] text-white outline-none placeholder:text-white/18"
            />
          </div>
        </label>

        <button
          type="button"
          onClick={confirmSend}
          disabled={!sendAddress.trim() || !Number.isFinite(Number(sendAmount)) || Number(sendAmount) <= 0}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#eceeef] text-sm font-bold text-[#17191b] transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <SendRoundedIcon sx={{ fontSize: 18 }} />
          Simular envio
        </button>
      </ModalShell>

      <ModalShell
        open={modal === "swap" || modal === "buy"}
        title={modal === "buy" ? "Comprar cripto" : "Trocar moedas"}
        subtitle="Explore as cotações e revise sua simulação."
        onClose={() => setModal(null)}
      >
        <TradePanel key={modal} markets={markets} updatedAt={updatedAt} initialCoin="solana" initialMode={modal === "swap" ? "swap" : "buy"} unavailable={!!marketError} />
      </ModalShell>
    </div>
  );
}
