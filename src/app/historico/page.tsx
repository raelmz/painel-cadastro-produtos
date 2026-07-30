"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, SpellCheck2 } from "lucide-react";
import Link from "next/link";
import { storage } from "@/lib/storage";

interface HistoricoVerificacao {
  executadoEm: string;
  total: number;
  encontrados: number;
  divergencias: number;
  revisar: number;
  naoEncontrados: number;
}

interface HistoricoPadronizacao {
  executadoEm: string;
  total: number;
  [key: string]: unknown;
}

export default function HistoricoPage() {
  // Mesmo padrão de hidratação usado no Verificador/Padronizador: estado
  // começa vazio, só lê o localStorage depois de montar no cliente.
  const [mounted, setMounted] = useState(false);
  const [verificacoes, setVerificacoes] = useState<HistoricoVerificacao[]>([]);
  const [padronizacoes, setPadronizacoes] = useState<HistoricoPadronizacao[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVerificacoes(storage.getHistoricoVerificacoes<HistoricoVerificacao>());
      setPadronizacoes(storage.getHistoricoPadronizacoes<HistoricoPadronizacao>());
      setMounted(true);
    });

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-(--muted) hover:text-(--foreground) transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Painel
        </Link>
        <p className="font-mono-data text-xs tracking-[0.25em] mb-3 uppercase text-(--steel)">Histórico</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-10">
          Histórico de execuções
        </h1>

        <section className="mb-12">
          <SectionTitle icon={<ClipboardCheck className="w-4 h-4" />} title="Verificações de inventário" />
          {!mounted ? null : verificacoes.length === 0 ? (
            <EmptyState texto="Nenhuma verificação executada ainda. Rode o Verificador de Inventário pelo menos uma vez." />
          ) : (
            <div className="rounded-xl border border-(--line) overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/3">
                  <tr className="text-left text-xs text-(--muted) uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Executado em</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">✅ Encontrados</th>
                    <th className="px-4 py-3 font-medium text-right">⚠️ Divergências</th>
                    <th className="px-4 py-3 font-medium text-right">❓ Revisar</th>
                    <th className="px-4 py-3 font-medium text-right">❌ Não encontrados</th>
                  </tr>
                </thead>
                <tbody>
                  {verificacoes.map((v, i) => (
                    <tr key={i} className="border-t border-(--line) hover:bg-white/2">
                      <td className="px-4 py-3 font-mono-data">{v.executadoEm}</td>
                      <td className="px-4 py-3 text-right font-mono-data">{v.total}</td>
                      <td className="px-4 py-3 text-right font-mono-data text-(--ok)">{v.encontrados}</td>
                      <td className="px-4 py-3 text-right font-mono-data text-(--accent)">{v.divergencias}</td>
                      <td className="px-4 py-3 text-right font-mono-data text-[#a78bfa]">{v.revisar}</td>
                      <td className="px-4 py-3 text-right font-mono-data text-(--danger)">{v.naoEncontrados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={<SpellCheck2 className="w-4 h-4" />} title="Padronizações de nomenclatura" />
          {!mounted ? null : padronizacoes.length === 0 ? (
            <EmptyState texto="Nenhuma padronização executada ainda. Rode o Padronizador de Nomenclatura pelo menos uma vez." />
          ) : (
            <div className="rounded-xl border border-(--line) overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/3">
                  <tr className="text-left text-xs text-(--muted) uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Executado em</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {padronizacoes.map((p, i) => (
                    <tr key={i} className="border-t border-(--line) hover:bg-white/2">
                      <td className="px-4 py-3 font-mono-data">{p.executadoEm}</td>
                      <td className="px-4 py-3 text-right font-mono-data">{p.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-(--accent)">{icon}</span>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="h-px flex-1 bg-(--line)" />
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-dashed border-(--line) bg-white/2 px-5 py-8 text-center text-sm text-(--muted)">
      {texto}
    </div>
  );
}