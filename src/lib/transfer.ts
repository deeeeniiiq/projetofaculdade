export const INITIAL_BALANCE = 20487.63;

// Work in cents so splitting and balance checks never create fractions of a cent.
export function parseBRL(value: string): number {
  const raw = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw) && !/^\d+(?:\.\d{1,2})?$/.test(raw)) return 0;
  const grouped = /^\d{1,3}(?:\.\d{3})+$/.test(raw);
  const normalized = raw.includes(',') || grouped ? raw.replaceAll('.', '').replace(',', '.') : raw;
  const result = Number(normalized);
  return Number.isFinite(result) && result > 0 ? Math.round(result * 100) / 100 : 0;
}

export function splitBRL(total: number, people: number) {
  if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(people) || people < 2 || people > 50) return null;
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / people);
  return { share: base / 100, remainder: (cents - base * people) / 100 };
}

export function destinationKey(method: string, destination: string) {
  // Blockchain addresses are case-sensitive.
  return method + ':' + (method === 'PIX' ? destination.trim().toLowerCase() : destination.trim());
}

export function destinationError(method: string, destination: string) {
  const value = destination.trim();
  if (method === 'Carteira') return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value) ? '' : 'Use um endereço Solana completo (32 a 44 caracteres).';
  if (method !== 'PIX') return 'Selecione PIX ou Carteira.';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 180) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return '';
  const digits = value.replace(/\D/g, '');
  if (/^[+\d\s().-]+$/.test(value) && [11, 13, 14].includes(digits.length)) return '';
  return 'Informe CPF/CNPJ, telefone com DDD, e-mail ou chave aleatória no formato completo.';
}
