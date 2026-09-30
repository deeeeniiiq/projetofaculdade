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

  let content = "0.975 0.976 0.98 rg 0 0 595 842 re f\n";
  content += "0.055 0.059 0.067 rg 0 744 595 98 re f\n";
  content += "0.73 0.67 0.96 rg 42 744 104 3 re f\n";
  content += drawText("saldo.", 42, 785, 24, "F2", [0.98, 0.98, 0.99]);
  content += drawText("CARTEIRA VIRTUAL", 431, 788, 9, "F2", [0.67, 0.69, 0.73]);
  content += drawText("REGISTRO DEMONSTRATIVO", 42, 710, 9, "F2", [0.41, 0.35, 0.65]);
  content += drawText("Comprovante", 42, 678, 21, "F2", [0.11, 0.12, 0.14]);
  content += drawText(amount, 42, 623, Math.min(35, Math.floor(510 / Math.max(amount.length * 0.58, 1))), "F2", isIncome ? [0.12, 0.43, 0.29] : [0.12, 0.13, 0.15]);
  content += "0.91 0.89 0.97 rg 42 579 152 25 re f\n";
  content += drawText("SIMULAÇÃO REGISTRADA", 52, 587, 9, "F2", [0.35, 0.29, 0.53]);
  content += "0.86 0.87 0.89 RG 42 560 m 553 560 l S\n";

  let y = 543;
  for (const [label, rawValue] of rows) {
    const wrapped = lines(rawValue, 77);
    content += drawText(label.toUpperCase(), 42, y, 8, "F2", [0.48, 0.5, 0.53]);
    wrapped.forEach((line, index) => {
      content += drawText(line, 42, y - 18 - index * 13, 10.5, "F1", [0.13, 0.14, 0.16]);
    });
    y -= 41 + (wrapped.length - 1) * 13;
    content += `0.91 0.91 0.92 RG 42 ${y + 9} m 553 ${y + 9} l S\n`;
  }

  const qr = QRCode.create(code, { errorCorrectionLevel: "M" }).modules;
  const unit = 2.7;
  const qrSize = (qr.size + 8) * unit;
  content += `1 1 1 rg 42 83 ${qrSize} ${qrSize} re f\n0.09 0.1 0.12 rg\n`;
  for (let row = 0; row < qr.size; row++) for (let col = 0; col < qr.size; col++) {
    if (qr.get(row, col)) content += `${42 + 4 * unit + col * unit} ${83 + qrSize - 4 * unit - (row + 1) * unit} ${unit} ${unit} re f\n`;
  }
  content += drawText("VERIFIQUE O IDENTIFICADOR", 152, 157, 9, "F2", [0.45, 0.46, 0.49]);
  content += drawText(code, 152, 137, 12, "F2", [0.13, 0.14, 0.16]);
  content += drawText("QR e código identificam este registro interno.", 152, 116, 9, "F1", [0.45, 0.46, 0.49]);
  content += "0.86 0.87 0.89 RG 42 73 m 553 73 l S\n";
  content += drawText("Este documento não comprova pagamento bancário ou transferência na blockchain.", 42, 54, 8.5, "F1", [0.42, 0.44, 0.47]);
  content += drawText("Dados informados pelo usuário. Saldo - projeto acadêmico.", 42, 39, 8.5, "F1", [0.42, 0.44, 0.47]);

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
