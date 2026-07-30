/**
 * padronizador
 * ============
 * Regras de padronização de nomenclatura de produtos. Detecta problemas
 * mecânicos de escrita (maiúsculas, acentos, hífen, embalagem no lugar
 * errado etc.) e sugere uma descrição corrigida no padrão único da
 * empresa. Também é aqui que entra a "tradução" de termos equivalentes
 * (ex: ELEMENTO FILTRANTE / FILTRO LUBRIFICANTE -> FILTRO DE ÓLEO), via
 * o dicionário de sinônimos cadastrado pelo usuário.
 */

import { stripAccents, Synonym } from "./textUtils";

export const ACCENT_FIXES: Record<string, string> = {
  OLEO: "ÓLEO",
  OLEOS: "ÓLEOS",
  COMBUSTIVEL: "COMBUSTÍVEL",
  COMBUSTIVEIS: "COMBUSTÍVEIS",
  LAMPADA: "LÂMPADA",
  LAMPADAS: "LÂMPADAS",
  ABRACADEIRA: "ABRAÇADEIRA",
  ABRACADEIRAS: "ABRAÇADEIRAS",
  CAMBIO: "CÂMBIO",
  LUBRIFICACAO: "LUBRIFICAÇÃO",
};

export const BASE_OLEO_TOKENS = ["SINT", "SEMISSINT", "MINERAL"];

export const MARCAS_CONHECIDAS_PADRAO = [
  "MOBIL", "SHELL", "TECFIL", "WEGA", "HELIAR", "MOTUL", "CASTROL",
  "TOTAL", "PETRONAS", "MENZOIL", "MOTORCRAFT", "PETROX", "LUBRAX",
  "RENAULT", "TUTELA", "VOX", "TURBOFLOW", "BOSCH", "HI TECH", "ARLA",
  "FILTROS BRASIL", "PETROBRAS", "GLADE", "IPIRANGA", "LIQUI MOLY",
  "VALVOLINE", "REPSOL", "ACDELCO", "NGK",
].sort((a, b) => b.length - a.length);

const API_TOKENS_CANONICOS = [
  "CI-4", "CJ-4", "CH-4", "CF-4", "GL-4", "GL-5", "MA2", "DEXOS1",
  "SP", "SL", "SN", "SM", "SJ",
];

const BASE_PATTERNS: [RegExp, string][] = [
  [/100%\s*SINTETICO|\bSINTETICO\b|\bSINTÉTICO\b|\bSYNTHETIC\b/, "SINT"],
  [/SEMI\s*SINTETICO|\bSEMISSINTETICO\b|\bSEMISSINT\b/, "SEMISSINT"],
  [/\bMINERAL\b/, "MINERAL"],
];

const VISCOSIDADE_ANY_REGEX = /\b\d{1,3}W-?\d{0,3}\b/;
const EMBALAGEM_REGEX = /\b(\d+\s?(ML|L|LT|KG)|BALDE\s?\d+\s?L?|UN|JG)\b/gi;
const VISCOSIDADE_HIFEN_REGEX = /\b(\d{1,2}W)-(\d{2,3})\b/gi;
const ESPACOS_DUPLOS_REGEX = /  +/g;

export function mergeMarcas(marcasExtra: string[] = []): string[] {
  const todas = new Set([...MARCAS_CONHECIDAS_PADRAO, ...marcasExtra]);
  return Array.from(todas).sort((a, b) => b.length - a.length);
}

export function isOilDescription(descUpper: string): boolean {
  return descUpper.startsWith("OLEO") || descUpper.startsWith("ÓLEO");
}

interface ReconstructInfo {
  marca: string | null;
  viscosidade: string | null;
  api: string[];
  base: string | null;
  embalagem: string | null;
}

