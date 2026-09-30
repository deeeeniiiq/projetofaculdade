"use client";

import ContactlessRoundedIcon from "@mui/icons-material/ContactlessRounded";
import { motion } from "framer-motion";
import { CARD_LAST_FOUR } from "@/lib/card";

const spring = { type: "spring", stiffness: 125, damping: 21, mass: 1.1 } as const;

export function VirtualCard({
  holder,
  frozen,
  flipped,
  onFlip,
}: {
  holder: string;
  frozen: boolean;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotateX: 7, rotateZ: -2, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, rotateZ: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 115, damping: 19, delay: 0.08 }}
      className="mx-auto w-full max-w-[480px] [perspective:1600px]"
    >
      <motion.button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? "Ver frente do cartão virtual" : "Ver verso do cartão virtual"}
        animate={{ rotateY: flipped ? 180 : 0 }}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        transition={spring}
        style={{ transformStyle: "preserve-3d" }}
        className="wallet-card-3d relative block aspect-[1.586] w-full rounded-[23px] text-left"
      >
        <span aria-hidden={flipped} className="wallet-card-face wallet-card-front absolute inset-0 flex flex-col overflow-hidden rounded-[23px] p-4 sm:p-7">
          <span className="wallet-card-sheen pointer-events-none absolute inset-0" />
          <span className="wallet-card-orbit wallet-card-orbit-one pointer-events-none absolute" />
          <span className="wallet-card-orbit wallet-card-orbit-two pointer-events-none absolute" />
          <span className="relative flex items-start justify-between gap-3">
            <span className="text-[16px] font-extrabold tracking-[-0.08em] text-[#51486e] sm:text-[18px]">saldo<span className="text-[#7770a5]">.</span></span>
            <span className="rounded-full border border-[#625a80]/20 bg-white/25 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em] text-[#514967]">{frozen ? "PAUSADO" : "VIRTUAL"}</span>
          </span>
          <span className="relative mt-auto flex items-end justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#625a85]/85 text-[14px] font-bold italic tracking-[-0.1em] text-white shadow-[0_8px_22px_rgba(76,67,104,.2)] sm:h-11 sm:w-11 sm:text-[17px]">S</span>
            <ContactlessRoundedIcon sx={{ fontSize: { xs: 22, sm: 28 } }} className="rotate-90 text-[#5a5376]/70" />
          </span>
          <span className="relative mt-3 block font-mono text-[16px] font-medium tracking-[0.2em] text-[#49435d] sm:mt-5 sm:text-[23px]">•••• {CARD_LAST_FOUR}</span>
          <span className="relative mt-3 flex items-end justify-between gap-3 text-[#514967] sm:mt-5">
            <span className="min-w-0"><span className="block text-[7px] font-bold uppercase tracking-[0.16em] opacity-60 sm:text-[8px]">TITULAR</span><span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-[0.12em] sm:mt-1 sm:text-[13px]">{holder}</span></span>
            <span className="text-[10px] font-extrabold tracking-[-0.03em]">DEMO</span>
          </span>
        </span>
        <span aria-hidden={!flipped} className="wallet-card-face wallet-card-back absolute inset-0 flex flex-col overflow-hidden rounded-[23px] py-4 text-[#514967] sm:py-6">
          <span className="mt-2 h-[29px] w-full shrink-0 bg-[#3d3852]/80 sm:mt-4 sm:h-[38px]" />
          <span className="mt-3 px-4 sm:mt-6 sm:px-7"><span className="block text-[7px] font-bold uppercase tracking-[0.16em] opacity-65 sm:text-[8px]">NÚMERO FICTÍCIO</span><span className="mt-1 block font-mono text-[clamp(12px,3.5vw,23px)] font-semibold tracking-[0.05em] sm:mt-2 sm:tracking-[0.08em]">0000 0000 0000 {CARD_LAST_FOUR}</span></span>
          <span className="mt-auto flex items-end justify-between gap-3 px-4 sm:gap-5 sm:px-7"><span className="max-w-[185px] text-[7px] leading-3 opacity-70 sm:max-w-[240px] sm:text-[9px] sm:leading-4">Exibição demonstrativa. Este número não funciona para pagamentos reais.</span><span className="text-[12px] font-extrabold tracking-[-0.08em] sm:text-[15px]">saldo.</span></span>
        </span>
      </motion.button>
    </motion.div>
  );
}
