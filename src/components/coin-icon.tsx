"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { coins } from "@/lib/market";

export function CoinIcon({ id, size = 36 }: { id: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const coin = coins.find((item) => item.id === id);
  return (
    <span className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#232628] ring-1 ring-inset ring-white/[0.07]" style={{ width: size, height: size }}>
      {coin && !failed ? (
        <img src={`/coins/${id}.${id === "polkadot" ? "jpg" : "png"}`} alt={`Logo ${coin.name}`} width={size} height={size} onError={() => setFailed(true)} className="h-full w-full object-contain" />
      ) : <span className="text-[10px] font-semibold text-white/60">{coin?.symbol ?? id.slice(0, 3)}</span>}
    </span>
  );
}
