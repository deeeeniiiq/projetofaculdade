export type PriceAlert = {
  id: string;
  address: string;
  name: string;
  symbol: string;
  targetUsd: number;
  direction: "above" | "below";
  createdAt: number;
  triggeredAt: number | null;
};

export function evaluatePriceAlerts(
  alerts: PriceAlert[],
  prices: ReadonlyMap<string, number>,
  now: number,
): { alerts: PriceAlert[]; triggered: PriceAlert[] } {
  const triggered: PriceAlert[] = [];
  const next = alerts.map((alert) => {
    const price = prices.get(alert.address);
    if (alert.triggeredAt || !Number.isFinite(price) || !price || !Number.isFinite(alert.targetUsd) || alert.targetUsd <= 0) return alert;
    const hit = alert.direction === "above" ? price >= alert.targetUsd : price <= alert.targetUsd;
    if (!hit) return alert;
    const updated = { ...alert, triggeredAt: now };
    triggered.push(updated);
    return updated;
  });
  return { alerts: next, triggered };
}
