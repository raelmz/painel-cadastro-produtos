import Link from "next/link";
import { ClipboardCheck, SprayCan, ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col relative">
      <div className="absolute inset-0 bg-grid pointer-events-none" />

      <div className="relative mx-auto w-full max-w-5xl px-6 py-16 md:py-24 flex-1 flex flex-col">
        <header className="mb-16 md:mb-24 border-b border-(--line) pb-12">
          <div className="flex items-baseline justify-between gap-6 mb-8">
            <p className="font-mono-data text-[13px] text-(--muted)">
              Gestão de Catálogo de Produtos
            </p>
            <p className="font-mono-data text-[13px] text-(--muted-2)">
              v1.0
            </p>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-medium leading-[0.98] max-w-3xl">
            Painel de cadastro de produtos
          </h1>
          <p className="mt-6 max-w-md text-(--muted) text-base md:text-lg leading-relaxed">
            Duas ferramentas, uma bancada só: confira o estoque físico contra
            o sistema e mantenha os nomes dos produtos sempre no mesmo padrão.
          </p>
        </header>

        <div className="grid md:grid-cols-2 flex-1 border border-(--line) divide-y md:divide-y-0 md:divide-x divide-(--line)">
          <StationCard
            href="/verificador"
            index="01"
            icon={<ClipboardCheck className="w-6 h-6" strokeWidth={1.5} />}
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
            index="02"
            icon={<SprayCan className="w-6 h-6" strokeWidth={1.5} />}
            title="Padronizador de Nomenclatura"
            description="Unifique nomes diferentes do mesmo produto num único padrão oficial e evite cadastro duplicado."
            bullets={[
              '"ELEMENTO FILTRANTE H100" → "FILTRO DE ÓLEO H100"',
              "Corrige maiúsculas, acentos e formato de embalagem",
              "Dicionário de equivalências editável por você",
            ]}
            accentVar="--steel"
          />
        </div>

        <footer className="mt-10 flex items-center justify-between text-[12px] text-(--muted-2) font-mono-data">
          <span>Dados salvos localmente neste navegador — nenhuma nuvem envolvida.</span>
        </footer>
      </div>
    </main>
  );
}

function StationCard({
  href,
  index,
  icon,
  title,
  description,
  bullets,
  accentVar,
}: {
  href: string;
  index: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  accentVar: "--accent" | "--steel";
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between p-8 md:p-10 bg-(--surface) transition-colors duration-150 hover:bg-(--surface-2)"
    >
      <div>
        <div className="flex items-start justify-between mb-10">
          <span className="font-mono-data text-[13px] text-(--muted-2)">
            {index}
          </span>
          <div
            className="flex items-center justify-center w-11 h-11 border transition-colors duration-150"
            style={{ borderColor: "var(--line-strong)", color: `var(${accentVar})` }}
          >
            {icon}
          </div>
        </div>

        <h2 className="font-display text-2xl md:text-[1.8rem] font-medium mb-3 leading-tight">
          {title}
        </h2>
        <p className="text-(--muted) text-[0.95rem] leading-relaxed mb-8 max-w-sm">
          {description}
        </p>

        <ul className="space-y-2.5 mb-10">
          {bullets.map((b) => (
            <li key={b} className="text-sm flex gap-3 leading-snug text-(--foreground)/85">
              <span
                className="mt-2 h-px w-3 shrink-0"
                style={{ background: `var(${accentVar})` }}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="flex items-center justify-between pt-5 border-t text-sm font-medium"
        style={{ borderColor: "var(--line)" }}
      >
        <span style={{ color: `var(${accentVar})` }}>Abrir estação</span>
        <ArrowUpRight
          className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color: `var(${accentVar})` }}
        />
      </div>
    </Link>
  );
}