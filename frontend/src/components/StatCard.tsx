export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "#8b5cf6",
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="card group relative overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${accent}1f`, border: `1px solid ${accent}44` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold leading-none text-white">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-3 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}
