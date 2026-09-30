/* eslint-disable @next/next/no-img-element */

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ReceiptActions } from "@/components/receipt-actions";
import { getTransactionDetails } from "@/lib/transaction-details";
import { getTransactionById } from "@/lib/transactions";
import { CARD_BILL_METHOD, CARD_PURCHASE_METHOD } from "@/lib/card";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" });

type ReceiptPageProps = { params: Promise<{ id: string }> };

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const transaction = await getTransactionById(id);
  if (!transaction) notFound();

  const details = getTransactionDetails(transaction);
  const receiptCode = `SLD-${transaction.id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const isIncome = transaction.tipo === "receita";
  const backHref = transaction.metodo === CARD_PURCHASE_METHOD || transaction.metodo === CARD_BILL_METHOD
    ? "/dashboard/cartao" : "/dashboard";
  const receiptQr = await QRCode.toDataURL(
    JSON.stringify({
      type: "saldo-receipt",
      code: receiptCode,
      transactionId: transaction.id,
      amount: transaction.valor,
      createdAt: transaction.criado_em,
    }),
    {
      width: 280,
      margin: 1,
      color: { dark: "#111214", light: "#f7f7f8" },
    },
  );
  const rows = [
    [isIncome ? "Origem informada" : "Destinatário informado", details.counterparty],
    [details.identityLabel, details.identity],
    ["Método", details.method],
    ["Categoria", details.category],
    ["Detalhe", details.location],
    ["Data (Brasília)", dateTime.format(new Date(transaction.criado_em))],
    ["Identificador", receiptCode],
  ];

  return (
    <main className="receipt-page min-h-screen bg-[#111214] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_90%_65%_at_50%_-12%,rgba(29,82,58,0.28),rgba(17,18,20,0)_70%)]" />
      <div className="relative mx-auto w-full max-w-[620px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <Link
          href={backHref}
          className="no-print inline-flex h-10 w-10 items-center justify-center rounded-full text-[#b8b9bc] transition hover:bg-white/[0.05] hover:text-white"
          aria-label="Voltar ao painel"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 22 }} />
        </Link>

        <section className="receipt-sheet mt-8 overflow-hidden rounded-[26px] border border-white/[0.055] bg-[#191b1d] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
          <div className="px-5 pb-7 pt-8 text-center sm:px-8 sm:pt-10">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#67df9c]/10 text-[#67df9c] ring-1 ring-inset ring-[#67df9c]/15">
              <CheckCircleRoundedIcon sx={{ fontSize: 24 }} />
            </span>
            <p className="mt-4 text-[11px] font-semibold text-[#8d8f93]">Simulação acadêmica · registro interno</p>
            <h1 className={`mt-2 text-[38px] font-semibold leading-none tracking-[-0.055em] sm:text-[46px] ${isIncome ? "text-[#70e3a3]" : "text-[#f4f4f5]"}`}>
              {isIncome ? "+" : "−"}{currency.format(transaction.valor)}
            </h1>
            <p className="mt-3 text-sm font-medium text-[#b1b2b5]">{transaction.descricao}</p>
          </div>

          <div className="border-t border-white/[0.055] px-5 sm:px-7">
            <dl>
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-6 border-b border-white/[0.05] py-4 last:border-b-0">
                  <dt className="shrink-0 text-[12px] text-[#6f7176]">{label}</dt>
                  <dd className={`min-w-0 max-w-[60%] break-all text-right text-[12px] font-medium leading-5 text-[#d9dade] ${label === "Identificador" ? "font-mono text-[10px] tracking-[0.04em] text-[#a4a6aa]" : ""}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-t border-white/[0.055] px-5 py-5 sm:px-7">
            <div className="flex items-center gap-4 rounded-[18px] border border-white/[0.055] bg-black/[0.13] p-3.5">
              <div className="shrink-0 rounded-[12px] bg-[#f7f7f8] p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.18)]">
                <img src={receiptQr} alt="QR do comprovante" className="h-[72px] w-[72px] rounded-[7px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[#d9dade]">QR do comprovante</p>
                <p className="mt-1 text-[9px] leading-4 text-[#73757a]">O QR carrega o identificador, valor e horário deste registro para conferência rápida.</p>
                <p className="mt-1.5 truncate font-mono text-[8px] tracking-[0.04em] text-[#67df9c]/70">{receiptCode}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.055] bg-black/[0.08] px-5 py-5 sm:px-7">
            <ReceiptActions receiptCode={receiptCode} transactionId={transaction.id} />
            <p className="no-print mt-3 text-center text-[10px] leading-4 text-[#64666b]">
              Dados informados pelo usuário. Este registro não comprova liquidação bancária ou transferência na blockchain.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
