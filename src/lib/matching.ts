/**
 * matching
 * ========
 * Motor de busca do Verificador de Inventário: compara uma lista de itens
 * (contagem física) contra a base de produtos importada.
 *
 * Pipeline (cada etapa só roda para o que não bateu na anterior — igual
 * ao core/matching.py original):
 *   1) match exato (alfanumérico puro, código + descrição)
 *   2) match por substring alfanumérico (query dentro do texto da base,
 *      sem espaços) — importante pq os "códigos" que a oficina cola
 *      (ex: "FB 1040", "AKX 1382 F") normalmente estão embutidos DENTRO
 *      do texto da descrição, não num campo separado.
 *   3) partial ratio (Levenshtein em janela deslizante) no alfanumérico —
 *      pega substring "quase igual" (diferença de 1-2 caracteres)
 *   4) match por substring na forma "espaçada" (bidirecional)
 *   5) fuzzy (token_set_ratio) — último recurso
 *
 * As etapas 2 e 3 tinham sido perdidas na primeira versão do porte pra
 * TypeScript — sem elas, um código curto pulava direto de "match exato"
 * pra "substring espaçado" (rígido demais pra códigos embutidos em
 * descrições longas) ou pro fuzzy geral (token_set_ratio penaliza demais
 * quando a descrição tem muitas palavras extras). Resultado: muita coisa
 * que devia ser "✅ Encontrado" caía em "❌ Não encontrado" ou virava um
 * falso "⚠️ Duplicado" por causa da checagem de substring espaçado
 * batendo em vários produtos da mesma família ao mesmo tempo.
 */

import { distance as levenshtein } from "fastest-levenshtein";
import { toAlnum, toSpaced, Synonym } from "./textUtils";

export interface BaseProduct {
  codigo: string;
  descricao: string;
  ativo: boolean;
}

export interface IndexedProduct extends BaseProduct {
  _alnum: string; // codigo + descricao, alfanumérico puro
  _spaced: string; // codigo + descricao, forma "espaçada"
}

export type SituacaoMatch =
  | "✅ Encontrado"
  | "⚠️ Divergência de descrição"
  | "⚠️ Duplicado na base"
  | "⚠️ Produto inativo"
  | "❓ Possível match — revisar"
  | "❌ Não encontrado";

export interface CandidatoAuditoria {
  codigo: string;
  descricao: string;
  ativo: boolean;
  score: number;
  tipo: "exato" | "substring" | "partial" | "fuzzy";
}

export interface MatchResult {
  produtoPesquisado: string;
  situacao: SituacaoMatch;
  codigo: string;
  descricaoEncontrada: string;
  score: number;
  /** Todos os candidatos que bateram nessa etapa do pipeline (ordenados
   * por score, maior primeiro) — útil pra você conferir se há um segundo
   * candidato plausível escondido atrás do que foi escolhido como
   * "melhor", especialmente em casos de "Duplicado na base". */
  candidatos: CandidatoAuditoria[];
}

/** Threshold default do fuzzy — igual ao FUZZY_THRESHOLD do Python (70%).
 * O valor de 80% usado antes era mais rígido do que o pipeline original
 * e, combinado com a falta das etapas 2-3, deixava passar muito menos
 * matches legítimos. */
export const FUZZY_THRESHOLD_PADRAO = 70;

/** Threshold "de revisão" — usado só quando o threshold normal não achou
 * NADA. Em vez de mostrar "❌ Não encontrado" sem mais informação (o que
 * esconde candidatos plausíveis do usuário), fazemos uma segunda passada
 * com esse threshold mais baixo e mostramos o melhor achado como
 * "❓ Possível match — revisar", com o score visível, pra decisão humana.
 * Ex: "THOR SAE 20W50" digitado vs "THOR ULTRA 20W50" cadastrado — a
 * palavra "SAE" (sem correspondência) e "ULTRA" (sem correspondência)
 * derrubam o token_set_ratio abaixo de 70%, mas o produto existe. */
export const FUZZY_THRESHOLD_REVISAO = 45;

