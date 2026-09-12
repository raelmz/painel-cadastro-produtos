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
    <header className="mb-10 border-b border-(--line) pb-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-(--muted) hover:text-(--foreground) transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Painel
      </Link>
      <p
        className="font-mono-data text-[13px] mb-3"
        style={{ color: `var(${accentVar})` }}
      >
        {eyebrow}
      </p>
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-(--muted) text-sm md:text-base leading-relaxed">
        {description}
      </p>
    </header>
  );
}