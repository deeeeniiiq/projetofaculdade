"use client";

import ContactlessRoundedIcon from "@mui/icons-material/ContactlessRounded";
import SimCardOutlinedIcon from "@mui/icons-material/SimCardOutlined";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { CARD_LAST_FOUR } from "@/lib/card";

export function VirtualCard({ holder, frozen, flipped, onFlip, number = `0000 0000 0000 ${CARD_LAST_FOUR}`, temporary = false }: { holder: string; frozen: boolean; flipped: boolean; onFlip: () => void; number?: string; temporary?: boolean }) {
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0), pointerY = useMotionValue(0);
  const tiltX = useSpring(pointerX, { stiffness: 130, damping: 23 });
  const tiltY = useSpring(pointerY, { stiffness: 130, damping: 23 });
  return <motion.div initial={{ opacity: 0, y: 26, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 100, damping: 21, delay: .08 }} className="mx-auto w-full max-w-[450px] [perspective:1800px]">
    <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }} onPointerMove={(event) => { if (reduced || event.pointerType !== "mouse") return; const rect = event.currentTarget.getBoundingClientRect(); pointerX.set(-(event.clientY - rect.top - rect.height / 2) / rect.height * 9); pointerY.set((event.clientX - rect.left - rect.width / 2) / rect.width * 11); }} onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}>
      <motion.button type="button" onClick={onFlip} aria-label={flipped ? "Ver frente do cartão virtual" : "Ver verso do cartão virtual"} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 90, damping: 20, mass: 1.1 }} whileTap={{ scale: .986 }} style={{ transformStyle: "preserve-3d" }} className="wallet-card-3d relative block aspect-[1.586] w-full rounded-[18px] text-left">
        <span aria-hidden={flipped} className="wallet-card-face wallet-card-front absolute inset-0 flex flex-col overflow-hidden rounded-[18px] p-5 sm:p-7">
          <span className="wallet-card-sheen pointer-events-none absolute inset-0" />
          <span className="wallet-card-orbit wallet-card-orbit-one pointer-events-none absolute" />
          <span className="wallet-card-orbit wallet-card-orbit-two pointer-events-none absolute" />
          <span className="relative flex justify-between"><span className="text-xl font-extrabold tracking-[-.08em] text-[#5c537e] sm:text-2xl">saldo.</span><span className="text-[8px] font-semibold uppercase tracking-[.16em] text-[#62577b]/65">{frozen ? "PAUSADO" : temporary ? "TEMPORÁRIO" : "VIRTUAL"}</span></span>
          <span className="relative mt-5 flex items-center gap-2 text-[#62577b]/60 sm:mt-8"><SimCardOutlinedIcon sx={{ fontSize: { xs: 27, sm: 35 } }} /><ContactlessRoundedIcon sx={{ fontSize: { xs: 19, sm: 23 } }} className="rotate-90" /></span>
          <span className="relative mt-auto flex items-end justify-between gap-4 text-[#524967]"><span className="min-w-0"><span className="block truncate text-[10px] font-semibold uppercase tracking-[.13em] sm:text-xs">{holder}</span><span className="mt-2 block font-mono text-xs tracking-[.15em] text-[#655c7d]/65">•••• {number.slice(-4)}</span></span><span className="text-right"><span className="block text-[7px] uppercase tracking-[.15em] opacity-60">DEMONSTRAÇÃO</span><span className="mt-1 block text-sm font-bold italic tracking-[-.04em] sm:text-xl">saldo</span></span></span>
        </span>
        <span aria-hidden={!flipped} className="wallet-card-face wallet-card-back absolute inset-0 flex flex-col overflow-hidden rounded-[18px] py-5 text-[#524967] sm:py-7">
          <span className="h-9 w-full bg-[#292536]/90 sm:h-11" />
          <span className="mt-4 px-5 sm:mt-6 sm:px-7"><span className="block text-[7px] font-semibold uppercase tracking-[.14em] opacity-65">NÚMERO FICTÍCIO</span><span className="mt-2 block font-mono text-[clamp(14px,3.5vw,23px)] font-medium tracking-[.04em]">{number}</span><span className="mt-3 flex gap-7 text-[8px] font-medium sm:text-[10px]"><span>VALIDADE 12/30</span><span>CVV 000</span></span></span>
          <span className="mt-auto px-5 text-[7px] leading-3 opacity-65 sm:px-7 sm:text-[8px]">Cartão acadêmico. Não possui bandeira ou conta bancária vinculada.</span>
        </span>
      </motion.button>
    </motion.div>
  </motion.div>;
}