/** Palavras genéricas que não identificam o produto e não deveriam pesar
 * nem a favor nem contra no fuzzy — hoje "SAE" sem correspondência do
 * outro lado derruba o score tanto quanto uma palavra que realmente
 * importa. Mantidas em maiúsculo/sem acento (mesma normalização usada
 * pelo toSpaced). */
const STOPWORDS_TECNICAS = new Set(["SAE", "TIPO", "DE", "PARA", "COM", "SEM"]);

/** Bônus/penalidade aplicados quando dá pra extrair a viscosidade (ex:
 * "5W30", "20W50") dos dois lados da comparação. Viscosidade é quase um
 * "ID" do produto dentro de uma mesma linha/marca — duas viscosidades
 * diferentes quase nunca são o mesmo produto, mesmo que o resto do nome
 * seja bem parecido (ver caso MOTUL 6100 SYN-CLEAN 5W30 vs 5W40). */
const BONUS_VISCOSIDADE_IGUAL = 10;
/** Fator multiplicativo aplicado ao score quando as viscosidades divergem
 * (ex: 0.4 = corta 60% do score). Multiplicativo em vez de subtração fixa
 * porque casos "quase idênticos" (97%+ de palavras em comum) precisam de
 * um corte proporcionalmente maior do que casos já parecidos. */
const FATOR_PENALIDADE_VISCOSIDADE_DIFERENTE = 0.4;

/** Extrai o padrão de viscosidade (ex: "5W30", "20W50", "75W90") de um
 * texto "espaçado" (toSpaced), procurando token a token — NUNCA compacta
 * o texto inteiro antes de buscar, porque isso cola números de tokens
 * vizinhos (ex: "5W40 1L" compactado vira "5W401L", e uma regex gulosa
 * de \d{2,3} lê "5W401" em vez de "5W40" — bug real encontrado ao
 * validar o caso MOTUL 6100 SYN-CLEAN). Cada token é comparado por
 * inteiro contra o padrão, então "5W40" só bate com um token que É
 * exatamente "5W40". */
function extrairViscosidade(textoEspacado: string): string | null {
  const tokens = textoEspacado.split(" ");
  for (const tok of tokens) {
    const limpo = tok.replace(/[^A-Z0-9]/g, "");
    const m = limpo.match(/^\d{1,2}W\d{2,3}$/);
    if (m) return m[0];
  }
  return null;
}

/** Teto de score quando a ÚNICA coisa em comum entre a consulta e o
 * candidato é um número solto (sem nenhuma letra em comum) — ver
 * TOKENS_INTERSECAO_SO_NUMERO logo abaixo do tokenSetRatio. */
const TETO_INTERSECAO_SO_NUMERO = 30;

/** A partir de quantos caracteres alfanuméricos tentamos o substring
 * simples (etapa 2). Abaixo disso o risco de falso positivo é alto
 * (ex: "CA" bateria em qualquer coisa). */
const MIN_LEN_SUBSTRING = 4;

/** A partir de quantos caracteres tentamos o partial ratio (etapa 3) —
 * espelha o SEMANTIC/PARTIAL do Python. */
const MIN_LEN_PARTIAL = 6;
/** Limite MÁXIMO pro partial ratio. Etapa 3 foi desenhada pra códigos
 * curtos de peça ("achar 1-2 caracteres de diferença", ex: "FB1040"),
 * não pra nomes de produto inteiros. Sem esse teto, "MOTUL 5100 4T
 * 15W50" (15+ caracteres alfanuméricos) era comparado por Levenshtein
 * bruto contra "MOTUL 7100 4T 15W50" ou "...75W90" e passava como
 * "quase igual" só porque 1-2 dígitos de diferença em texto longo pesa
 * proporcionalmente pouco — mesmo sendo viscosidade/linha de produto
 * DIFERENTE (bug real: "SAE 75W80" → "encontrado" como se fosse
 * "75W90", e "MOTUL 5100" virou "Duplicado" batendo em vários MOTUL
 * 7100 de viscosidade errada). Códigos reais de peça na base do usuário
 * ficam entre 6 e 10 caracteres; nomes de produto completos passam de
 * 15 — 12 separa bem os dois mundos. Acima disso, a comparação correta
 * é o fuzzy com consciência de viscosidade (buscarFuzzy).
 */
