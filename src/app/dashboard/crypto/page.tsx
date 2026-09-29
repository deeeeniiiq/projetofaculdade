import { CryptoMarket } from "@/components/crypto-market";
import { coins } from "@/lib/market";

export default async function CryptoPage({ searchParams }: { searchParams: Promise<{ coin?: string; mode?: string }> }) {
  const { coin, mode } = await searchParams;
  const initialCoin = coins.find((item) => item.id === coin)?.id ?? "solana";
  return <CryptoMarket initialCoin={initialCoin} initialMode={mode === "swap" ? "swap" : "buy"} />;
}
