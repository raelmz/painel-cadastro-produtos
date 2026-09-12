export function StatusBadge({ situacao }: { situacao: string }) {
  let cls = "bg-white/5 text-(--muted) border-(--line-strong)";
  if (situacao.startsWith("✅")) {
    cls = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (situacao.startsWith("⚠️")) {
    cls = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else if (situacao.startsWith("❓")) {
    cls = "bg-violet-500/10 text-violet-400 border-violet-500/30";
  } else if (situacao.startsWith("❌")) {
    cls = "bg-red-500/10 text-red-400 border-red-500/30";
  } else if (situacao.startsWith("🤖")) {
    cls = "bg-sky-500/10 text-sky-400 border-sky-500/30";
  }
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2 py-1 text-xs font-medium ${cls}`}
    >
      {situacao}
    </span>
  );
}