const MAX_LEN_PARTIAL = 12;
const PARTIAL_THRESHOLD = 80;

type TipoMatch = "exato" | "substring" | "partial" | "fuzzy";

interface Candidate {
  produto: IndexedProduct;
  tipo: TipoMatch;
  score: number;
}

export function indexBase(base: BaseProduct[]): IndexedProduct[] {
  return base.map((p) => {
    const textoRef = `${p.codigo ?? ""} ${p.descricao ?? ""}`.trim();
    return {
      ...p,
      _alnum: toAlnum(textoRef),
      _spaced: toSpaced(textoRef),
    };
  });
}

/** Similaridade 0-100 baseada em distância de Levenshtein normalizada
 * (equivalente aproximado ao fuzz.ratio do rapidfuzz). */
export function ratioScore(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - dist / maxLen) * 100 * 100) / 100;
}

/** token_set_ratio "de verdade" (igual ao algoritmo do rapidfuzz/
 * fuzzywuzzy): separa os tokens em comuns aos dois textos + exclusivos
 * de cada lado, e compara as 3 combinações possíveis, pegando o maior
 * score. Isso é bem mais justo do que fazer Levenshtein direto na string
 * inteira concatenada (jeito antigo) — que penalizava pesado só por
 * causa de UMA palavra extra no meio de uma descrição longa, mesmo
 * quando praticamente todo o resto batia. */
function tokenSetRatio(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter((t) => t && !STOPWORDS_TECNICAS.has(t)));
  const tb = new Set(b.split(" ").filter((t) => t && !STOPWORDS_TECNICAS.has(t)));

  const intersecao = [...ta].filter((t) => tb.has(t)).sort();
  const soA = [...ta].filter((t) => !tb.has(t)).sort();
  const soB = [...tb].filter((t) => !ta.has(t)).sort();

  const strInter = intersecao.join(" ");
  const strInterA = [...intersecao, ...soA].join(" ");
  const strInterB = [...intersecao, ...soB].join(" ");

  let score = Math.max(
    ratioScore(strInter, strInterA),
    ratioScore(strInter, strInterB),
    ratioScore(strInterA, strInterB)
  );

  // Se a ÚNICA coisa em comum entre os dois textos é um número solto
  // (nenhuma letra em comum — ex: consulta "FB 1130" batendo só porque
  // "1130" aparece no CÓDIGO INTERNO de um produto sem nenhuma relação
  // real), o match não vale nada: é coincidência de dígito, não
  // parecença de produto. Trava o score bem abaixo do threshold de
  // revisão (45%), pra nunca aparecer como sugestão. Isso é bem mais
  // preciso do que tentar adivinhar se a consulta INTEIRA "parece um
  // código" — essa abordagem anterior classificava "THOR" (marca de
  // 4 letras) como código por engano e escondia buscas legítimas.
  const intersecaoTemLetra = intersecao.some((t) => /[A-Z]/.test(t));
  if (intersecao.length > 0 && !intersecaoTemLetra) {
    score = Math.min(score, TETO_INTERSECAO_SO_NUMERO);
  }

  return score;
}

/** token_set_ratio "consciente" de viscosidade: calcula o ratio normal
 * (já sem stopwords) e ajusta o score pra cima ou pra baixo dependendo
 * de a viscosidade dos dois lados bater ou não. A penalidade é
 * MULTIPLICATIVA (corta o score, não só subtrai um valor fixo) — porque
 * duas viscosidades diferentes praticamente sempre significam produto
 * diferente, mesmo quando o resto do nome é quase idêntico (ver caso
 * MOTUL 6100 SYN-CLEAN 5W30 vs 5W40, que tem 97% de palavras em comum e
 * mesmo assim são produtos diferentes). */
