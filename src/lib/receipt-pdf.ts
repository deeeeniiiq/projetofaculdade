import { getTransactionDetails } from "@/lib/transaction-details";
import type { Transaction } from "@/types/transaction";
import QRCode from "qrcode";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function latin1(value: string) {
  return Array.from(value.replace(/[\r\n\t]/g, " ").replace(/[–—−]/g, "-").replace(/•/g, "/").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").normalize("NFC"))
    .map((character) => ((character.codePointAt(0) ?? 0) <= 255 ? character : "?"))
    .join("");
}

function pdfEscape(value: string) {
  return latin1(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function bytes(value: string) {
  const result = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    result[index] = value.charCodeAt(index) & 0xff;
  }
  return result;
}

function lines(value: string, max = 34) {
  const chunks: string[] = [];
  let remaining = value.replace(/\s+/g, " ").trim();
  while (remaining.length > max) {
    const space = remaining.lastIndexOf(" ", max);
    const end = space > max / 2 ? space : max;
    chunks.push(remaining.slice(0, end)); remaining = remaining.slice(end).trimStart();
  }
  chunks.push(remaining);
  return chunks;
}

function drawText(
  value: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2" = "F1",
  color: [number, number, number] = [0.82, 0.83, 0.84],
) {
  return `${color.join(" ")} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(value)}) Tj ET\n`;
}

export function receiptCodeFor(transaction: Transaction) {
  return `SLD-${transaction.id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export function buildReceiptPdf(transaction: Transaction) {
  const details = getTransactionDetails(transaction);
  const code = receiptCodeFor(transaction);
  const isIncome = transaction.tipo === "receita";
  const amount = `${isIncome ? "+" : "-"}${money.format(transaction.valor)}`;
  const rows = [
    [isIncome ? "Origem informada" : "Destinatário informado", details.counterparty],
    [details.identityLabel, details.identity],
    ["Método", details.method],
    ["Categoria", details.category],
    ["Detalhe", details.location],
    ["Data (Brasília)", dateTime.format(new Date(transaction.criado_em))],
    ["Identificador", code],
  ] as const;

  let content = "q\n0.067 0.071 0.078 rg 0 0 595 842 re f\nQ\n";
  content += "0.18 0.63 0.39 rg 0 837 595 5 re f\n";
  content += drawText("SALDO / REGISTRO DA CARTEIRA", 42, 790, 10, "F2", [0.4, 0.87, 0.61]);
  content += drawText("COMPROVANTE", 42, 756, 24, "F2", [0.95, 0.95, 0.96]);
  content += drawText("SIMULAÇÃO ACADÊMICA", 42, 729, 10, "F2", [0.4, 0.87, 0.61]);
  content += drawText(amount, 42, 677, 36, "F2", isIncome ? [0.4, 0.87, 0.61] : [0.96, 0.96, 0.97]);
  content += "0.15 0.16 0.17 RG 42 650 m 553 650 l S\n";

  let y = 626;
  for (const [label, rawValue] of rows) {
    content += drawText(label, 42, y, 9, "F1", [0.55, 0.56, 0.58]);
    const wrapped = lines(rawValue);
    wrapped.forEach((line, index) => { content += drawText(line, 204, y - index * 14, 10, "F1"); });
    y -= wrapped.length * 14 + 19;
    content += `0.12 0.13 0.14 RG 42 ${y + 12} m 553 ${y + 12} l S\n`;
  }

  const qr = QRCode.create(code, { errorCorrectionLevel: "M" }).modules;
  const unit = 2;
  const qrSize = (qr.size + 8) * unit;
  content += `1 1 1 rg 42 64 ${qrSize} ${qrSize} re f\n0.067 0.071 0.078 rg\n`;
  for (let row = 0; row < qr.size; row++) for (let col = 0; col < qr.size; col++) {
    if (qr.get(row,col)) content += `${50+col*unit} ${64+qrSize-8-(row+1)*unit} ${unit} ${unit} re f\n`;
  }
  content += drawText("QR do identificador", 130, 113, 10, "F2");
  content += drawText("Registro interno. Não comprova liquidação bancária", 130, 94, 9);
  content += drawText("ou transferência na blockchain.", 130, 80, 9);
  content += drawText("Dados informados pelo usuário. Saldo / Projeto acadêmico.", 42, 36, 8, "F1", [0.5, 0.52, 0.54]);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Title (${pdfEscape(`Comprovante ${code}`)}) /Producer (Saldo Wallet) >>`,
  ];

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return { code, data: bytes(pdf) };
}
