"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type ReceiptActionsProps = {
  receiptCode: string;
  transactionId: string;
};

export function ReceiptActions({ receiptCode, transactionId }: ReceiptActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState("");

  async function copyCode() {
    try {
    await navigator.clipboard.writeText(receiptCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    setError("");
    } catch { setError("Não foi possível copiar. O código está visível no comprovante."); }
  }

  async function shareReceipt() {
    try {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: "Comprovante de transferência",
        text: `Comprovante ${receiptCode}`,
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
    setError("");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setError("Compartilhamento indisponível. Você pode baixar o PDF.");
    }
  }

  return (
    <div className="receipt-actions grid gap-2 sm:grid-cols-2">
      {error && <p role="status" className="text-xs text-[#ff9da8] sm:col-span-2">{error}</p>}
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

      <motion.a
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        href={`/api/receipt/${transactionId}/pdf`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-4 text-xs font-semibold text-[#d9dade] transition-colors hover:bg-white/[0.07]"
      >
        <PictureAsPdfRoundedIcon sx={{ fontSize: 18 }} />
        Baixar PDF
      </motion.a>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        onClick={shareReceipt}
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-4 text-xs font-semibold text-[#d9dade] transition-colors hover:bg-white/[0.07]"
      >
        <ShareRoundedIcon sx={{ fontSize: 18 }} />
        {shared ? "Link copiado" : "Compartilhar"}
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
