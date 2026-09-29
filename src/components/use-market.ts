"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CryptoResponse, MarketRange } from "@/lib/market";

export function useMarket(coinId: string, range: MarketRange) {
  const [data, setData] = useState<CryptoResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const lastRequest = useRef(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++lastRequest.current;
    let busy = false;
    async function load() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      setRefreshing(true);
      try {
        const response = await fetch(`/api/crypto?id=${coinId}&range=${range}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json() as CryptoResponse;
        if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar as cotações.");
        if (controller.signal.aborted || request !== lastRequest.current) return;
        setData(payload);
        setError("");
      } catch (error) {
        if (!controller.signal.aborted && request === lastRequest.current) {
          setError(error instanceof Error ? error.message : "Mercado indisponível.");
        }
      } finally {
        busy = false;
        if (!controller.signal.aborted && request === lastRequest.current) setRefreshing(false);
      }
    }
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [coinId, range, revision]);

  const currentData = data?.selected === coinId && data?.range === range ? data : null;
  return { data: currentData, markets: data?.markets ?? [], updatedAt: data?.updatedAt, error, refreshing, refresh };
}
