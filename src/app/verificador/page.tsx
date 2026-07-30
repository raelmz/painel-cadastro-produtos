"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Play,
  Download,
  Trash2,
  PackageSearch,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Search,
  DatabaseBackup,
  UploadCloud,
  Check,
  History,
} from "lucide-react";
import Link from "next/link";
import { ToolHeader } from "@/components/ToolHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { storage, BaseMeta } from "@/lib/storage";
import { parseSpreadsheetFile, normalizeActiveValue, ParsedSheet } from "@/lib/fileParser";
import { runVerification, BaseProduct, MatchResult } from "@/lib/matching";
import { exportarExcel } from "@/lib/exportExcel";

type FiltroStatus = "todos" | "encontrados" | "divergencias" | "revisar" | "naoEncontrados";

export default function VerificadorPage() {
  // IMPORTANTE: começa sempre "vazio" (igual ao que o servidor renderiza,
  // já que não existe localStorage no SSR). O valor real só é carregado
  // depois de montar (ver useEffect abaixo) — isso evita o erro de
  // "Hydration failed" que acontecia antes, quando o estado inicial já
  // vinha do localStorage e divergia do HTML gerado no servidor.
  const [mounted, setMounted] = useState(false);
  const [base, setBase] = useState<BaseProduct[]>(() => {
    if (typeof window === "undefined") return [];
    return storage.getBase();
  });
  const [baseMeta, setBaseMeta] = useState<BaseMeta | null>(() => {
    if (typeof window === "undefined") return null;
    return storage.getBaseMeta();
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [colCodigo, setColCodigo] = useState<string>("");
  const [colDescricao, setColDescricao] = useState<string>("");
  const [colAtivo, setColAtivo] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [erroArquivo, setErroArquivo] = useState<string>("");

  const [contagem, setContagem] = useState("");
  const [threshold, setThreshold] = useState(70);
  const [resultados, setResultados] = useState<MatchResult[] | null>(null);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtro/busca sobre o relatório já gerado
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");

  // Confirmação manual de candidato: guarda, por índice da linha, qual
  // candidato (código) o usuário confirmou como o correto — útil nos
  // casos de "Duplicado"/"Divergência" onde há mais de uma opção.
  const [confirmados, setConfirmados] = useState<Record<number, string>>({});

  const [exportandoExcel, setExportandoExcel] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [avisoBackup, setAvisoBackup] = useState("");

  async function handleFile(file: File) {
    setErroArquivo("");
    setFileName(file.name);
    try {
      const sheet = await parseSpreadsheetFile(file);
      if (!sheet.rows.length) {
        setErroArquivo("O arquivo foi lido, mas não encontrei nenhuma linha de dados.");
        return;
      }
      setParsedSheet(sheet);
      setColCodigo(sheet.guessed.codigo ?? sheet.headers[0] ?? "");
      setColDescricao(sheet.guessed.descricao ?? sheet.headers[1] ?? sheet.headers[0] ?? "");
      setColAtivo(sheet.guessed.ativo ?? "");
    } catch (exc) {
      setErroArquivo(
        `Não consegui ler este arquivo. Verifique se é um .xlsx/.xls/.csv válido. Detalhe: ${
          exc instanceof Error ? exc.message : String(exc)
        }`
      );
    }
  }

  function confirmarImportacao() {
    if (!parsedSheet || !colCodigo || !colDescricao) return;
    const novaBase: BaseProduct[] = parsedSheet.rows.map((r) => ({
      codigo: (r[colCodigo] ?? "").trim(),
      descricao: (r[colDescricao] ?? "").trim(),
      ativo: colAtivo ? normalizeActiveValue(r[colAtivo]) : true,
    }));
    const meta: BaseMeta = {
      nomeArquivo: fileName,
      importadoEm: new Date().toLocaleString("pt-BR"),
      total: novaBase.length,
    };
    storage.setBase(novaBase, meta);
    setBase(novaBase);
    setBaseMeta(meta);
    setParsedSheet(null);
  }

  function limparBase() {
    storage.clearBase();
    setBase([]);
    setBaseMeta(null);
  }

  function iniciarVerificacao() {
    const itens = contagem.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!itens.length || !base.length) return;
    const synonyms = storage.getSinonimos();
    const res = runVerification(itens, base, synonyms, threshold);
    setResultados(res);
    setExpandidos(new Set());
    storage.addHistoricoVerificacao({
      executadoEm: new Date().toLocaleString("pt-BR"),
      total: res.length,
      encontrados: res.filter((r) => r.situacao === "✅ Encontrado").length,
      divergencias: res.filter((r) => r.situacao.startsWith("⚠️")).length,
      revisar: res.filter((r) => r.situacao.startsWith("❓")).length,
      naoEncontrados: res.filter((r) => r.situacao.startsWith("❌")).length,
    });
  }

  function toggleExpandido(i: number) {
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  }

  function confirmarCandidato(i: number, codigo: string) {
    setConfirmados((prev) => ({ ...prev, [i]: codigo }));
  }

  const resumo = useMemo(() => {
    if (!resultados) return null;
    return {
      total: resultados.length,
      encontrados: resultados.filter((r) => r.situacao === "✅ Encontrado").length,
      divergencias: resultados.filter((r) => r.situacao.startsWith("⚠️")).length,
      revisar: resultados.filter((r) => r.situacao.startsWith("❓")).length,
      naoEncontrados: resultados.filter((r) => r.situacao.startsWith("❌")).length,
    };
  }, [resultados]);

  // Relatório filtrado (status + busca por texto) — mantém o índice
  // original de `resultados` pra `expandidos`/`confirmados` continuarem
  // batendo certo mesmo depois de filtrar.
  const resultadosFiltrados = useMemo(() => {
    if (!resultados) return [];
    const buscaNorm = busca.trim().toLowerCase();
    return resultados
      .map((r, indiceOriginal) => ({ r, indiceOriginal }))
      .filter(({ r }) => {
        if (filtroStatus === "encontrados" && r.situacao !== "✅ Encontrado") return false;
        if (filtroStatus === "divergencias" && !r.situacao.startsWith("⚠️")) return false;
        if (filtroStatus === "revisar" && !r.situacao.startsWith("❓")) return false;
        if (filtroStatus === "naoEncontrados" && !r.situacao.startsWith("❌")) return false;
        if (!buscaNorm) return true;
        return (
          r.produtoPesquisado.toLowerCase().includes(buscaNorm) ||
          r.descricaoEncontrada.toLowerCase().includes(buscaNorm) ||
          r.codigo.toLowerCase().includes(buscaNorm)
        );
      });
  }, [resultados, filtroStatus, busca]);

  async function exportarExcelClick() {
    if (!resultados) return;
    setExportandoExcel(true);
    try {
      await exportarExcel(resultados, {
        nomeArquivo: "verificacao_inventario.xlsx",
        origemBase: baseMeta?.nomeArquivo,
      });
    } finally {
      setExportandoExcel(false);
    }
  }

  function baixarBackup() {
    storage.downloadBackup();
  }

  async function handleImportarBackup(file: File) {
    setAvisoBackup("");
    try {
      const texto = await file.text();
      const payload = JSON.parse(texto);
      storage.restoreBackup(payload);
      setBase(storage.getBase());
      setBaseMeta(storage.getBaseMeta());
      setAvisoBackup("Backup restaurado com sucesso.");
    } catch (exc) {
      setAvisoBackup(
        `Não consegui restaurar este backup. Detalhe: ${exc instanceof Error ? exc.message : String(exc)}`
      );
    }
  }

  function exportarCSV() {
    if (!resultados) return;
    const header = ["Produto pesquisado", "Situação", "Código", "Descrição encontrada", "Score"];
    const linhas = resultados.map((r) => [
      r.produtoPesquisado,
      r.situacao,
      r.codigo,
      r.descricaoEncontrada,
      String(r.score),
    ]);
    const csv = [header, ...linhas]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verificacao_inventario.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Enquanto não montou, sempre trata como "sem base" — igual ao servidor.
  const temBase = mounted && base.length > 0;
  const temBaseMeta = mounted && baseMeta !== null;

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <ToolHeader
          eyebrow="Estação 01"
          title="Verificador de Inventário"
          description="Importe a base de produtos exportada do sistema e cole a contagem física do estoque para comparar item a item."
          accentVar="--accent"
        />

        <div className="flex items-center justify-between flex-wrap gap-3 -mt-6 mb-10">
          <Link
            href="/historico"
            className="inline-flex items-center gap-1.5 text-xs text-(--muted) hover:text-foreground transition-colors"
          >
            <History className="w-3.5 h-3.5" /> Ver histórico de verificações
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={baixarBackup}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-(--line) hover:bg-white/5 transition-colors"
              title="Baixa um .json com base, sinônimos e históricos — para restaurar em outro navegador/computador"
            >
              <DatabaseBackup className="w-3.5 h-3.5" /> Baixar backup
            </button>
            <button
              onClick={() => backupInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-(--line) hover:bg-white/5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Restaurar backup
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportarBackup(e.target.files[0])}
            />
          </div>
        </div>
        {avisoBackup && (
          <p className="-mt-8 mb-8 text-xs text-(--muted) rounded-lg border border-(--line) bg-white/2 px-3 py-2">
            {avisoBackup}
          </p>
        )}

        {/* 1. Base de produtos */}
        <Section title="1. Base de produtos" number="01">
          {temBaseMeta ? (
            <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-(--line) bg-white/2 px-5 py-4">
              <div className="flex items-center gap-3">
                <PackageSearch className="w-5 h-5 text-(--accent)" />
                <div>
                  <p className="text-sm font-medium">{baseMeta!.nomeArquivo}</p>
                  <p className="text-xs text-(--muted) font-mono-data">
                    {baseMeta!.total} produtos · importado em {baseMeta!.importadoEm}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-3 py-2 rounded-lg border border-(--line) hover:bg-white/5 transition-colors"
                >
                  Trocar base
                </button>
                <button
                  onClick={limparBase}
                  className="text-xs px-3 py-2 rounded-lg border border-(--line) hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </button>
              </div>
            </div>
          ) : (
            <UploadBox onFile={handleFile} inputRef={fileInputRef} />
          )}
          {temBaseMeta && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          )}

          {erroArquivo && (
            <p className="mt-3 text-sm text-red-400">{erroArquivo}</p>
          )}

          {parsedSheet && (
            <div className="mt-4 rounded-xl border border-(--line) bg-white/2 p-5 space-y-4">
              <p className="text-sm text-(--muted)">
                Confirme qual coluna é qual antes de importar ({parsedSheet.rows.length} linhas detectadas):
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <ColumnSelect label="Código" value={colCodigo} onChange={setColCodigo} options={parsedSheet.headers} />
                <ColumnSelect label="Descrição" value={colDescricao} onChange={setColDescricao} options={parsedSheet.headers} />
                <ColumnSelect
                  label="Ativo (opcional)"
                  value={colAtivo}
                  onChange={setColAtivo}
                  options={["", ...parsedSheet.headers]}
                />
              </div>
              <button
                onClick={confirmarImportacao}
                disabled={!colCodigo || !colDescricao}
                className="px-4 py-2.5 rounded-lg bg-(--accent) text-[#14171a] text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition"
              >
                Confirmar importação
              </button>
            </div>
          )}
        </Section>

        {/* 2. Contagem física */}
        <Section title="2. Contagem física do estoque" number="02">
          <p className="text-sm text-(--muted) mb-3">
            Um produto por linha — digite ou cole a lista contada fisicamente na oficina.
          </p>
          <textarea
            value={contagem}
            onChange={(e) => setContagem(e.target.value)}
            rows={8}
            placeholder={"Ex:\nOleo Motorcraft 5w-30\nFILTRO OLEO WO130\nIPC-403"}
            className="w-full rounded-xl border border-(--line) bg-white/2 px-4 py-3 text-sm font-mono-data placeholder:text-(--muted)/60 focus:outline-none focus:border-(--accent) resize-y"
          />
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-3 text-sm text-(--muted)">
              Sensibilidade fuzzy
              <input
                type="range"
                min={60}
                max={95}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="accent-(--accent)"
              />
              <span className="font-mono-data text-foreground">{threshold}%</span>
            </label>
            <button
              onClick={iniciarVerificacao}
              disabled={!temBase || !contagem.trim()}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg bg-(--accent) text-[#14171a] text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition"
            >
              <Play className="w-4 h-4" /> Iniciar verificação
            </button>
          </div>
          {!temBase && (
            <p className="mt-3 text-xs text-amber-400/80">Importe a base de produtos primeiro (passo 1).</p>
          )}
        </Section>

        {/* 3. Resultado */}
        {resultados && resumo && (
          <Section title="3. Relatório" number="03">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <Metric label="Total" value={resumo.total} />
              <Metric label="Encontrados" value={resumo.encontrados} color="var(--ok)" />
              <Metric label="Divergências" value={resumo.divergencias} color="var(--accent)" />
              <Metric label="Revisar" value={resumo.revisar} color="#a78bfa" />
              <Metric label="Não encontrados" value={resumo.naoEncontrados} color="var(--danger)" />
            </div>

            <p className="text-xs text-(--muted) mb-3">
              Clique numa linha com mais de um candidato pra ver todas as opções encontradas e confirme o correto —
              útil pra decidir em casos de &ldquo;Duplicado na base&rdquo; ou &ldquo;Divergência&rdquo;.
            </p>

            {/* Filtro por status + busca */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <FiltroChip label="Todos" ativo={filtroStatus === "todos"} onClick={() => setFiltroStatus("todos")} />
              <FiltroChip
                label={`✅ Encontrados (${resumo.encontrados})`}
                ativo={filtroStatus === "encontrados"}
                onClick={() => setFiltroStatus("encontrados")}
              />
              <FiltroChip
                label={`⚠️ Divergências (${resumo.divergencias})`}
                ativo={filtroStatus === "divergencias"}
                onClick={() => setFiltroStatus("divergencias")}
              />
              <FiltroChip
                label={`❓ Revisar (${resumo.revisar})`}
                ativo={filtroStatus === "revisar"}
                onClick={() => setFiltroStatus("revisar")}
              />
              <FiltroChip
                label={`❌ Não encontrados (${resumo.naoEncontrados})`}
                ativo={filtroStatus === "naoEncontrados"}
                onClick={() => setFiltroStatus("naoEncontrados")}
              />
              <div className="relative ml-auto">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no relatório..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-(--line) bg-(--surface) focus:outline-none focus:border-(--accent) w-48"
                />
              </div>
            </div>

            <div className="rounded-xl border border-(--line) overflow-hidden">
              <div className="overflow-x-auto max-h-150">
                <table className="w-full text-sm">
                  <thead className="bg-white/3 sticky top-0">
                    <tr className="text-left text-xs text-(--muted) uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium w-6"></th>
                      <th className="px-4 py-3 font-medium">Produto pesquisado</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                      <th className="px-4 py-3 font-medium">Código</th>
                      <th className="px-4 py-3 font-medium">Descrição encontrada</th>
                      <th className="px-4 py-3 font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-(--muted)">
                          Nenhum item bate com esse filtro/busca.
                        </td>
                      </tr>
                    )}
                    {resultadosFiltrados.map(({ r, indiceOriginal: i }) => {
                      const temVariosCandidatos = r.candidatos.length > 1;
                      const aberto = expandidos.has(i);
                      const codigoConfirmado = confirmados[i];
                      return (
                        <Fragment key={i}>
                          <tr
                            className={`border-t border-(--line) hover:bg-white/2 ${
                              temVariosCandidatos ? "cursor-pointer" : ""
                            }`}
                            onClick={() => temVariosCandidatos && toggleExpandido(i)}
                          >
                            <td className="px-4 py-3">
                              {temVariosCandidatos &&
                                (aberto ? (
                                  <ChevronDown className="w-4 h-4 text-(--muted)" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-(--muted)" />
                                ))}
                            </td>
                            <td className="px-4 py-3 font-mono-data">{r.produtoPesquisado}</td>
                            <td className="px-4 py-3">
                              <StatusBadge situacao={r.situacao} />
                            </td>
                            <td className="px-4 py-3 font-mono-data text-(--muted)">
                              {codigoConfirmado ?? r.codigo}
                              {codigoConfirmado && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-(--ok) align-middle">
                                  <Check className="w-3 h-3" /> confirmado
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {r.descricaoEncontrada}
                              {temVariosCandidatos && (
                                <span className="ml-2 text-xs text-(--muted)">
                                  (+{r.candidatos.length - 1} candidato{r.candidatos.length - 1 > 1 ? "s" : ""})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-data text-(--muted)">
                              {r.score ? `${r.score}%` : "—"}
                            </td>
                          </tr>
                          {aberto && temVariosCandidatos && (
                            <tr className="bg-white/1.5 border-t border-(--line)">
                              <td></td>
                              <td colSpan={5} className="px-4 py-3">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-(--muted) uppercase tracking-wide">
                                      <th className="pb-2 pr-4 font-medium">Código</th>
                                      <th className="pb-2 pr-4 font-medium">Descrição</th>
                                      <th className="pb-2 pr-4 font-medium">Ativo?</th>
                                      <th className="pb-2 pr-4 font-medium">Tipo do match</th>
                                      <th className="pb-2 pr-4 text-right font-medium">Score</th>
                                      <th className="pb-2 text-right font-medium"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.candidatos.map((c, ci) => (
                                      <tr key={ci} className="border-t border-(--line)/50">
                                        <td className="py-2 pr-4 font-mono-data">{c.codigo}</td>
                                        <td className="py-2 pr-4">{c.descricao}</td>
                                        <td className="py-2 pr-4">{c.ativo ? "Sim" : "Não"}</td>
                                        <td className="py-2 pr-4 text-(--muted)">{c.tipo}</td>
                                        <td className="py-2 pr-4 text-right font-mono-data">{c.score}%</td>
                                        <td className="py-2 text-right">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              confirmarCandidato(i, c.codigo);
                                            }}
                                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                              codigoConfirmado === c.codigo
                                                ? "border-(--ok) text-(--ok) bg-(--ok)/10"
                                                : "border-(--line) text-(--muted) hover:text-foreground hover:border-(--accent)/50"
                                            }`}
                                          >
                                            {codigoConfirmado === c.codigo ? "Confirmado" : "Confirmar"}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={exportarExcelClick}
                disabled={exportandoExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-(--accent) text-[#14171a] text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exportandoExcel ? "Gerando planilha..." : "Exportar Excel (.xlsx)"}
              </button>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-(--line) text-sm hover:bg-white/5 transition"
              >
                <Download className="w-4 h-4" /> Exportar CSV
              </button>
            </div>
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

function FiltroChip({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
        ativo
          ? "border-(--accent) bg-(--accent)/15 text-(--accent)"
          : "border-(--line) text-(--muted) hover:text-foreground hover:border-(--accent)/40"
      }`}
    >
      {label}
    </button>
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

function UploadBox({
  onFile,
  inputRef,
}: {
  onFile: (f: File) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-(--line) bg-white/2 px-6 py-12 cursor-pointer hover:border-(--accent)/50 transition-colors text-center">
      <Upload className="w-7 h-7 text-(--muted)" />
      <div>
        <p className="text-sm font-medium">Clique para importar a base (.xlsx, .xls ou .csv)</p>
        <p className="text-xs text-(--muted) mt-1">Arquivo exportado do sistema, com código e descrição dos produtos</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

function ColumnSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs text-(--muted) mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-(--line) bg-(--surface) px-3 py-2 text-sm focus:outline-none focus:border-(--accent)"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "— nenhuma —"}
          </option>
        ))}
      </select>
    </label>
  );
}