"use client";

import { useState } from "react";
import { CheckCircle2, Clipboard, Copy, Download, FileText, ListChecks, MessageSquareText, Settings2, Sparkles } from "lucide-react";
import { ToolHeader } from "@/components/ToolHeader";

const PROMPT_MESTRE = [
  "PROMPT MESTRE v7 — cole nas Instruções do Projeto (Claude)",
  "Referência: Manual_SuperTrocaDeOleo_v7.md",
  "",
  "Você é um especialista em cadastro de produtos automotivos da Super Troca de Óleo.",
  "",
  "Sua função é padronizar e enriquecer produtos para o DigiSat, preenchendo apenas:",
  "DESCRIÇÃO ATUALIZADA, MARCA, SUBGRUPO, UNIDADE e CARACTERÍSTICA.",
  "",
  "Nunca alterar CÓDIGO_INTERNO ou DESCRIÇÃO_ANTERIOR.",
  "Nunca excluir linhas.",
  "Sempre retornar exatamente uma linha para cada produto recebido.",
  "",
  "REGRA DE DESCRIÇÃO (LER COM ATENÇÃO — ERRO COMUM):",
  "1. Primeiro escolha o SUBGRUPO do produto na lista fechada.",
  "2. A descrição DEVE começar com o TIPO fixo correspondente a esse subgrupo (tabela 4.1 do manual v7). Nunca invente sinônimo do tipo (ex.: nunca escrever \"FILTRO AR PRIMARIO\" — o correto para subgrupo FILTRO DE AR MOTOR é sempre \"FILTRO DE AR MOTOR\").",
  "3. Se o produto for óleo, fluido, graxa, aditivo ou ARLA: terminar a descrição com o volume/embalagem (ex.: 1L, 20L, 500ML).",
  "4. Se o produto for peça unitária (filtro, pastilha, lâmpada, palheta, bateria, kit de filtros, acessório): NUNCA escrever \"UN\" ou qualquer unidade dentro da descrição. A unidade já vai na coluna UNIDADE separadamente.",
  "   ❌ Errado: FILTRO DE AR MOTOR WEGA FAP2214 UN",
  "   ✅ Correto: FILTRO DE AR MOTOR WEGA FAP2214",
  "",
  "Pesquise SEMPRE, em fontes confiáveis, antes de preencher aplicação recomendada, API, compatibilidade, viscosidade ou código de fabricante.",
  "Priorize catálogos oficiais, TecDoc, Tecfil, Wega, Mann, Fram, Vox, Filtros Brasil, Bosch, NGK, Mobil, Motul, Shell, Petronas, Castrol, Lubrax, Heliar, Moura, Fras-le, Cobreq, TRW e sites de aplicação de autopeças.",
  "",
  "REGRA ANTI-PENDÊNCIA (MUITO IMPORTANTE):",
  "PENDÊNCIA DE REVISÃO MANUAL não é um atalho para produtos \"trabalhosos\". É proibido usá-la só porque o produto tem marca pouco conhecida, código curto, ou exige uma busca adicional.",
  "",
  "Para QUALQUER produto que tenha um código de fabricante na descrição (ex: SNA-540, CSB-286, PD/1495, CSB-1322), você DEVE:",
  "1. Pesquisar esse código exato, mesmo que a marca seja pouco conhecida.",
  "2. Se não encontrar aplicação direta pela marca informada, pesquisar o código como possível referência cruzada de outros fabricantes (Fras-le, Cobreq, Bosch, TRW etc.), pois é comum marcas menores reutilizarem numeração de mercado.",
  "3. Preencher CARACTERÍSTICA com os veículos/aplicações reais encontrados, listando múltiplos veículos separados por \" | \" quando aplicável (ex: FIAT PALIO 1998/2000 | FIAT SIENA 1998/2000).",
  "4. Só usar PENDÊNCIA DE REVISÃO MANUAL se, depois de pesquisar de verdade, nenhuma aplicação for encontrada em nenhuma fonte, ou se a descrição de entrada for genuinamente incompleta/contraditória, ou tiver [VERIFICAR]/[VERIFICAR EMBALAGEM].",
  "",
  "Não é aceitável devolver PENDÊNCIA DE REVISÃO MANUAL sem antes ter feito essa pesquisa ativa. Trate cada produto individualmente — não generalize pendência para um lote inteiro só porque um item deu mais trabalho.",
  "",
  "SUBGRUPO:",
  "Use somente a lista fechada de subgrupos do manual.",
  "Não invente subgrupo novo.",
  "Nunca usar ÓLEO LUBRIFICANTE.",
  "Se não encaixar com segurança, preencher [VERIFICAR SUBGRUPO].",
  "",
  "CARACTERÍSTICA:",
  "Seguir a regra de prioridade.",
  "",
  "Prioridade 1:",
  "Sempre tentar primeiro veículo, montadora, motor, família ou homologação específica recomendada.",
  "Exemplos:",
  "VW/AUDI TSI",
  "MERCEDES DIESEL COM DPF",
  "CHEVROLET ONIX 2012/2019",
  "",
  "Prioridade 2:",
  "Se o produto for de aplicação ampla/genérica e não houver recomendação específica confiável, usar exatamente um valor da lista fechada de fallback:",
  "VEÍCULOS LEVES GASOLINA/FLEX",
  "VEÍCULOS LEVES GASOLINA/FLEX MODERNOS",
  "VEÍCULOS LEVES GASOLINA/FLEX ANTIGOS",
  "CAMINHONETES/SUV GASOLINA/FLEX",
  "VEÍCULOS LEVES DIESEL",
  "CAMINHONETES/SUV DIESEL",
  "CAMINHÕES/UTILITÁRIOS DIESEL",
  "MOTOCICLETAS 4T",
  "MOTOCICLETAS 2T",
  "TRANSMISSÃO MANUAL/DIFERENCIAL",
  "TRANSMISSÃO AUTOMÁTICA ATF",
  "TRANSMISSÃO CVT",
  "SISTEMA DE FREIO",
  "SISTEMA DE ARREFECIMENTO",
  "SISTEMA ARLA/SCR",
  "USO UNIVERSAL AUTOMOTIVO",
  "PENDÊNCIA DE REVISÃO MANUAL",
  "",
  "Nunca inventar variação ou sinônimo.",
  "Não escrever CARROS DE PASSEIO, AUTOMÓVEIS GASOLINA, VEÍCULOS GASOLINA, CARROS FLEX ou qualquer variação fora da lista.",
  "",
  "Se a entrada estiver incompleta, conflitante ou marcada com [VERIFICAR], [VERIFICAR EMBALAGEM] ou informação insuficiente, preencher CARACTERÍSTICA com PENDÊNCIA DE REVISÃO MANUAL.",
  "",
  "Para óleos, não preencher a característica somente com normas técnicas como API, ACEA, VW, MB, Porsche ou Dexos.",
  "Use essas normas para pesquisar a aplicação, mas converta o resultado em recomendação de veículos, motores, montadoras ou perfis.",
  "",
  "FORMATO DE SAÍDA (OBRIGATÓRIO — ERRO COMUM):",
  "Retorne tabela Markdown somente com estas colunas, uma linha por produto, sem nenhum texto antes ou depois da tabela:",
  "CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA",
  "",
  "Cada coluna deve estar separada por \" | \" (espaço, barra, espaço). Nunca concatene valores de colunas diferentes sem esse separador — cada linha precisa ter os 6 separadores internos entre as 7 colunas. Antes de responder, revise mentalmente cada linha para confirmar que os separadores estão todos presentes.",
  "",
  "FORMATAÇÃO VISUAL DA TABELA (OBRIGATÓRIA):",
  "A resposta precisa ser uma tabela Markdown renderizável, começando com barra vertical e contendo obrigatoriamente estas duas primeiras linhas:",
  "| CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  "Depois, retorne uma linha de produto para cada item, também começando e terminando com barra vertical.",
  "Não use bloco de código, listas, explicações, avisos ou texto antes ou depois da tabela.",
  "Antes de enviar, confirme que todas as linhas de produto têm 7 células, 6 separadores internos e as barras nas duas extremidades. Se qualquer linha falhar, corrija a tabela inteira antes de responder.",
].join("\n");

