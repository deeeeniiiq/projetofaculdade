import type { Transaction } from "@/types/transaction";

export const RESERVE_IN = "Aporte no cofre";
export const RESERVE_OUT = "Resgate do cofre";
export const DEMO_PIX_KEY = "demo@saldo.invalid";
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type Goal = { id: string; name: string; target: number; date: string };
export type ScheduledPayment = { id: string; recipient: string; destination: string; cents: number; date: string; recurring: boolean; day: number; paused: boolean; receipt?: string };
export type Collection = { id: string; title: string; cents: number; people: { name: string; cents: number; paid: boolean }[] };

export function brazilDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).formatToParts(date);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key)?.value).join("-");
}

export function nextMonthlyDate(day: number, current: string) {
  const [year, month] = current.split("-").map(Number);
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export function allocateCents(cents: number, count: number) {
  if (!Number.isSafeInteger(cents) || cents <= 0 || !Number.isInteger(count) || count < 1 || count > 20 || cents < count) throw new Error("Informe um valor que permita pelo menos R$ 0,01 por pessoa.");
  return Array.from({ length: count }, (_, index) => Math.floor(cents / count) + (index < cents % count ? 1 : 0));
}

export function reserveBalance(transactions: readonly Transaction[], id: string) {
  return transactions.reduce((sum, item) => item.identificador === id && (item.metodo === RESERVE_IN || item.metodo === RESERVE_OUT)
    ? sum + Math.round(item.valor * 100) * (item.metodo === RESERVE_IN ? 1 : -1) : sum, 0);
}

export function crc16(value: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const ascii = (value: string, max: number) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").slice(0, max).toUpperCase();
const tlv = (id: string, value: string) => id + String(value.length).padStart(2, "0") + value;

export function buildPix(cents: number, name: string, message = "", reference = "SALDODEMO") {
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 100_000_000) throw new Error("Informe um valor válido para a cobrança.");
  const merchant = tlv("00", "br.gov.bcb.pix") + tlv("01", DEMO_PIX_KEY) + (message ? tlv("02", ascii(message, 50)) : "");
  const body = tlv("00", "01") + tlv("26", merchant) + tlv("52", "0000") + tlv("53", "986") + tlv("54", (cents / 100).toFixed(2)) + tlv("58", "BR") + tlv("59", ascii(name, 25) || "DANIEL") + tlv("60", "SAO PAULO") + tlv("62", tlv("05", reference.replace(/[^a-z0-9]/gi, "").slice(0, 25) || "SALDODEMO")) + "6304";
  return body + crc16(body);
}

function fields(payload: string) {
  const result: Record<string, string> = {};
  let cursor = 0;
  while (cursor < payload.length) {
    const id = payload.slice(cursor, cursor + 2), lengthText = payload.slice(cursor + 2, cursor + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lengthText) || result[id] != null) throw new Error("Formato de QR inválido.");
    const length = Number(lengthText);
    if (cursor + 4 + length > payload.length) throw new Error("Código incompleto.");
    result[id] = payload.slice(cursor + 4, cursor + 4 + length);
    cursor += 4 + length;
  }
  return result;
}

export function parsePix(raw: string) {
  const payload = raw.trim();
  if (payload.length > 1000 || !payload.endsWith("6304" + crc16(payload.slice(0, -4)))) throw new Error("Código PIX inválido ou checksum incorreto.");
  const root = fields(payload);
  if (root["00"] !== "01" || root["53"] !== "986" || root["58"] !== "BR") throw new Error("Este código não é um PIX em reais.");
  const account = Object.entries(root).filter(([id]) => Number(id) >= 26 && Number(id) <= 51).map(([, value]) => fields(value)).find((item) => item["00"]?.toLowerCase() === "br.gov.bcb.pix");
  if (!account?.["01"]) throw new Error("Use um QR estático com chave PIX. QR dinâmico de banco exige integração bancária.");
  if (root["54"] && !/^\d{1,8}(\.\d{2})?$/.test(root["54"])) throw new Error("Valor inválido no código.");
  const cents = root["54"] ? Math.round(Number(root["54"]) * 100) : 0;
  if (cents > 100_000_000) throw new Error("Valor acima do limite demonstrativo.");
  return { recipient: root["59"] || "Destinatário PIX", destination: account["01"], cents, message: account["02"] || "" };
}

