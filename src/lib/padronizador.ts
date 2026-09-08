import { normalizeUnits, Synonym } from "./textUtils";

export const MARCAS_CONHECIDAS_PADRAO = [
  "TURBO FILTROS", "FILTROS BRASIL", "LIQUI MOLY", "MOTORCRAFT", "PETROBRAS", "PETRONAS",
  "VALVOLINE", "IPIRANGA", "ACDELCO", "CASTROL", "HELIAR", "LUBRAX", "MENZOIL", "MOBIL",
  "MOTUL", "SHELL", "TECFIL", "WEGA", "BOSCH", "MANN", "FRAM", "VOX", "NGK", "RENAULT",
  "TUTELA", "REPSOL", "TOTAL", "COBREQ", "FRAS-LE", "TRW", "MOURA", "GLADE",
].sort((a, b) => b.length - a.length);

const TIPOS_FIXOS: Record<string, string> = {
  "FILTRO AR CABINE": "FILTRO DE AR CABINE", "FILTRO DE ÓLEO": "FILTRO DE ÓLEO",
  "FILTRO DE AR MOTOR": "FILTRO DE AR MOTOR", "FILTRO DE COMBUSTÍVEL": "FILTRO DE COMBUSTÍVEL",
  "FILTRO SEPARADOR": "FILTRO SEPARADOR", "FILTRO UREIA/ARLA": "FILTRO DE UREIA/ARLA",
  "FILTRO HIDRÁULICO": "FILTRO HIDRÁULICO", "KIT DE FILTROS": "KIT DE FILTROS",
  "ÓLEO MOTOR GASOLINA/FLEX": "ÓLEO", "ÓLEO MOTOR DIESEL": "ÓLEO", "ÓLEO MOTO 2T/4T": "ÓLEO MOTO",
  "ÓLEO CÂMBIO/DIFERENCIAL": "ÓLEO CÂMBIO", "FLUIDO TRANSMISSÃO ATF/CVT": "FLUIDO",
  "FLUIDO DE FREIO": "FLUIDO DE FREIO", "ADITIVO/RADIADOR": "ADITIVO", "ARLA 32": "ARLA 32",
  GRAXA: "GRAXA", PALHETA: "PALHETA", "PASTILHA DE FREIO": "PASTILHA DE FREIO",
  BATERIA: "BATERIA", "LÂMPADA": "LÂMPADA", AROMATIZANTE: "AROMATIZANTE",
  "LIMPEZA AUTOMOTIVA": "", "ACESSÓRIOS/PEÇAS DIVERSAS": "", "[VERIFICAR SUBGRUPO]": "",
};

const SUBGRUPOS_DE_PECA = new Set([
  "FILTRO AR CABINE", "FILTRO DE ÓLEO", "FILTRO DE AR MOTOR", "FILTRO DE COMBUSTÍVEL",
  "FILTRO SEPARADOR", "FILTRO UREIA/ARLA", "FILTRO HIDRÁULICO", "KIT DE FILTROS",
  "PALHETA", "PASTILHA DE FREIO", "BATERIA", "LÂMPADA", "ACESSÓRIOS/PEÇAS DIVERSAS",
]);
const SUBGRUPOS_COM_EMBALAGEM = new Set([
  "ÓLEO MOTOR GASOLINA/FLEX", "ÓLEO MOTOR DIESEL", "ÓLEO MOTO 2T/4T", "ÓLEO CÂMBIO/DIFERENCIAL",
  "FLUIDO TRANSMISSÃO ATF/CVT", "FLUIDO DE FREIO", "ADITIVO/RADIADOR", "ARLA 32", "GRAXA",
  "LIMPEZA AUTOMOTIVA", "AROMATIZANTE",
]);
const CORRECOES: Record<string, string> = {
  OLEO: "ÓLEO", LAMPADA: "LÂMPADA", LAMPADAS: "LÂMPADAS", CAMBIO: "CÂMBIO",
  COMBUSTIVEL: "COMBUSTÍVEL", SINTETICO: "SINT", SEMISSINTETICO: "SEMISSINT",
};
const REGEX_EMBALAGEM = /\b(\d+(?:[.,]\d+)?\s?(?:ML|L|LT|KG|G|JG))\b/gi;
const REGEX_VISCOSIDADE = /\b\d{1,3}W-?\d{0,3}\b/gi;