const PROMPT_INICIO = [
  "Vamos iniciar o saneamento da base da Super Troca de Óleo.",
  "Siga o Prompt Mestre e o Manual v7 rigorosamente.",
  "Sempre pesquise antes de preencher compatibilidades e especificações técnicas — inclusive para marcas pouco conhecidas e códigos de fabricante curtos.",
  "Use somente as listas fechadas de SUBGRUPO e CARACTERÍSTICA fallback.",
  "A descrição deve sempre começar com o TIPO fixo da tabela 4.1 do manual (o mesmo nome do subgrupo), nunca um sinônimo livre.",
  "Peça unitária (filtro, pastilha, lâmpada, palheta, bateria, kit, acessório) nunca leva \"UN\" na descrição.",
  "PENDÊNCIA DE REVISÃO MANUAL é exceção rara, não atalho. Antes de usar essa categoria em qualquer produto, pesquise o código de fabricante e tente encontrar a aplicação real (veículo, montadora, motor). Só use pendência se, mesmo pesquisando, não encontrar nada confiável.",
  "Divida lotes grandes em blocos de até 10 produtos quando houver filtros ou peças específicas, justamente para dar tempo de pesquisar cada código individualmente com atenção.",
  "A tabela final deve usar sempre o separador \" | \" entre as 7 colunas, sem nenhuma linha grudada.",
  "Quando estiver pronto, responda apenas:",
  "Pronto para receber o primeiro lote.",
].join("\n");

