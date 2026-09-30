"use client";

import { motion, MotionConfig } from "framer-motion";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import CurrencyBitcoinRoundedIcon from "@mui/icons-material/CurrencyBitcoinRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WalletLock } from "@/components/wallet-lock";

const navItems = [
  { href: "/dashboard", label: "Início", icon: HomeRoundedIcon, exact: true },
  { href: "/dashboard/crypto", label: "Cripto", icon: CurrencyBitcoinRoundedIcon },
  { href: "/dashboard/memes", label: "Radar", icon: LocalFireDepartmentRoundedIcon },
  { href: "/dashboard/nova-transacao", label: "Adicionar", icon: AddRoundedIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const walletHome = pathname === "/dashboard";

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function lockNow() {
    window.dispatchEvent(new Event("saldo:lock"));
  }

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
    <WalletLock>
      <div className="min-h-screen bg-[#0a0b0d] text-white">
        <div className={`mx-auto grid min-h-screen ${walletHome ? "max-w-none grid-cols-1" : "max-w-[1540px] grid-cols-1 lg:grid-cols-[238px_1fr]"}`}>
          <aside className={`${walletHome ? "hidden" : "sticky top-0 hidden h-screen border-r border-white/[0.055] bg-[#0d0e10]/94 px-4 py-6 backdrop-blur-xl lg:flex lg:flex-col"}`}>
            <Link href="/dashboard" className="flex items-center gap-3 px-2.5">
              <motion.span whileHover={{ rotate: -5, scale: 1.04 }} className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#2a2d2f] text-[#70e3a3] shadow-[0_8px_28px_rgba(0,0,0,0.2)] ring-1 ring-inset ring-white/[0.06]">
                <span className="text-lg font-black tracking-[-0.08em]">S</span>
              </motion.span>
              <span className="text-lg font-semibold tracking-[-0.045em]">Saldo</span>
            </Link>

            <nav className="mt-10 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link key={item.href} href={item.href} className="relative block">
                    {active && (
                      <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-2xl bg-white/[0.07]" transition={{ type: "spring", stiffness: 380, damping: 34 }} />
                    )}
                    <div className={`relative flex h-11 items-center gap-3 rounded-2xl px-3 text-sm transition ${active ? "font-semibold text-white" : "font-medium text-[#77797d] hover:text-[#c8cace]"}`}>
                      <Icon sx={{ fontSize: 20 }} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto">
              <div className="mb-3 rounded-2xl border border-white/[0.055] bg-white/[0.025] p-4">
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} className="text-[#70e3a3]" />
                <p className="mt-3 text-xs font-semibold text-[#d7d9dc]">Carteira pessoal</p>
                <p className="mt-1 text-[11px] leading-5 text-[#686a70]">Dados financeiros, cripto e comprovantes em um único painel.</p>
              </div>
              <button onClick={lockNow} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-[#707278] transition hover:bg-white/[0.035] hover:text-[#c1c3c7]">
                <LockRoundedIcon sx={{ fontSize: 17 }} /> Bloquear carteira
              </button>
            </div>
          </aside>

          <main className={`min-w-0 ${walletHome ? "pb-0" : "pb-24 lg:pb-0"}`}>{children}</main>

          <nav className={`${walletHome ? "hidden" : "fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-[22px] border border-white/[0.07] bg-[#191a1c]/94 px-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:hidden"}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.href} href={item.href} className={`relative flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold transition ${active ? "text-white" : "text-[#727478]"}`}>
                  {active && <motion.div layoutId="mobile-active" className="absolute inset-0 rounded-2xl bg-white/[0.07]" />}
                  <Icon className="relative" sx={{ fontSize: 21 }} />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
            <button onClick={lockNow} className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold text-[#696b70]">
              <LockRoundedIcon sx={{ fontSize: 20 }} />
              Bloquear
            </button>
          </nav>
        </div>
      </div>
    </WalletLock>
    </MotionConfig>
  );
}
