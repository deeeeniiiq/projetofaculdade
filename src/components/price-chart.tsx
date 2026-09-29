"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPrice, type ChartPoint, type MarketRange } from "@/lib/market";

export function PriceChart({ points, range, compact = false }: { points: ChartPoint[]; range: MarketRange; compact?: boolean }) {
  const gradientId = useId().replace(/:/g, "");
  const reducedMotion = useReducedMotion();
  const first = points[0]?.price ?? 0;
  const last = points.at(-1)?.price ?? 0;
  const color = last >= first ? "#78e5ad" : "#f18192";
  const formatTime = (value: number) => new Date(value).toLocaleString("pt-BR", range === "1d" ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" });

  return (
    <div className={compact ? "h-[195px] w-full sm:h-[220px]" : "h-[260px] w-full sm:h-[340px]"} role="group" aria-label="Histórico de preço. Use as setas do teclado ou toque no gráfico para consultar valores.">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} debounce={60}>
        <AreaChart data={points} margin={{ top: 22, right: 8, left: 8, bottom: 4 }} accessibilityLayer>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.19} />
              <stop offset="90%" stopColor={color} stopOpacity={0.005} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.035)" strokeDasharray="3 7" />
          <XAxis dataKey="timestamp" type="number" domain={["dataMin", "dataMax"]} tickFormatter={formatTime} tick={{ fill: "#747a7d", fontSize: 10 }} tickLine={false} axisLine={false} tickCount={compact ? 3 : 5} minTickGap={60} tickMargin={12} />
          <YAxis hide domain={[(min: number) => min * 0.9985, (max: number) => max * 1.0015]} />
          <ReferenceLine y={first} stroke="rgba(255,255,255,.16)" strokeDasharray="4 5" />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: "rgba(220,233,226,.35)", strokeDasharray: "3 4" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as ChartPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-xl border border-white/10 bg-[#24282a]/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
                  <p className="text-[10px] text-[#a0a5a7]">{new Date(point.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white">{formatPrice(point.price)}</p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2.4} fill={`url(#${gradientId})`} isAnimationActive={!reducedMotion} animationDuration={650} animationEasing="ease-out" dot={false} activeDot={{ r: 5, fill: color, stroke: "#1a1d1e", strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
