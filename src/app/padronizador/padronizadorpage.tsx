"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Clipboard, 
  Copy, 
  Download, 
  FileText, 
  ListChecks, 
  MessageSquareText, 
  Settings2, 
  Sparkles,
  Loader2
} from "lucide-react";
import { ToolHeader } from "@/components/ToolHeader";
import {
  CHECKLIST_PADRONIZADOR,
  montarPromptCorrecao,
  montarPromptLote,
  PROMPT_INICIO,
  PROMPT_MESTRE,
} from "@/lib/promptsPadronizador";

export default function PadronizadorPage() {
  const [numeroLote, setNumeroLote] = useState("001");
  const [produtos, setProdutos] = useState("");
  const [mensagem, setMensagem] = useState("");
  
  const [promptLote, setPromptLote] = useState("");
  const [erroLote, setErroLote] = useState("");
  const [respostaParaCorrigir, setRespostaParaCorrigir] = useState("");
  
  // Novos estados para feedback visual do botão de gerar lote
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  async function copiar(texto: string, identificador: string) {
    await navigator.clipboard.writeText(texto);
    setMensagem(identificador);
    window.setTimeout(() => setMensagem(""), 2000);
  }

  function gerarPromptLote() {
    if (!produtos.trim()) {
      setErroLote("Cole a lista de produtos do lote antes de gerar.");
      setPromptLote("");
      return;
    }
    setErroLote("");
    setIsGenerating(true);
    setPromptLote(""); // Limpa o prompt atual para forçar a animação de entrada do novo

    // Simula um breve tempo de processamento para melhorar a percepção de feedback da ação
    setTimeout(() => {
      setPromptLote(montarPromptLote(numeroLote, produtos));
      setIsGenerating(false);
      setGenerateSuccess(true);
      
      // Reseta o estado de sucesso do botão após 2.5 segundos
      setTimeout(() => setGenerateSuccess(false), 2500);
    }, 400);
  }

  return (
    <main className="flex-1 bg-workshop min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <ToolHeader 
          eyebrow="Estação 02" 
          title="Padronizador de Nomenclatura" 
          description="Um roteiro de saneamento para preparar a IA, montar lotes consistentes e conferir a tabela antes de gravar no DigiSat." 
          accentVar="--steel" 
        />

        <Etapa numero="01" titulo="Configurar a IA uma única vez" icone={<Settings2 className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">
            Crie um projeto para o saneamento, abra as instruções do projeto e copie o Prompt Mestre abaixo.
          </p>
          <BlocoPrompt texto={PROMPT_MESTRE} aoCopiar={() => copiar(PROMPT_MESTRE, "mestre")} copiado={mensagem === "mestre"} />
        </Etapa>

        <Etapa numero="02" titulo="Adicionar o manual de referência" icone={<FileText className="h-5 w-5" />}>
          <div className="flex flex-col sm:flex-row gap-5 rounded-xl border border-dashed border-(--line) bg-white/[0.02] p-6 transition-colors hover:border-(--steel)/40 hover:bg-white/[0.04]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--steel)/10 text-(--steel)">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-medium">Anexe o arquivo Manual_SuperTrocaDeOleo_v7.md ao projeto da IA.</p>
              <p className="mt-1 text-sm text-(--muted) leading-relaxed">
                Faça isso uma vez. O manual é a fonte das regras de subgrupo, tipo fixo, unidade e característica.
              </p>
              <a 
                href="/Manual_SuperTrocaDeOleo_v7.md" 
                download 
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-(--steel)/40 bg-transparent px-4 py-2.5 text-xs font-semibold tracking-wide text-(--steel) transition-all duration-200 hover:-translate-y-0.5 hover:bg-(--steel)/10 hover:shadow-[0_4px_12px_rgba(79,143,163,0.15)] active:scale-95"
              >
                <Download className="h-4 w-4" />
                Baixar Manual v7
              </a>
            </div>
          </div>
        </Etapa>

        <Etapa numero="03" titulo="Abrir uma sessão de trabalho" icone={<MessageSquareText className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">
            No começo de cada nova conversa, envie este texto para alinhar as regras antes do primeiro lote.
          </p>
          <BlocoPrompt texto={PROMPT_INICIO} aoCopiar={() => copiar(PROMPT_INICIO, "inicio")} copiado={mensagem === "inicio"} />
        </Etapa>

        <Etapa numero="04" titulo="Gerar prompt do lote" icone={<Sparkles className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">
            Cole a lista de produtos do lote abaixo, defina o número e gere o prompt completo pronto para copiar.
          </p>
          
          <div className="grid gap-5 rounded-xl border border-(--line) bg-white/[0.02] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5">
              <label className="w-full sm:max-w-40 text-sm group">
                <span className="mb-2 block text-xs font-medium text-(--muted) group-focus-within:text-(--steel) transition-colors">Número do lote</span>
                <input 
                  value={numeroLote} 
                  onChange={(evento) => setNumeroLote(evento.target.value)} 
                  className="w-full rounded-lg border border-(--line) bg-(--surface) px-4 py-2.5 font-mono-data text-sm transition-all duration-200 focus:border-(--steel) focus:outline-none focus:ring-2 focus:ring-(--steel)/20" 
                />
              </label>
              
              <label className="flex-1 text-sm group">
                <span className="mb-2 block text-xs font-medium text-(--muted) group-focus-within:text-(--steel) transition-colors">Produtos do lote</span>
                <textarea 
                  value={produtos} 
                  onChange={(evento) => setProdutos(evento.target.value)} 
                  rows={6} 
                  placeholder={"5819 TR20457 1 ELEMENTO FILTRANTE AR PRIMARIO\n3549 FAP2214 FILTRO AR WEGA"} 
                  className="w-full resize-y rounded-lg border border-(--line) bg-(--surface) px-4 py-3 font-mono-data text-sm placeholder:text-(--muted)/40 transition-all duration-200 focus:border-(--steel) focus:outline-none focus:ring-2 focus:ring-(--steel)/20" 
                />
              </label>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <button 
                onClick={gerarPromptLote} 
                disabled={isGenerating}
                className={`flex items-center gap-2.5 rounded-lg px-6 py-3 text-sm font-bold transition-all duration-300 ease-out active:scale-95 ${
                  generateSuccess 
                    ? "bg-(--ok) text-white shadow-[0_0_20px_rgba(95,174,124,0.3)]" 
                    : isGenerating
                    ? "bg-(--steel)/50 text-[#0e1a1e] cursor-not-allowed"
                    : "bg-(--steel) text-[#0e1a1e] hover:-translate-y-0.5 hover:bg-(--steel)/90 hover:shadow-[0_0_20px_var(--steel-glow)]"
                }`}
              >
                {generateSuccess ? (
                  <CheckCircle2 className="h-5 w-5 animate-pop" />
                ) : isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                {generateSuccess ? "Prompt Gerado!" : isGenerating ? "Processando..." : "Gerar prompt do lote"}
              </button>
              
              {erroLote && (
                <span className="flex items-center gap-1.5 text-sm text-(--danger) animate-fade-in-up">
                  <span className="h-1.5 w-1.5 rounded-full bg-(--danger)"></span>
                  {erroLote}
                </span>
              )}
            </div>
          </div>
          
          {promptLote && (
            <div className="mt-6 animate-fade-in-up">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-(--line)"></div>
                <p className="font-mono-data text-[11px] font-bold uppercase tracking-widest text-(--steel)">
                  Resultado Pronto
                </p>
                <div className="h-px flex-1 bg-(--line)"></div>
              </div>
              <BlocoPrompt texto={promptLote} aoCopiar={() => copiar(promptLote, "lote")} copiado={mensagem === "lote"} />
            </div>
          )}
        </Etapa>

        <Etapa numero="05" titulo="Conferir antes de gravar" icone={<ListChecks className="h-5 w-5" />}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {CHECKLIST_PADRONIZADOR.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-lg border border-(--line) bg-white/[0.01] px-4 py-3.5 text-sm text-(--muted) transition-colors hover:border-(--steel)/30 hover:bg-white/[0.03]">
                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-(--steel)" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </Etapa>

        <Etapa numero="06" titulo="Corrigir uma resposta fora da tabela" icone={<Clipboard className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">
            Se a IA devolver texto solto, cole a resposta aqui e envie o prompt de correção gerado. Ele pede somente a reestruturação da tabela, sem alterar os dados.
          </p>
          <div className="group">
            <textarea 
              value={respostaParaCorrigir} 
              onChange={(evento) => setRespostaParaCorrigir(evento.target.value)} 
              rows={5} 
              placeholder="Cole aqui a resposta que precisa ser formatada..." 
              className="w-full resize-y rounded-xl border border-(--line) bg-(--surface) px-4 py-3 font-mono-data text-sm placeholder:text-(--muted)/40 transition-all duration-200 focus:border-(--steel) focus:outline-none focus:ring-2 focus:ring-(--steel)/20" 
            />
          </div>
          {respostaParaCorrigir.trim() && (
            <div className="mt-5 animate-fade-in-up">
              <BlocoPrompt 
                texto={montarPromptCorrecao(respostaParaCorrigir)} 
                aoCopiar={() => copiar(montarPromptCorrecao(respostaParaCorrigir), "correcao")} 
                copiado={mensagem === "correcao"} 
              />
            </div>
          )}
        </Etapa>
      </div>
    </main>
  );
}

function Etapa({ numero, titulo, icone, children }: { numero: string; titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-10 border-b border-(--line) pb-10 last:border-0 last:pb-0">
      <div className="mb-6 flex items-center gap-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--steel)/30 bg-(--steel)/10 font-mono-data text-xs font-bold text-(--steel) shadow-inner">
          {numero}
        </span>
        <span className="text-(--steel)">{icone}</span>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function BlocoPrompt({ texto, aoCopiar, copiado }: { texto: string; aoCopiar: () => void; copiado: boolean }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-(--line) bg-(--surface) shadow-sm transition-all duration-300 hover:border-(--steel)/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap p-5 font-mono-data text-xs leading-relaxed text-(--foreground)/90 selection:bg-(--steel)/30">
        {texto}
      </pre>
      <div className="flex justify-end border-t border-(--line) bg-white/[0.02] px-4 py-3 transition-colors group-hover:bg-white/[0.04]">
        <button 
          onClick={aoCopiar} 
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 ${
            copiado 
              ? "border-(--ok)/50 bg-(--ok)/10 text-(--ok) shadow-[0_0_10px_rgba(95,174,124,0.1)]" 
              : "border-(--steel)/40 bg-transparent text-(--steel) hover:-translate-y-0.5 hover:bg-(--steel)/10 hover:shadow-[0_4px_10px_rgba(79,143,163,0.1)]"
          }`}
        >
          {copiado ? <CheckCircle2 className="h-4 w-4 animate-pop" /> : <Copy className="h-4 w-4" />}
          {copiado ? "COPIADO!" : "COPIAR PROMPT"}
        </button>
      </div>
    </div>
  );
}