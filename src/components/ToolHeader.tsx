import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ToolHeader({
  eyebrow,
  title,
  description,
  accentVar = "--accent",
}: {
  eyebrow: string;
  title: string;
  description: string;
  accentVar?: "--accent" | "--steel";
}) {
  return (
    <header className="mb-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Painel
      </Link>
      <p
        className="font-mono-data text-xs tracking-[0.25em] mb-3 uppercase"
        style={{ color: `var(${accentVar})` }}
      >
        {eyebrow}
      </p>
      <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)] text-sm md:text-base">
        {description}
      </p>
    </header>
  );
}
