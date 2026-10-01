import { cashMovementCents } from "@/lib/card";
import { brazilDay } from "@/lib/bank";
import { INITIAL_BALANCE } from "@/lib/transfer";
import type { Transaction } from "@/types/transaction";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
function escape(value: string) { return value.replace(/[^\x20-\xFF]/g, " ").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"); }
function text(value: string, x: number, y: number, size = 10, bold = false, color = ".17 .18 .21") { return `${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escape(value)}) Tj ET\n`; }
function wrapped(value: string, limit: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    if ((line + " " + word).trim().length > limit) { if (line) lines.push(line); line = word.slice(0, limit); }
    else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export function buildStatementPdf(transactions: readonly Transaction[], month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido.");
  const items = transactions.filter((item) => brazilDay(new Date(item.criado_em)).startsWith(month)).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const opening = Math.round(INITIAL_BALANCE * 100) + transactions.filter((item) => brazilDay(new Date(item.criado_em)).slice(0, 7) < month).reduce((sum, item) => sum + cashMovementCents(item), 0);
  const closing = opening + items.reduce((sum, item) => sum + cashMovementCents(item), 0);
  const cashIn = items.reduce((sum, item) => sum + Math.max(0, cashMovementCents(item)), 0);
  const cashOut = items.reduce((sum, item) => sum + Math.max(0, -cashMovementCents(item)), 0);
  const credit = items.filter((item) => item.metodo === "Cartão de crédito").reduce((sum, item) => sum + Math.round(item.valor * 100), 0);
  const chunks = [items.slice(0, 8)];
  for (let start = 8; start < items.length; start += 11) chunks.push(items.slice(start, start + 11));
  let running = opening;
  const pages = chunks.map((entries, page) => {
    let content = "1 1 1 rg 0 0 595 842 re f\n.045 .049 .057 rg 0 743 595 99 re f\n";
    content += text("saldo.", 40, 785, 25, true, ".85 .80 .98");
    content += text("EXTRATO DEMONSTRATIVO", 345, 789, 9, true, ".70 .71 .74");
    content += text(`Conta Daniel | ${month.slice(5)}/${month.slice(0, 4)}`, 40, 711, 18, true);
    content += text("Carteira acadêmica - lançamentos registrados na aplicação", 40, 689, 9, false, ".47 .49 .53");
    let y = 637;
    if (page === 0) {
      content += ".96 .96 .97 rg 40 560 515 100 re f\n";
      content += text("SALDO INICIAL", 55, 639, 8, true, ".45 .47 .51") + text(money(opening), 55, 614, 19, true);
      content += text("SALDO FINAL DISPONÍVEL", 310, 639, 8, true, ".45 .47 .51") + text(money(closing), 310, 614, 19, true);
      content += text(`Entradas no saldo: ${money(cashIn)}`, 55, 583, 9) + text(`Saídas do saldo: ${money(cashOut)}`, 310, 583, 9);
      content += text(`Compras no crédito (sem débito imediato): ${money(credit)}`, 40, 537, 9, true);
      y = 500;
    }
    content += ".87 .88 .90 RG 40 " + (y + 16) + " m 555 " + (y + 16) + " l S\n";
    content += text("DATA / LANÇAMENTO", 40, y, 8, true, ".45 .47 .51") + text("VALOR", 355, y, 8, true, ".45 .47 .51") + text("SALDO APÓS", 456, y, 8, true, ".45 .47 .51");
    y -= 28;
    if (!entries.length) content += text("Nenhum lançamento registrado neste mês.", 40, y, 11);
    for (const item of entries) {
      running += cashMovementCents(item);
      const date = brazilDay(new Date(item.criado_em));
      const description = wrapped(`${date.slice(8)}/${date.slice(5, 7)}  ${item.destinatario || item.descricao}`, 43);
      description.forEach((line, index) => { content += text(line, 40, y - index * 11, 9.5, index === 0); });
      const method = `${item.metodo || (item.tipo === "receita" ? "Receita" : "Despesa")} | ${item.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      content += text(method, 40, y - 25, 7.5, false, ".47 .49 .53");
      const amount = (item.metodo === "Cartão de crédito" ? "" : item.tipo === "receita" ? "+" : "-") + money(Math.round(item.valor * 100));
      content += text(amount, 355, y, Math.min(9, 87 / (amount.length * .55)), true);
      const balance = money(running);
      content += text(balance, 456, y, Math.min(9, 97 / (balance.length * .55)));
      if (item.metodo === "Cartão de crédito") content += text("No crédito", 355, y - 17, 7.5, false, ".47 .49 .53");
      content += `.92 .92 .94 RG 40 ${y - 35} m 555 ${y - 35} l S\n`;
      y -= 45;
    }
    content += text("O saldo inclui aportes e resgates internos e pagamentos de fatura.", 40, 92, 8, false, ".47 .49 .53");
    content += text("Compras no crédito usam limite; afetam o saldo apenas quando a fatura é paga.", 40, 78, 8, false, ".47 .49 .53");
    content += ".87 .88 .90 RG 40 65 m 555 65 l S\n";
    content += text("Não comprova liquidação bancária. Dados informados pelo usuário.", 40, 48, 8, false, ".47 .49 .53");
    content += text(`${page + 1} / ${chunks.length}`, 521, 48, 8, true, ".47 .49 .53");
    return content;
  });
  const font1 = 3 + pages.length * 2, font2 = font1 + 1;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`];
  pages.forEach((page, index) => { objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`, `<< /Length ${page.length} >>\nstream\n${page}endstream`); });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Uint8Array.from(pdf, (character) => character.charCodeAt(0));
}