function tokenSetRatioComViscosidade(a: string, b: string): number {
  const base = tokenSetRatio(a, b);
  const viscA = extrairViscosidade(a);
  const viscB = extrairViscosidade(b);
  if (viscA && viscB) {
    if (viscA === viscB) {
      return Math.min(100, base + BONUS_VISCOSIDADE_IGUAL);
    }
    return Math.round(base * FATOR_PENALIDADE_VISCOSIDADE_DIFERENTE * 100) / 100;
  }
  return base;
}

/** Equivalente ao fuzz.partial_ratio do rapidfuzz: acha a melhor janela
 * dentro do texto mais longo que se parece com o texto mais curto
 * (útil pra achar um código curto "quase certo" embutido no meio de uma
 * descrição longa). */
function partialRatio(short: string, long: string): number {
  if (!short || !long) return 0;
  let a = short;
  let b = long;
  if (a.length > b.length) [a, b] = [b, a];
  if (a.length === 0) return 0;

  let melhor = 0;
  // Janela deslizante do tamanho do texto curto sobre o texto longo.
  for (let i = 0; i <= b.length - a.length; i++) {
    const janela = b.slice(i, i + a.length);
    const dist = levenshtein(a, janela);
    const score = (1 - dist / a.length) * 100;
    if (score > melhor) melhor = score;
    if (melhor >= 100) break;
  }
  return Math.round(melhor * 100) / 100;
}

function buscarExatoESubstring(
  qAlnum: string,
  qSpaced: string,
  base: IndexedProduct[]
): Candidate[] {
  if (!qAlnum) return [];

  // 1) exato
  const exatos = base.filter((p) => p._alnum === qAlnum);
  if (exatos.length > 0) {
    return exatos.map((produto) => ({ produto, tipo: "exato" as const, score: 100 }));
  }

  // 2) substring alfanumérico — a query aparece dentro do texto da base
  if (qAlnum.length >= MIN_LEN_SUBSTRING) {
    const subs = base.filter((p) => p._alnum.includes(qAlnum));
    if (subs.length > 0) {
      return subs.map((produto) => ({ produto, tipo: "substring" as const, score: 97 }));
    }
  }

  // 3) partial ratio — substring "quase igual" (1-2 chars de diferença),
  // só faz sentido pra códigos curtos (ver MAX_LEN_PARTIAL acima)
  if (qAlnum.length >= MIN_LEN_PARTIAL && qAlnum.length <= MAX_LEN_PARTIAL) {
    const candidatos: Candidate[] = [];
    for (const p of base) {
      if (!p._alnum) continue;
      const score = partialRatio(qAlnum, p._alnum);
      if (score >= PARTIAL_THRESHOLD) {
        candidatos.push({ produto: p, tipo: "partial", score: 93 });
      }
    }
    if (candidatos.length > 0) return candidatos;
  }

  // 4) substring na forma "espaçada" (bidirecional) — última tentativa
  // não-fuzzy, mais rígida que as anteriores
  if (qSpaced) {
    const subsEspacado = base.filter(
      (p) => p._spaced && (p._spaced.includes(qSpaced) || qSpaced.includes(p._spaced))
    );
    if (subsEspacado.length > 0) {
      return subsEspacado.map((produto) => ({ produto, tipo: "substring" as const, score: 95 }));
    }
  }

  return [];
}

function buscarFuzzy(
  qSpaced: string,
  base: IndexedProduct[],
  threshold: number
): Candidate[] {
  if (!qSpaced) return [];
  const candidatos: Candidate[] = [];
  for (const p of base) {
    if (!p._spaced) continue;
    const score = tokenSetRatioComViscosidade(qSpaced, p._spaced);
    if (score >= threshold) {
      candidatos.push({ produto: p, tipo: "fuzzy", score });
    }
  }
  return candidatos;
}