export type SituacaoPadronizacao = "✅ Pronto" | "⚠️ Ajustado automaticamente" | "❌ Requer revisão manual";
export interface RegistroPadronizado {
  codigoInterno: string; descricaoAnterior: string; descricaoAtualizada: string; marca: string;
  subgrupo: string; unidade: string; caracteristica: string; situacao: SituacaoPadronizacao; problemas: string;
}
interface LinhaEntrada { codigoInterno: string; descricao: string; marca: string; subgrupo: string; unidade: string; caracteristica: string; }

export function mergeMarcas(marcasExtra: string[] = []): string[] {
  return Array.from(new Set([...MARCAS_CONHECIDAS_PADRAO, ...marcasExtra.map((marca) => marca.toUpperCase().trim())])).filter(Boolean).sort((a, b) => b.length - a.length);
}
export function aplicarEquivalencias(texto: string, sinonimos: Synonym[]): string {
  return sinonimos.filter((sinonimo) => sinonimo.ativo).reduce((resultado, sinonimo) => {
    try { return resultado.replace(new RegExp(sinonimo.padrao, "gi"), sinonimo.substituicao); } catch { return resultado; }
  }, texto);
}
function limparTexto(texto: string): string {
  let resultado = texto.toUpperCase();
  for (const [incorreto, correto] of Object.entries(CORRECOES)) resultado = resultado.replace(new RegExp(`\\b${incorreto}\\b`, "g"), correto);
  return normalizeUnits(resultado).replace(REGEX_VISCOSIDADE, (valor) => valor.replace("-", "")).replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}