const CHECKLIST = [
  "A descrição começa com o TIPO fixo correspondente ao subgrupo.",
  "Peças unitárias não têm UN ou outra unidade dentro da descrição.",
  "Óleos, fluidos, graxas, aditivos e ARLA terminam com o volume.",
  "CÓDIGO_INTERNO e DESCRIÇÃO_ANTERIOR permanecem inalterados.",
  "Cada linha possui as sete colunas, separadas corretamente por barras.",
  "SUBGRUPO e fallback de CARACTERÍSTICA usam somente os valores fechados do manual.",
  "PENDÊNCIA DE REVISÃO MANUAL foi usada somente após pesquisa ou por falta real de informação.",
];

export default function PadronizadorPage() {
  const [numeroLote, setNumeroLote] = useState("001");
  const [produtos, setProdutos] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [promptLote, setPromptLote] = useState("");
  const [erroLote, setErroLote] = useState("");
  const [respostaParaCorrigir, setRespostaParaCorrigir] = useState("");

  async function copiar(texto: string, identificador: string) {
    await navigator.clipboard.writeText(texto);
    setMensagem(identificador);
    window.setTimeout(() => setMensagem(""), 1600);
  }

  function gerarPromptLote() {
    if (!produtos.trim()) {
      setErroLote("Cole a lista de produtos do lote antes de gerar.");
      setPromptLote("");
      return;
    }
    setErroLote("");
    setPromptLote(montarPromptLote(numeroLote, produtos));
  }

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <ToolHeader eyebrow="Estação 02" title="Padronizador de Nomenclatura" description="Um roteiro de saneamento para preparar a IA, montar lotes consistentes e conferir a tabela antes de gravar no DigiSat." accentVar="--steel" />

        <Etapa numero="01" titulo="Configurar a IA uma única vez" icone={<Settings2 className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">Crie um projeto para o saneamento, abra as instruções do projeto e copie o Prompt Mestre abaixo.</p>
          <BlocoPrompt texto={PROMPT_MESTRE} aoCopiar={() => copiar(PROMPT_MESTRE, "mestre")} copiado={mensagem === "mestre"} />
        </Etapa>

        <Etapa numero="02" titulo="Adicionar o manual de referência" icone={<FileText className="h-5 w-5" />}>
          <div className="flex gap-4 rounded-lg border border-dashed border-(--line) bg-white/2 p-5">
            <FileText className="h-6 w-6 shrink-0 text-(--steel)" />
            <div><p className="font-medium">Anexe o arquivo Manual_SuperTrocaDeOleo_v7.md ao projeto da IA.</p><p className="mt-1 text-sm text-(--muted)">Faça isso uma vez. O manual é a fonte das regras de subgrupo, tipo fixo, unidade e característica.</p><a href="/Manual_SuperTrocaDeOleo_v7.md" download className="mt-4 inline-flex items-center gap-2 rounded-lg border border-(--steel)/50 px-3 py-2 text-xs font-medium text-(--steel) hover:bg-(--steel)/10"><Download className="h-3.5 w-3.5" />Baixar Manual v7</a></div>
          </div>
        </Etapa>

        <Etapa numero="03" titulo="Abrir uma sessão de trabalho" icone={<MessageSquareText className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">No começo de cada nova conversa, envie este texto para alinhar as regras antes do primeiro lote.</p>
          <BlocoPrompt texto={PROMPT_INICIO} aoCopiar={() => copiar(PROMPT_INICIO, "inicio")} copiado={mensagem === "inicio"} />
        </Etapa>

        <Etapa numero="04" titulo="Gerar prompt do lote" icone={<Sparkles className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">Cole a lista de produtos do lote abaixo, defina o número e gere o prompt completo pronto para copiar.</p>
          <div className="grid gap-4 rounded-lg border border-(--line) bg-white/2 p-5">
            <label className="w-full max-w-40 text-sm"><span className="mb-1.5 block text-xs text-(--muted)">Número do lote</span><input value={numeroLote} onChange={(evento) => setNumeroLote(evento.target.value)} className="w-full rounded-lg border border-(--line) bg-(--surface) px-3 py-2 font-mono-data text-sm focus:border-(--steel) focus:outline-none" /></label>
            <label className="text-sm"><span className="mb-1.5 block text-xs text-(--muted)">Produtos do lote</span><textarea value={produtos} onChange={(evento) => setProdutos(evento.target.value)} rows={9} placeholder={"5819 TR20457 1 ELEMENTO FILTRANTE AR PRIMARIO\n3549 FAP2214 FILTRO AR WEGA"} className="w-full resize-y rounded-lg border border-(--line) bg-(--surface) px-3 py-3 font-mono-data text-sm placeholder:text-(--muted)/60 focus:border-(--steel) focus:outline-none" /></label>
            <div className="flex flex-wrap items-center gap-3"><button onClick={gerarPromptLote} className="flex items-center gap-2 rounded-lg bg-(--steel) px-4 py-2.5 text-sm font-semibold text-[#0e1a1e]"><Sparkles className="h-4 w-4" />Gerar prompt do lote</button>{erroLote && <span className="text-sm text-red-400">{erroLote}</span>}</div>
          </div>
          {promptLote && <div className="mt-4"><p className="mb-2 font-mono-data text-xs uppercase tracking-wide text-(--steel)">Prompt pronto para copiar</p><BlocoPrompt texto={promptLote} aoCopiar={() => copiar(promptLote, "lote")} copiado={mensagem === "lote"} /></div>}
        </Etapa>

        <Etapa numero="05" titulo="Conferir antes de gravar" icone={<ListChecks className="h-5 w-5" />}>
          <ul className="divide-y divide-(--line) overflow-hidden rounded-lg border border-(--line)">{CHECKLIST.map((item) => <li key={item} className="flex gap-3 px-4 py-3 text-sm text-(--muted)"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-(--steel)" />{item}</li>)}</ul>
        </Etapa>

        <Etapa numero="06" titulo="Corrigir uma resposta fora da tabela" icone={<Clipboard className="h-5 w-5" />}>
          <p className="mb-4 text-sm text-(--muted)">Se a IA devolver texto solto, cole a resposta aqui e envie o prompt de correção gerado. Ele pede somente a reestruturação da tabela, sem alterar os dados.</p>
          <textarea value={respostaParaCorrigir} onChange={(evento) => setRespostaParaCorrigir(evento.target.value)} rows={7} placeholder="Cole aqui a resposta que precisa ser formatada..." className="w-full resize-y rounded-lg border border-(--line) bg-(--surface) px-3 py-3 font-mono-data text-sm placeholder:text-(--muted)/60 focus:border-(--steel) focus:outline-none" />
          {respostaParaCorrigir.trim() && <div className="mt-4"><BlocoPrompt texto={montarPromptCorrecao(respostaParaCorrigir)} aoCopiar={() => copiar(montarPromptCorrecao(respostaParaCorrigir), "correcao")} copiado={mensagem === "correcao"} /></div>}
        </Etapa>
      </div>
    </main>
  );
}

function montarPromptLote(numero: string, produtos: string): string {
  return [
    "LOTE " + (numero.trim() || "001"),
    "Atualize todos os produtos abaixo seguindo o Prompt Mestre e o Manual v7.",
    "",
    "Lembretes rápidos deste lote:",
    "- A descrição começa com o TIPO fixo do subgrupo (tabela 4.1) — nunca sinônimo livre.",
    "- Peça unitária (filtro, pastilha, lâmpada, palheta, bateria, kit, acessório): NUNCA colocar \"UN\" na descrição.",
    "- Óleo/fluido/graxa/aditivo/ARLA: terminar a descrição com o volume (1L, 500ML, 20L etc.).",
    "",
    "Para CARACTERÍSTICA, seguir a prioridade do manual:",
    "1. Primeiro recomendação específica de veículo, montadora, motor, família ou homologação — PESQUISE o código de fabricante de cada produto antes de decidir que não há aplicação específica.",
    "2. Se, mesmo após pesquisa, o produto for comprovadamente genérico, usar somente uma categoria da lista fechada de fallback.",
    "3. Use PENDÊNCIA DE REVISÃO MANUAL apenas se, depois de pesquisar, não encontrar nenhuma aplicação confiável, ou se houver [VERIFICAR], [VERIFICAR EMBALAGEM] ou dado realmente insuficiente/contraditório.",
    "IMPORTANTE: não retorne PENDÊNCIA DE REVISÃO MANUAL sem antes ter pesquisado o código de fabricante de cada item individualmente. Pesquisa insuficiente não é motivo válido para pendência.",
    "",
    "Retorne somente a tabela final com as colunas, usando sempre o separador \" | \" entre elas, uma linha por produto, sem nenhum texto antes ou depois:",
    "CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA",
    "",
    "FORMATAÇÃO OBRIGATÓRIA DESTA RESPOSTA:",
    "A primeira linha deve ser: | CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA |",
    "A segunda linha deve ser: | --- | --- | --- | --- | --- | --- | --- |",
    "Todas as linhas de produto devem começar e terminar com barra vertical.",
    "Não use bloco de código nem texto antes ou depois da tabela.",
    "Antes de enviar, conte 7 células e 6 separadores internos em cada linha de produto. Se uma linha estiver fora do padrão, corrija toda a tabela antes de responder.",
    "",
    produtos.trim(),
  ].join("\n");
}

function montarPromptCorrecao(resposta: string): string {
  return [
    "Reformate a resposta abaixo como uma tabela Markdown renderizável.",
    "Não altere nenhum dado, produto, código, descrição, marca, subgrupo, unidade ou característica. Corrija somente a estrutura visual.",
    "Retorne apenas a tabela, sem bloco de código e sem explicações.",
    "Use exatamente estas duas primeiras linhas:",
    "| CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    "Cada linha de produto deve ter sete células e começar e terminar com barra vertical.",
    "",
    "RESPOSTA A REFORMATAR:",
    resposta.trim(),
  ].join("\n");
}

function Etapa({ numero, titulo, icone, children }: { numero: string; titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return <section className="mb-8 border-b border-(--line) pb-8 last:border-0"><div className="mb-4 flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--steel)/40 font-mono-data text-xs text-(--steel)">{numero}</span><span className="text-(--steel)">{icone}</span><h2 className="font-display text-xl font-semibold">{titulo}</h2></div>{children}</section>;
}

function BlocoPrompt({ texto, aoCopiar, copiado }: { texto: string; aoCopiar: () => void; copiado: boolean }) {
  return <div className="overflow-hidden rounded-lg border border-(--line) bg-(--surface)"><pre className="max-h-95 overflow-auto whitespace-pre-wrap p-4 font-mono-data text-xs leading-relaxed text-(--foreground)/90">{texto}</pre><div className="flex justify-end border-t border-(--line) bg-white/2 p-3"><button onClick={aoCopiar} className="flex items-center gap-2 rounded-lg border border-(--steel)/50 px-3 py-2 text-xs font-medium text-(--steel) hover:bg-(--steel)/10">{copiado ? <Clipboard className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiado ? "Copiado" : "Copiar prompt"}</button></div></div>;
}
