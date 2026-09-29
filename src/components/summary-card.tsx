import type { LucideIcon } from "lucide-react";

type SummaryCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: "neutral" | "positive" | "negative";
};

const tones = {
  neutral: { icon: "bg-[#e8f3eb] text-[#255b39]", value: "text-[#17201a]" },
  positive: { icon: "bg-[#edf7ef] text-[#2c6a40]", value: "text-[#235b36]" },
  negative: { icon: "bg-[#fff0ee] text-[#a84439]", value: "text-[#9f3b31]" },
};

export function SummaryCard({ label, value, helper, icon: Icon, tone }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-[#dfe5df] bg-white p-5 shadow-[0_1px_2px_rgba(17,36,24,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6a746d]">{label}</p>
          <p className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${tones[tone].value}`}>
            {value}
          </p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone].icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs text-[#8a938c]">{helper}</p>
    </article>
  );
}
