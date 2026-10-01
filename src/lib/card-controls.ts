export type CardRules = { online: boolean; contactless: boolean; capCents: number };
export type TemporaryCard = { id: string; number: string; expires: number; used: boolean };
export const defaultRules: CardRules = { online: true, contactless: true, capCents: 500_000 };
export function cardRuleError(rules: CardRules, channel: "Online" | "Aproximação", cents: number, temporary?: TemporaryCard | null, now = Date.now()) {
  if (channel === "Online" && !rules.online) return "Compras online estão desativadas neste aparelho.";
  if (channel === "Aproximação" && !rules.contactless) return "Aproximação está desativada neste aparelho.";
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > rules.capCents) return "Valor acima do limite por compra definido nos controles.";
  if (temporary && (temporary.used || temporary.expires <= now)) return "Cartão temporário utilizado ou expirado. Gere outro número fictício.";
  if (temporary && channel !== "Online") return "O cartão temporário demonstrativo é usado apenas na compra online.";
  return "";
}