function escaparRegex(valor: string): string { return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function extrairEmbalagem(texto: string): string | null {
  const ocorrencias = Array.from(texto.matchAll(REGEX_EMBALAGEM));
  return ocorrencias.length ? ocorrencias.at(-1)![1].replace(/\s+/g, "").replace("LT", "L").toUpperCase() : null;
}
function unidadeDaEmbalagem(embalagem: string | null): string {
  if (!embalagem) return ""; if (embalagem.endsWith("ML")) return "ML"; if (embalagem.endsWith("KG") || embalagem.endsWith("G")) return "KG"; if (embalagem.endsWith("JG")) return "JG"; return "LT";
}
function detectarMarca(texto: string, marcas: string[]): string { return marcas.find((marca) => new RegExp(`\\b${escaparRegex(marca)}\\b`).test(texto)) ?? ""; }
function detectarSubgrupo(texto: string): string {
  const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\bARLA\b|\bUREIA\b/.test(normalizado)) return "ARLA 32";
  if (/\bFILTRO\b/.test(normalizado) && /\b(CABINE|POLLEN)\b/.test(normalizado)) return "FILTRO AR CABINE";
  if (/\bFILTRO\b/.test(normalizado) && /\b(OLEO|LUBRIFICANTE|ELEMENTO FILTRANTE)\b/.test(normalizado)) return "FILTRO DE ÓLEO";
  if (/\bFILTRO\b/.test(normalizado) && /\b(COMBUSTIVEL|DIESEL)\b/.test(normalizado)) return "FILTRO DE COMBUSTÍVEL";
  if (/\bFILTRO\b/.test(normalizado) && /\bSEPARADOR\b/.test(normalizado)) return "FILTRO SEPARADOR";
  if (/\bFILTRO\b/.test(normalizado) && /\bHIDRAULIC/.test(normalizado)) return "FILTRO HIDRÁULICO";
  if (/\bFILTRO\b/.test(normalizado) && /\b(AR|ELEMENTO FILTRANTE)\b/.test(normalizado)) return "FILTRO DE AR MOTOR";
  if (/\bKIT\b/.test(normalizado) && /\bFILTRO\b/.test(normalizado)) return "KIT DE FILTROS";
  if (/\bPASTILHA\b/.test(normalizado)) return "PASTILHA DE FREIO"; if (/\bPALHETA\b/.test(normalizado)) return "PALHETA";
  if (/\bBATERIA\b/.test(normalizado)) return "BATERIA"; if (/\bLAMPADA\b/.test(normalizado)) return "LÂMPADA";
  if (/\bGRA[A-Z]A\b/.test(normalizado)) return "GRAXA"; if (/\b(ATF|CVT)\b/.test(normalizado)) return "FLUIDO TRANSMISSÃO ATF/CVT";
  if (/\bFLUIDO\b/.test(normalizado) && /\bFREIO\b/.test(normalizado)) return "FLUIDO DE FREIO";
  if (/\b(ADITIVO|RADIADOR|ARREFECIMENTO)\b/.test(normalizado)) return "ADITIVO/RADIADOR";
  if (/\b(AROMATIZANTE|ODORIZADOR)\b/.test(normalizado)) return "AROMATIZANTE";
  if (/\b(CERA|SILICONE|LIMPA CONTATO|DESENGRAXANTE|SHAMPOO)\b/.test(normalizado)) return "LIMPEZA AUTOMOTIVA";
  if (/\b(OLEO|LUBRIFICANTE)\b/.test(normalizado)) {
    if (/\b(MOTO|2T|4T)\b/.test(normalizado)) return "ÓLEO MOTO 2T/4T";
    if (/\b(CAMBIO|DIFERENCIAL|GL-?4|GL-?5)\b/.test(normalizado)) return "ÓLEO CÂMBIO/DIFERENCIAL";
    return /\b(DIESEL|CI-?4|CJ-?4|CH-?4|CF-?4)\b/.test(normalizado) ? "ÓLEO MOTOR DIESEL" : "ÓLEO MOTOR GASOLINA/FLEX";
  }
  return "[VERIFICAR SUBGRUPO]";
}
function montarDescricao(texto: string, subgrupo: string, marca: string, embalagem: string | null): string {
  let resto = texto;
  for (const padrao of [/\bELEMENTO FILTRANTE\b/gi, /\bFILTRO\s+(?:DE\s+)?AR\s+PRIM[ÁA]RIO\b/gi, /\bFILTRO\s+(?:DE\s+)?AR\b/gi, /\bFILTRO\s+(?:DE\s+)?Ó?LEO\b/gi, /\bFILTRO\s+LUBRIFICANTE\b/gi, /\bFILTRO\s+(?:DE\s+)?COMBUST[ÍI]VEL\b/gi, /\bÓLEO\s+MOTO\b/gi, /\bÓLEO\s+CÂMBIO\b/gi, /\bÓLEO\b/gi, /\bFLUIDO\s+DE\s+FREIO\b/gi, /\bFLUIDO\b/gi, /\bPASTILHA\s+DE\s+FREIO\b/gi, /\bPASTILHA\b/gi, /\bPALHETA\b/gi, /\bBATERIA\b/gi, /\bLÂMPADA\b/gi, /\bADITIVO\b/gi, /\bARLA\s*32\b/gi, /\bGRAXA\b/gi, /\bUN\b/gi]) resto = resto.replace(padrao, " ");
  if (SUBGRUPOS_COM_EMBALAGEM.has(subgrupo)) resto = resto.replace(REGEX_EMBALAGEM, " ");
  return [TIPOS_FIXOS[subgrupo], marca, resto.replace(/\s+/g, " ").trim(), SUBGRUPOS_COM_EMBALAGEM.has(subgrupo) ? embalagem : ""].filter(Boolean).join(" ");
}
function caracteristicaPadrao(subgrupo: string, recebida: string): string {
  if (recebida.trim()) return limparTexto(recebida);
  return ({ "ÓLEO MOTOR GASOLINA/FLEX": "VEÍCULOS LEVES GASOLINA/FLEX", "ÓLEO MOTOR DIESEL": "VEÍCULOS LEVES DIESEL", "ÓLEO MOTO 2T/4T": "MOTOCICLETAS 4T", "ÓLEO CÂMBIO/DIFERENCIAL": "TRANSMISSÃO MANUAL/DIFERENCIAL", "FLUIDO TRANSMISSÃO ATF/CVT": "TRANSMISSÃO AUTOMÁTICA ATF", "FLUIDO DE FREIO": "SISTEMA DE FREIO", "ADITIVO/RADIADOR": "SISTEMA DE ARREFECIMENTO", "ARLA 32": "SISTEMA ARLA/SCR", AROMATIZANTE: "USO UNIVERSAL AUTOMOTIVO", "LIMPEZA AUTOMOTIVA": "USO UNIVERSAL AUTOMOTIVO" } as Record<string, string>)[subgrupo] ?? "PENDÊNCIA DE REVISÃO MANUAL";
}
function lerLinha(linha: string): LinhaEntrada | null {
  const colunas = linha.split("|").map((coluna) => coluna.trim()).filter(Boolean);
  if (colunas.length >= 7 && !/C[ÓO]DIGO_INTERNO/i.test(colunas[0])) return { codigoInterno: colunas[0], descricao: colunas[1], marca: colunas[3], subgrupo: colunas[4], unidade: colunas[5], caracteristica: colunas.slice(6).join(" | ") };
  if (colunas.length === 2) return { codigoInterno: colunas[0], descricao: colunas[1], marca: "", subgrupo: "", unidade: "", caracteristica: "" };
  return linha.trim() ? { codigoInterno: "", descricao: linha.trim(), marca: "", subgrupo: "", unidade: "", caracteristica: "" } : null;
}
export function padronizarLinha(linha: string, marcas = MARCAS_CONHECIDAS_PADRAO, sinonimos: Synonym[] = []): RegistroPadronizado | null {
  const entrada = lerLinha(linha); if (!entrada) return null;
  const texto = limparTexto(aplicarEquivalencias(entrada.descricao, sinonimos));
  const subgrupo = TIPOS_FIXOS[entrada.subgrupo] ? entrada.subgrupo : detectarSubgrupo(texto);
  const marca = limparTexto(entrada.marca) || detectarMarca(texto, marcas);
  const embalagem = extrairEmbalagem(texto);
  const unidade = SUBGRUPOS_DE_PECA.has(subgrupo) ? "UN" : unidadeDaEmbalagem(embalagem) || limparTexto(entrada.unidade);
  const descricaoAtualizada = montarDescricao(texto, subgrupo, marca, embalagem);
  const problemas: string[] = [];
  if (entrada.descricao !== descricaoAtualizada) problemas.push("Descrição normalizada para o tipo fixo do subgrupo");
  if (/\bUN\b/i.test(entrada.descricao) && SUBGRUPOS_DE_PECA.has(subgrupo)) problemas.push("Unidade removida da descrição de peça");
  if (subgrupo === "[VERIFICAR SUBGRUPO]") problemas.push("Subgrupo não identificado com segurança");
  if (!marca) problemas.push("Marca não identificada");
  if (SUBGRUPOS_COM_EMBALAGEM.has(subgrupo) && !embalagem) problemas.push("Embalagem/volume não identificado");
  if (subgrupo.startsWith("ÓLEO") && !/\b(SINT|SEMISSINT|MINERAL)\b/.test(texto)) problemas.push("Base do óleo não identificada");
  if (/\[VERIFICAR/.test(texto)) problemas.push("Entrada marcada para verificação");
  const requerRevisao = subgrupo === "[VERIFICAR SUBGRUPO]" || !marca || (SUBGRUPOS_COM_EMBALAGEM.has(subgrupo) && !embalagem) || /\[VERIFICAR/.test(texto);
  return { codigoInterno: entrada.codigoInterno || "—", descricaoAnterior: entrada.descricao, descricaoAtualizada: descricaoAtualizada || texto, marca: marca || "[VERIFICAR MARCA]", subgrupo, unidade: unidade || "[VERIFICAR UNIDADE]", caracteristica: caracteristicaPadrao(subgrupo, entrada.caracteristica), situacao: requerRevisao ? "❌ Requer revisão manual" : problemas.length ? "⚠️ Ajustado automaticamente" : "✅ Pronto", problemas: problemas.length ? problemas.join("; ") : "—" };
}
export function padronizarLista(texto: string, marcas = MARCAS_CONHECIDAS_PADRAO, sinonimos: Synonym[] = []): RegistroPadronizado[] {
  return texto.split(/\r?\n/).map((linha) => padronizarLinha(linha, marcas, sinonimos)).filter((registro): registro is RegistroPadronizado => registro !== null);
}
export function tabelaMarkdown(registros: RegistroPadronizado[]): string {
  const cabecalho = "| CÓDIGO_INTERNO | DESCRIÇÃO_ANTERIOR | DESCRIÇÃO_ATUALIZADA | MARCA | SUBGRUPO | UNIDADE | CARACTERÍSTICA |";
  const separador = "| --- | --- | --- | --- | --- | --- | --- |";
  const linhas = registros.map((registro) => `| ${[registro.codigoInterno, registro.descricaoAnterior, registro.descricaoAtualizada, registro.marca, registro.subgrupo, registro.unidade, registro.caracteristica].map((valor) => valor.replace(/\\|/g, "/").trim()).join(" | ")} |`);
  return [cabecalho, separador, ...linhas].join("\n");
}