function classificar(candidatos: Candidate[], ehRevisao = false): SituacaoMatch {
  if (candidatos.length === 0) return "❌ Não encontrado";

  if (ehRevisao) return "❓ Possível match — revisar";

  // Um item nunca chega aqui com mistura de tipos: verifyItem só chama
  // buscarFuzzy quando buscarExatoESubstring não achou nada. Ou seja, ou
  // todos os candidatos são exato/substring/partial, ou todos são fuzzy.
  const ehFuzzy = candidatos[0].tipo === "fuzzy";

  if (ehFuzzy) {
    // Fuzzy (token_set_ratio) é o último recurso e naturalmente bate em
    // várias descrições parecidas ao mesmo tempo — isso NÃO é a mesma
    // coisa que "duplicado na base" (base ter o produto cadastrado 2x).
    // Por isso, diferente do grupo exato/substring/partial, aqui nunca
    // marcamos "Duplicado": pegamos o melhor score e mostramos como
    // divergência a conferir.
    return "⚠️ Divergência de descrição";
  }

  if (candidatos.length >= 2) return "⚠️ Duplicado na base";

  const [unico] = candidatos;
  if (!unico.produto.ativo) return "⚠️ Produto inativo";
  return "✅ Encontrado";
}

export function verifyItem(
  itemOriginal: string,
  base: IndexedProduct[],
  synonyms: Synonym[],
  fuzzyThreshold = FUZZY_THRESHOLD_PADRAO
): MatchResult {
  const alnum = toAlnum(itemOriginal);
  const spaced = toSpaced(itemOriginal, synonyms);

  let candidatos = buscarExatoESubstring(alnum, spaced, base);
  if (candidatos.length === 0) {
    candidatos = buscarFuzzy(spaced, base, fuzzyThreshold);
  }

  // Nada bateu nem no exato/substring nem no fuzzy normal (70%)? Antes de
  // desistir, tenta de novo com um threshold bem mais baixo SÓ pra exibir
  // o(s) candidato(s) mais próximo(s) como sugestão a revisar — em vez de
  // simplesmente informar "não encontrado" e esconder que existe algo
  // parecido na base (ver caso "THOR SAE 20W50" / "THOR ULTRA 20W50").
  // Coincidências de dígito solto (ex: código "1130" batendo com o
  // código interno de outro produto qualquer) já são filtradas dentro
  // do tokenSetRatio, então essa segunda tentativa não reintroduz o bug
  // de sugerir produtos sem nenhuma relação real.
  let ehRevisao = false;
  if (candidatos.length === 0) {
    const candidatosRevisao = buscarFuzzy(spaced, base, FUZZY_THRESHOLD_REVISAO);
    if (candidatosRevisao.length > 0) {
      candidatos = candidatosRevisao;
      ehRevisao = true;
    }
  }

  const situacao = classificar(candidatos, ehRevisao);

  if (candidatos.length === 0) {
    return {
      produtoPesquisado: itemOriginal,
      situacao,
      codigo: "—",
      descricaoEncontrada: "—",
      score: 0,
      candidatos: [],
    };
  }

  const ordenados = [...candidatos].sort((a, b) => b.score - a.score);
  // Fuzzy pode retornar dezenas de candidatos acima do threshold — limita
  // a lista de auditoria aos 5 mais relevantes pra não poluir a UI.
  const paraAuditoria = ordenados.slice(0, 5).map((c) => ({
    codigo: c.produto.codigo,
    descricao: c.produto.descricao,
    ativo: c.produto.ativo,
    score: c.score,
    tipo: c.tipo,
  }));

  // Escolhe o de maior score pra exibir na linha principal (relevante
  // principalmente pro caso de "Duplicado", onde há mais de um candidato).
  const melhor = ordenados[0];

  return {
    produtoPesquisado: itemOriginal,
    situacao,
    codigo: melhor.produto.codigo,
    descricaoEncontrada: melhor.produto.descricao,
    score: melhor.score,
    candidatos: paraAuditoria,
  };
}

export function runVerification(
  itens: string[],
  base: BaseProduct[],
  synonyms: Synonym[],
  fuzzyThreshold = FUZZY_THRESHOLD_PADRAO
): MatchResult[] {
  const indexed = indexBase(base);
  return itens
    .map((i) => i.trim())
    .filter(Boolean)
    .map((item) => verifyItem(item, indexed, synonyms, fuzzyThreshold));
}