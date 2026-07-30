/**
 * fileParser
 * ==========
 * Leitura de planilhas (Excel/CSV) da base de produtos, direto no
 * navegador (SheetJS + PapaParse). Detecta a linha de cabeçalho
 * automaticamente, tentando reconhecer colunas de código/descrição/ativo.
 */

import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toUpperNoAccent } from "./textUtils";

const CODE_HINTS = ["codigo", "código", "cod", "sku", "referencia", "referência", "ref"];
const DESC_HINTS = ["descricao", "descrição", "desc", "produto", "nome", "item"];
const ACTIVE_HINTS = ["ativo", "situacao", "situação", "status"];

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
  guessed: { codigo: string | null; descricao: string | null; ativo: string | null };
}

function guessColumns(headers: string[]) {
  const guessed: { codigo: string | null; descricao: string | null; ativo: string | null } = {
    codigo: null,
    descricao: null,
    ativo: null,
  };
  for (const h of headers) {
    const low = toUpperNoAccent(h).toLowerCase();
    if (!guessed.codigo && CODE_HINTS.some((hint) => low.includes(hint))) guessed.codigo = h;
    if (!guessed.descricao && DESC_HINTS.some((hint) => low.includes(hint))) guessed.descricao = h;
    if (!guessed.ativo && ACTIVE_HINTS.some((hint) => low.includes(hint))) guessed.ativo = h;
  }
  return guessed;
}

function guessHeaderRow(matrix: unknown[][], maxScan = 10): number {
  let bestRow = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(maxScan, matrix.length); i++) {
    const row = (matrix[i] || []).map((v) => String(v ?? "").trim().toLowerCase());
    let score = 0;
    for (const hints of [CODE_HINTS, DESC_HINTS, ACTIVE_HINTS]) {
      if (row.some((cell) => hints.some((h) => cell.includes(h)))) score += 1;
    }
    const nonEmpty = row.filter((c) => c !== "" && c !== "nan" && c !== "none").length;
    score += nonEmpty / Math.max(row.length, 1);
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestRow;
}

function matrixToSheet(matrix: unknown[][]): ParsedSheet {
  if (!matrix.length) {
    return { headers: [], rows: [], guessed: { codigo: null, descricao: null, ativo: null } };
  }
  const headerRow = guessHeaderRow(matrix);
  const rawNames = (matrix[headerRow] || []).map((v) => String(v ?? "").trim());
  const seen: Record<string, number> = {};
  const finalNames = rawNames.map((name, j) => {
    let colName = name && name.toLowerCase() !== "nan" ? name : `coluna_${j + 1}`;
    if (seen[colName] !== undefined) {
      seen[colName] += 1;
      colName = `${colName}_${seen[colName]}`;
    } else {
      seen[colName] = 0;
    }
    return colName;
  });

  const dataRows = matrix.slice(headerRow + 1);
  const rows: Record<string, string>[] = dataRows
    .map((r) => {
      const obj: Record<string, string> = {};
      finalNames.forEach((name, idx) => {
        obj[name] = r[idx] !== undefined && r[idx] !== null ? String(r[idx]) : "";
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => v.trim() !== ""));

  return { headers: finalNames, rows, guessed: guessColumns(finalNames) };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
    return matrixToSheet(parsed.data as unknown[][]);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  return matrixToSheet(matrix);
}

export function normalizeActiveValue(val: string | undefined | null): boolean {
  if (val === undefined || val === null || val === "") return true;
  const s = toUpperNoAccent(String(val));
  if (["NAO", "N", "0", "FALSE", "INATIVO", "NEGATIVO", "F"].includes(s)) return false;
  if (["SIM", "S", "1", "TRUE", "ATIVO", "POSITIVO", "T"].includes(s)) return true;
  return true;
}
