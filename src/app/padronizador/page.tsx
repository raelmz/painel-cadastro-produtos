"use client";

import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { Play, Download, Plus, Trash2, BookMarked } from "lucide-react";
import { ToolHeader } from "@/components/ToolHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { storage } from "@/lib/storage";
import { Synonym } from "@/lib/textUtils";
import { checkItem, CheckItemResult, mergeMarcas } from "@/lib/padronizador";

export default function PadronizadorPage() {
  // Começa vazio (igual ao servidor, que não tem localStorage) e só
  // carrega o valor real depois de montar — evita "Hydration failed"
  // (o servidor sempre renderizava "Nenhuma equivalência cadastrada
  // ainda", mesmo quando já havia sinônimos salvos, porque o
  // inicializador de useState rodava direto no cliente na hidratação).
  const [mounted, setMounted] = useState(false);
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);

  useEffect(() => {
    const loadedSynonyms = storage.getSinonimos();
    const timer = setTimeout(() => {
      setSynonyms(loadedSynonyms);
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const [padrao, setPadrao] = useState("");
  const [substituicao, setSubstituicao] = useState("");
  const [erroSinonimo, setErroSinonimo] = useState("");

  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<CheckItemResult[] | null>(null);

  function adicionarSinonimo() {
    setErroSinonimo("");
    if (!padrao.trim() || !substituicao.trim()) {
      setErroSinonimo("Preencha os dois campos.");
      return;
    }
    try {
      new RegExp(padrao);
    } catch {
      setErroSinonimo("O padrão não é uma expressão regular válida.");
      return;
    }
    const novo: Synonym = { id: uuid(), padrao: padrao.trim(), substituicao: substituicao.trim(), ativo: true };
    const atualizados = [novo, ...synonyms];
    setSynonyms(atualizados);
    storage.setSinonimos(atualizados);
    setPadrao("");
    setSubstituicao("");
  }

  function toggleSinonimo(id: string) {
    const atualizados = synonyms.map((s) => (s.id === id ? { ...s, ativo: !s.ativo } : s));
    setSynonyms(atualizados);
    storage.setSinonimos(atualizados);
  }

  function removerSinonimo(id: string) {
    const atualizados = synonyms.filter((s) => s.id !== id);
    setSynonyms(atualizados);
    storage.setSinonimos(atualizados);
  }

  function validar() {
    const itens = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!itens.length) return;
    const marcas = mergeMarcas(synonyms.filter((s) => s.ativo && /^[A-Za-zÀ-ú ]+$/.test(s.substituicao)).map((s) => s.substituicao));
    const ativos = synonyms.filter((s) => s.ativo);
    const rows = itens.map((i) => checkItem(i, marcas, ativos));
    setResultados(rows);
    storage.addHistoricoPadronizacao({
      executadoEm: new Date().toLocaleString("pt-BR"),
      total: rows.length,
      ok: rows.filter((r) => r.situacao === "✅ OK").length,
      ajustaveis: rows.filter((r) => r.situacao.startsWith("⚠️")).length,
      manual: rows.filter((r) => r.situacao.startsWith("❌")).length,
    });
  }

  function exportarCSV() {
    if (!resultados) return;
    const header = ["Descrição original", "Situação", "Problemas encontrados", "Sugestão corrigida"];
    const linhas = resultados.map((r) => [r.descricaoOriginal, r.situacao, r.problemas, r.sugestaoCorrigida]);
    const csv = [header, ...linhas]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "padronizacao_produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const resumo = resultados
    ? {
        total: resultados.length,
        ok: resultados.filter((r) => r.situacao === "✅ OK").length,
        ajustaveis: resultados.filter((r) => r.situacao.startsWith("⚠️")).length,
        manual: resultados.filter((r) => r.situacao.startsWith("❌")).length,
      }
    : null;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <ToolHeader
          eyebrow="Estação 02"
          title="Padronizador de Nomenclatura"
          description="Cadastre as equivalências de nome dos seus produtos e valide listas para chegar sempre na mesma descrição padrão."
          accentVar="--steel"
        />

        {/* 1. Dicionário de equivalências */}
        <Section title="1. Dicionário de equivalências" number="01">
          <p className="text-sm text-(--muted) mb-4">
            &ldquo;Padrão&rdquo; é o texto a ser substituído (aceita expressão regular simples, ex:{" "}
            <code className="font-mono-data text-(--steel)">{"\\bELEMENTO FILTRANTE\\b"}</code>). &ldquo;Substituição&rdquo; é o
            texto final. Comparação sempre em MAIÚSCULAS.
          </p>

          <div className="rounded-xl border border-(--line) bg-white/2 p-5 mb-4">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="block text-sm">
                <span className="block text-xs text-(--muted) mb-1.5">Padrão (texto ou regex)</span>
                <input
                  value={padrao}
                  onChange={(e) => setPadrao(e.target.value)}
                  placeholder={"Ex: \\bELEMENTO FILTRANTE\\b"}
                  className="w-full rounded-lg border border-(--line) bg-(--surface) px-3 py-2 text-sm font-mono-data focus:outline-none focus:border-(--steel)"
                />
              </label>
              <label className="block text-sm">
                <span className="block text-xs text-(--muted) mb-1.5">Substituição</span>
                <input
                  value={substituicao}
                  onChange={(e) => setSubstituicao(e.target.value)}
                  placeholder="Ex: FILTRO DE ÓLEO"
                  className="w-full rounded-lg border border-(--line) bg-(--surface) px-3 py-2 text-sm font-mono-data focus:outline-none focus:border-(--steel)"
                />
              </label>
            </div>
            {erroSinonimo && <p className="text-sm text-red-400 mb-3">{erroSinonimo}</p>}
            <button
              onClick={adicionarSinonimo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-(--steel) text-[#0e1a1e] text-sm font-semibold hover:brightness-110 transition"
            >
              <Plus className="w-4 h-4" /> Adicionar equivalência
            </button>
          </div>

          {mounted && synonyms.length > 0 ? (
            <div className="rounded-xl border border-(--line) divide-y divide-(--line) overflow-hidden">
              {synonyms.map((s) => (
                <div key={s.id} className="flex items-center gap-4 px-4 py-3 flex-wrap">
                  <BookMarked className="w-4 h-4 text-(--muted) shrink-0" />
                  <code className="font-mono-data text-xs bg-white/5 px-2 py-1 rounded text-(--muted)">{s.padrao}</code>
                  <span className="text-(--muted)">→</span>
                  <span className="text-sm font-medium">{s.substituicao}</span>
                  <div className="ml-auto flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-(--muted)">
                      <input type="checkbox" checked={s.ativo} onChange={() => toggleSinonimo(s.id)} className="accent-(--steel)" />
                      Ativo
                    </label>
                    <button onClick={() => removerSinonimo(s.id)} className="text-(--muted) hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-(--muted)">Nenhuma equivalência cadastrada ainda.</p>
          )}
        </Section>

        {/* 2. Validar lista */}
        <Section title="2. Validar lista de nomes" number="02">
          <p className="text-sm text-(--muted) mb-3">Um produto por linha.</p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={"Ex:\nELEMENTO FILTRANTE H100\nFILTRO LUBRIFICANTE H100\nOleo Motorcraft 5w-30 Sintetico 1 Litro"}
            className="w-full rounded-xl border border-(--line) bg-white/2 px-4 py-3 text-sm font-mono-data placeholder:text-(--muted)/60 focus:outline-none focus:border-(--steel) resize-y"
          />
          <button
            onClick={validar}
            disabled={!texto.trim()}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-(--steel) text-[#0e1a1e] text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition"
          >
            <Play className="w-4 h-4" /> Validar lista
          </button>
        </Section>

        {/* 3. Relatório */}
        {resultados && resumo && (
          <Section title="3. Relatório" number="03">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <Metric label="✅ OK" value={resumo.ok} color="var(--ok)" />
              <Metric label="⚠️ Ajustes automáticos" value={resumo.ajustaveis} color="var(--accent)" />
              <Metric label="❌ Revisão manual" value={resumo.manual} color="var(--danger)" />
            </div>

            <div className="rounded-xl border border-(--line) overflow-hidden">
              <div className="overflow-x-auto max-h-130">
                <table className="w-full text-sm">
                  <thead className="bg-white/3 sticky top-0">
                    <tr className="text-left text-xs text-(--muted) uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Descrição original</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                      <th className="px-4 py-3 font-medium">Problemas encontrados</th>
                      <th className="px-4 py-3 font-medium">Sugestão corrigida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r, i) => (
                      <tr key={i} className="border-t border-(--line) hover:bg-white/2">
                        <td className="px-4 py-3 font-mono-data">{r.descricaoOriginal}</td>
                        <td className="px-4 py-3">
                          <StatusBadge situacao={r.situacao} />
                        </td>
                        <td className="px-4 py-3 text-(--muted)">{r.problemas}</td>
                        <td className="px-4 py-3 font-medium">{r.sugestaoCorrigida}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={exportarCSV}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-(--line) text-sm hover:bg-white/5 transition"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </Section>
        )}
      </div>
    </main>
  );
}

function Section({ title, number, children }: { title: string; number: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono-data text-xs text-(--muted)">{number}</span>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <div className="h-px flex-1 bg-(--line)" />
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-(--line) bg-white/2 px-4 py-3">
      <p className="text-2xl font-display font-semibold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
      <p className="text-xs text-(--muted) mt-0.5">{label}</p>
    </div>
  );
}