export function reconstructOleo(
  upperTextIn: string,
  marcas: string[] = MARCAS_CONHECIDAS_PADRAO
): [string, ReconstructInfo] {
  let working = upperTextIn.replace(/\bOLEO\b|\bÓLEO\b/g, " ");
  const achou: ReconstructInfo = { marca: null, viscosidade: null, api: [], base: null, embalagem: null };

  for (const marca of marcas) {
    const re = new RegExp(`\\b${escapeRegex(marca)}\\b`);
    if (re.test(working)) {
      achou.marca = marca;
      working = working.replace(new RegExp(`\\b${escapeRegex(marca)}\\b`, "g"), " ");
      break;
    }
  }

  const mVisc = working.match(VISCOSIDADE_ANY_REGEX);
  if (mVisc && mVisc.index !== undefined) {
    achou.viscosidade = mVisc[0].replace("-", "");
    working = working.slice(0, mVisc.index) + " " + working.slice(mVisc.index + mVisc[0].length);
  }

  for (const token of API_TOKENS_CANONICOS) {
    const pattern = new RegExp(`\\b${escapeRegex(token).replace(/-/g, "-?")}\\b`);
    if (pattern.test(working)) {
      achou.api.push(token);
      working = working.replace(new RegExp(pattern, "g"), " ");
    }
  }

  for (const [pattern, label] of BASE_PATTERNS) {
    if (pattern.test(working)) {
      achou.base = label;
      working = working.replace(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"), " ");
      break;
    }
  }

  const mEmb = Array.from(working.matchAll(EMBALAGEM_REGEX))[0];
  if (mEmb && mEmb.index !== undefined) {
    achou.embalagem = mEmb[0].toUpperCase().replace(/\s+/g, "");
    working = working.slice(0, mEmb.index) + " " + working.slice(mEmb.index + mEmb[0].length);
  }

  working = working.replace(/\bSAE\b|\bAPI\b|100%/g, " ");
  const leftover = working.replace(/\s+/g, " ").trim().replace(/^[\s\-/]+|[\s\-/]+$/g, "");

  const partes = ["ÓLEO"];
  if (achou.marca) partes.push(achou.marca);
  if (leftover) partes.push(leftover);
  if (achou.viscosidade) partes.push(achou.viscosidade);
  partes.push(...achou.api);
  if (achou.base) partes.push(achou.base);
  if (achou.embalagem) partes.push(achou.embalagem);

  return [partes.join(" "), achou];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type SituacaoPadronizacao = "✅ OK" | "⚠️ Ajustável automaticamente" | "❌ Requer revisão manual";

export interface CheckItemResult {
  descricaoOriginal: string;
  situacao: SituacaoPadronizacao;
  problemas: string;
  sugestaoCorrigida: string;
}

/**
 * Aplica o dicionário de sinônimos/equivalências do usuário ANTES das
 * regras mecânicas. É aqui que "ELEMENTO FILTRANTE H100" /
 * "FILTRO LUBRIFICANTE H100" viram "FILTRO DE ÓLEO H100", por exemplo,
 * desde que o usuário tenha cadastrado essa equivalência no Dicionário.
 */
export function applyEquivalencias(text: string, synonyms: Synonym[]): string {
  let out = text;
  for (const syn of synonyms) {
    if (!syn.ativo) continue;
    try {
      const re = new RegExp(syn.padrao, "gi");
      out = out.replace(re, syn.substituicao);
    } catch {
      continue;
    }
  }
  return out;
}

export function checkItem(
  original: string,
  marcas: string[] = MARCAS_CONHECIDAS_PADRAO,
  synonyms: Synonym[] = []
): CheckItemResult {
  const problems: string[] = [];
  const text = original ?? "";
  let upper = text.toUpperCase();

  // Aplica equivalências de nomenclatura cadastradas pelo usuário primeiro
  const upperEquiv = applyEquivalencias(upper, synonyms).replace(/\s+/g, " ").trim();
  const equivalenciaAplicada = upperEquiv !== upper.trim();
  upper = upperEquiv;

  if (text !== text.toUpperCase()) {
    problems.push("Não está em MAIÚSCULAS");
  }
  if (text !== text.trim()) {
    problems.push("Espaço sobrando no início/fim");
  }
  if (ESPACOS_DUPLOS_REGEX.test(text)) {
    problems.push("Espaços duplicados");
  }
  ESPACOS_DUPLOS_REGEX.lastIndex = 0;

  if (VISCOSIDADE_HIFEN_REGEX.test(upper)) {
    problems.push("Viscosidade com hífen (ex: 5W-30 em vez de 5W30)");
  }
  VISCOSIDADE_HIFEN_REGEX.lastIndex = 0;

  const isOleo = isOilDescription(upper.trim());

  if (isOleo && !BASE_OLEO_TOKENS.some((t) => upper.includes(t))) {
    problems.push("Óleo sem tipo de base indicado (SINT/SEMISSINT/MINERAL) — confirmar com o fabricante");
  }

  const accentIssues: string[] = [];
  for (const wrong of Object.keys(ACCENT_FIXES)) {
    if (new RegExp(`\\b${wrong}\\b`).test(upper)) accentIssues.push(wrong);
  }
  if (accentIssues.length) {
    problems.push("Acento faltando em: " + accentIssues.join(", "));
  }

  const isFiltro = upper.trim().startsWith("FILTRO");
  if (!isFiltro) {
    const matches = Array.from(upper.matchAll(EMBALAGEM_REGEX));
    if (matches.length) {
      const last = matches[matches.length - 1];
      if (last.index !== undefined && last.index + last[0].length < upper.trim().length - 1) {
        problems.push("Embalagem não está no final do nome");
      }
    } else {
      problems.push("Nenhuma embalagem/unidade identificada — confirmar tamanho da embalagem");
    }
  }

  let fixed: string;
  if (isOleo) {
    const [rec, achou] = reconstructOleo(upper, marcas);
    fixed = rec;
    if (!achou.marca) {
      problems.push("Marca não reconhecida automaticamente — conferir manualmente");
    }
  } else {
    fixed = text.trim();
    fixed = fixed.replace(ESPACOS_DUPLOS_REGEX, " ");
    fixed = fixed.toUpperCase();
    fixed = applyEquivalencias(fixed, synonyms).replace(/\s+/g, " ").trim();
    fixed = fixed.replace(VISCOSIDADE_HIFEN_REGEX, (_m, a, b) => `${a.toUpperCase()}${b}`);
    for (const [wrong, right] of Object.entries(ACCENT_FIXES)) {
      fixed = fixed.replace(new RegExp(`\\b${wrong}\\b`, "g"), right);
    }
  }

  const situacao: SituacaoPadronizacao = problems.length === 0
    ? "✅ OK"
    : fixed !== text
      ? "⚠️ Ajustável automaticamente"
      : "❌ Requer revisão manual";

  if (equivalenciaAplicada && situacao !== "✅ OK") {
    problems.push("Nome equivalente convertido para o padrão único da empresa");
  }

  return {
    descricaoOriginal: text,
    situacao,
    problemas: problems.length ? problems.join("; ") : "—",
    sugestaoCorrigida: fixed !== text.trim() ? fixed : "—",
  };
}

export function suggestDescription(
  textoLivre: string,
  marcas: string[] = MARCAS_CONHECIDAS_PADRAO,
  synonyms: Synonym[] = []
): string {
  const resultado = checkItem(textoLivre, marcas, synonyms);
  if (resultado.sugestaoCorrigida === "—") {
    return stripAccents(textoLivre).toUpperCase().trim();
  }
  return resultado.sugestaoCorrigida;
}

export function colorFor(situacao: SituacaoPadronizacao): { bg: string; text: string; border: string } {
  if (situacao === "✅ OK") return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" };
  if (situacao.startsWith("⚠️")) return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" };
  return { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" };
}
