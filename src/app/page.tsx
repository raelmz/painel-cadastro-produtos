import Link from "next/link";
import { ClipboardCheck, SprayCan, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24 flex-1 flex flex-col">
        <header className="mb-14 md:mb-20">
          <p className="font-mono-data text-xs tracking-[0.25em] text-(--accent) mb-4 uppercase">
            Gestão de Catálogo de Produtos
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Painel de
            <br />
            Cadastro de Produtos
          </h1>
          <p className="mt-5 max-w-lg text-(--muted) text-base md:text-lg">
            Duas ferramentas, uma bancada só: confira o estoque físico contra
            o sistema e mantenha os nomes dos produtos sempre no mesmo padrão.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6 flex-1">
          <StationCard
            href="/verificador"
            tag="ESTAÇÃO 01"
            icon={<ClipboardCheck className="w-7 h-7" strokeWidth={1.75} />}
            title="Verificador de Inventário"
            description="Cole ou digite a contagem física do estoque e compare item a item contra a base de produtos importada."
            bullets={[
              "Contagem manual, colada ou por planilha",
              "Aponta divergências, duplicados e itens inativos",
              "Exporta relatório em Excel formatado ou CSV",
            ]}
            accentVar="--accent"
          />
          <StationCard
            href="/padronizador"
            tag="ESTAÇÃO 02"
            icon={<SprayCan className="w-7 h-7" strokeWidth={1.75} />}
            title="Padronizador de Nomenclatura"
            description="Unifique nomes diferentes do mesmo produto num único padrão oficial — evita cadastro duplicado."
            bullets={[
              '"ELEMENTO FILTRANTE H100" → "FILTRO DE ÓLEO H100"',
              "Corrige maiúsculas, acentos e formato de embalagem",
              "Dicionário de equivalências editável por você",
            ]}
            accentVar="--steel"
          />
        </div>

        <footer className="mt-14 md:mt-20 flex items-center justify-between text-xs text-(--muted) font-mono-data">
          <span>Dados salvos localmente neste navegador — nenhuma nuvem envolvida.</span>
          <span>v1.0</span>
        </footer>
      </div>
    </main>
  );
}

function StationCard({
  href,
  tag,
  icon,
  title,
  description,
  bullets,
  accentVar,
}: {
  href: string;
  tag: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  accentVar: "--accent" | "--steel";
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-2xl border p-7 md:p-8 transition-all duration-200 hover:-translate-y-1"
      style={{
        borderColor: "var(--line)",
        background:
          "linear-gradient(160deg, var(--surface) 0%, var(--surface-2) 100%)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-80"
        style={{ background: `var(${accentVar})` }}
      />

      <div>
        <div className="flex items-center justify-between mb-6">
          <span
            className="font-mono-data text-[11px] tracking-[0.2em] px-2 py-1 rounded border"
            style={{ borderColor: "var(--line)", color: `var(${accentVar})` }}
          >
            {tag}
          </span>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "rgba(255,255,255,0.04)", color: `var(${accentVar})` }}
          >
            {icon}
          </div>
        </div>

        <h2 className="font-display text-2xl md:text-[1.7rem] font-semibold mb-3">
          {title}
        </h2>
        <p className="text-(--muted) text-sm md:text-[0.95rem] leading-relaxed mb-6">
          {description}
        </p>

        <ul className="space-y-2 mb-8">
          {bullets.map((b) => (
            <li key={b} className="text-sm flex gap-2.5 leading-snug">
              <span style={{ color: `var(${accentVar})` }}>—</span>
              <span className="text-(--foreground)/90">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="flex items-center gap-2 text-sm font-medium pt-4 border-t"
        style={{ borderColor: "var(--line)", color: `var(${accentVar})` }}
      >
        Abrir estação
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}