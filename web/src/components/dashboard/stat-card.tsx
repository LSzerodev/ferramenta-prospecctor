import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: boolean;
};

export function StatCard({ label, value, sub, icon: Icon, accent }: Props) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        accent
          ? "border-blue-500/40 bg-blue-500/5"
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <Icon className="size-4 shrink-0 text-zinc-500" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">{value}</p>
      {sub ? (
        <p className="mt-1 font-mono text-[11px] text-zinc-500">{sub}</p>
      ) : null}
    </article>
  );
}
