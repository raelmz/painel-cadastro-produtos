/**
 * textUtils
 * =========
 * Normalização de texto usada pelo Verificador de Inventário e pelo
 * Padronizador de Nomenclatura. Porte das regras do projeto original
 * (Python), adaptado para rodar 100% no navegador.
 */

// Sinônimos "de fábrica" (sempre ativos)
export const EQUIV_PATTERNS_PADRAO: [RegExp, string][] = [
  [/\bSEMI\s*SINTETICO\b/g, "SEMI SINT"],
  [/\bSEMISINTETICO\b/g, "SEMI SINT"],
  [/\bSINTETICO\b/g, "SINT"],
  [/\bFULLY\s*SYNTHETIC\b/g, "SINT"],
  [/\bSYNTHETIC\b/g, "SINT"],
  [/\bDEXOS\s*1\b/g, "DEXOS1"],
  [/\bDEXOS\s*2\b/g, "DEXOS2"],
  [/\bSAE\b/g, ""],
];

const UNIT_WORD_FIXES: [RegExp, string][] = [
  [/\bLITROS?\b/g, "L"],
  [/\bLTS?\b/g, "L"],
  [/\bMILILITROS?\b/g, "ML"],
  [/\bQUILOS?\b/g, "KG"],
  [/\bGRAMAS?\b/g, "G"],
  [/\bUNIDADES?\b/g, "UN"],
];

const NUM_UNIT_SPACE_RE = /\b(\d+(?:[.,]\d+)?)\s+(ML|L|KG|G|UN|LT)\b/g;
const ML_TO_L_RE = /\b(\d+)ML\b/g;

/** Remove acentos (equivalente a unicodedata NFKD + strip combining). */
export function stripAccents(text: string): string {
  if (typeof text !== "string") text = String(text ?? "");
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function toUpperNoAccent(text: string): string {
  return stripAccents(text).toUpperCase().trim();
}

/** Alfanumérico puro — usado no match exato/substring mais estrito. */
export function toAlnum(text: string): string {
  const upper = toUpperNoAccent(text);
  return upper.replace(/[^A-Z0-9]/g, "");
}

/** Normaliza unidades de medida para uma forma canônica. */
export function normalizeUnits(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [pattern, repl] of UNIT_WORD_FIXES) {
    out = out.replace(pattern, repl);
  }
  out = out.replace(NUM_UNIT_SPACE_RE, (_m, num, unit) => `${num}${unit}`);
  out = out.replace(ML_TO_L_RE, (m, valueStr) => {
    const value = parseInt(valueStr, 10);
    if (value > 0 && value % 1000 === 0) {
      return `${value / 1000}L`;
    }
    return m;
  });
  return out;
}

export interface Synonym {
  id: string;
  padrao: string; // regex
  substituicao: string;
  ativo: boolean;
}

/** Forma "espaçada" usada no matching fuzzy. */
export function toSpaced(text: string, extraSynonyms: Synonym[] = []): string {
  let upper = toUpperNoAccent(text);
  upper = upper.replace(/[-./+]/g, " ");
  upper = normalizeUnits(upper);

  for (const [pattern, repl] of EQUIV_PATTERNS_PADRAO) {
    upper = upper.replace(pattern, repl);
  }

  for (const syn of extraSynonyms) {
    if (!syn.ativo) continue;
    try {
      const re = new RegExp(syn.padrao, "gi");
      upper = upper.replace(re, syn.substituicao);
    } catch {
      // regex inválida cadastrada pelo usuário: ignora silenciosamente
      continue;
    }
  }

  upper = upper.replace(/\s+/g, " ").trim();
  return upper;
}
