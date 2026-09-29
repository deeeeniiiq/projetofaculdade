"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type ReceiptActionsProps = {
  receiptCode: string;
};

export function ReceiptActions({ receiptCode }: ReceiptActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(receiptCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="receipt-actions flex flex-col gap-2 sm:flex-row">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={copyCode}
        type="button"
        className="relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-4 text-xs font-semibold text-[#d9dade] transition-colors hover:bg-white/[0.07]"
      >
        <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "copied" : "copy"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.16 }}
          >
            {copied ? "Código copiado" : "Copiar código"}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => window.print()}
        type="button"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#eceeef] px-4 text-xs font-bold text-[#17191b] transition hover:bg-white"
      >
        <PrintRoundedIcon sx={{ fontSize: 18 }} />
        Salvar / imprimir
      </motion.button>
    </div>
  );
}