export function modulo10(value: string) {
  let sum = 0;
  [...value].reverse().forEach((digit, index) => { const product = Number(digit) * (index % 2 ? 1 : 2); sum += Math.floor(product / 10) + product % 10; });
  return (10 - sum % 10) % 10;
}
function boletoDigit(barcode: string) {
  let sum = 0, weight = 2;
  for (let index = barcode.length - 1; index >= 0; index--) { if (index === 4) continue; sum += Number(barcode[index]) * weight; weight = weight === 9 ? 2 : weight + 1; }
  const digit = 11 - sum % 11;
  return digit > 9 || digit === 0 ? 1 : digit;
}
export function parseBoleto(raw: string) {
  if (/[^\d .-]/.test(raw)) throw new Error("Use apenas os números da linha digitável.");
  const line = raw.replace(/\D/g, "");
  if (line.length !== 47 || line[3] !== "9") throw new Error("Use um boleto bancário de 47 dígitos em reais. Contas de 48 dígitos não são suportadas.");
  for (const [start, length] of [[0, 9], [10, 10], [21, 10]]) if (modulo10(line.slice(start, start + length)) !== Number(line[start + length])) throw new Error("Dígito verificador do boleto incorreto.");
  const barcode = line.slice(0, 4) + line[32] + line.slice(33) + line.slice(4, 9) + line.slice(10, 20) + line.slice(21, 31);
  if (boletoDigit(barcode) !== Number(line[32])) throw new Error("Dígito geral do boleto incorreto.");
  const cents = Number(line.slice(37));
  if (cents <= 0 || cents > 100_000_000) throw new Error("Use um boleto com valor definido até R$ 1.000.000.");
  return { line, barcode, bank: line.slice(0, 3), cents };
}
export function demoBoleto(cents = 12990) {
  const barcode = "9999" + "0" + "0000" + String(cents).padStart(10, "0") + "0000000000000000000000000";
  const digit = String(boletoDigit(barcode));
  const a = barcode.slice(0, 4) + barcode.slice(19, 24), b = barcode.slice(24, 34), c = barcode.slice(34);
  return a + modulo10(a) + b + modulo10(b) + c + modulo10(c) + digit + barcode.slice(5, 19);
}

export function monthlySummary(transactions: readonly Transaction[], month: string) {
  const selected = transactions.filter((item) => brazilDay(new Date(item.criado_em)).startsWith(month));
  const external = selected.filter((item) => ![RESERVE_IN, RESERVE_OUT, "Pagamento de fatura"].includes(item.metodo || ""));
  const income = external.filter((item) => item.tipo === "receita").reduce((sum, item) => sum + Math.round(item.valor * 100), 0);
  const expenses = external.filter((item) => item.tipo === "despesa").reduce((sum, item) => sum + Math.round(item.valor * 100), 0);
  const categories = new Map<string, number>();
  external.filter((item) => item.tipo === "despesa").forEach((item) => { const key = item.categoria || "Outros"; categories.set(key, (categories.get(key) || 0) + Math.round(item.valor * 100)); });
  return { selected, income, expenses, categories: [...categories].sort((a, b) => b[1] - a[1]) };
}

export function detectSubscriptions(transactions: readonly Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const item of transactions) {
    if (item.tipo !== "despesa" || [RESERVE_IN, "Pagamento de fatura"].includes(item.metodo || "")) continue;
    const key = (item.destinatario || item.descricao).trim().toLocaleLowerCase("pt-BR");
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return [...groups.values()].filter((items) => items.some((item) => item.categoria === "Assinaturas") || new Set(items.map((item) => brazilDay(new Date(item.criado_em)).slice(0, 7))).size >= 2)
    .map((items) => ({ latest: [...items].sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0], count: items.length }));
}
