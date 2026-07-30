/**
 * exportExcel
 * ===========
 * Exportação do relatório do Verificador de Inventário em .xlsx com
 * formatação (cores por status, cabeçalho destacado, auto-filtro,
 * largura de coluna automática). Roda 100% no navegador via `exceljs`
 * (o `xlsx`/SheetJS já usado no projeto não escreve estilo de célula na
 * versão gratuita).
 *
 * Cores seguem a mesma lógica de `StatusBadge.tsx`, só que em tons sólidos
 * (Excel não tem opacidade), pra manter a leitura consistente entre a
 * tela e a planilha.
 */

import ExcelJS from "exceljs";
import type { MatchResult } from "./matching";

const COR_CABECALHO = "FF22262B"; // --surface-2
const COR_TEXTO_CABECALHO = "FFF2F0EA"; // --foreground

const COR_POR_STATUS: Record<string, { fundo: string; texto: string }> = {
  "✅": { fundo: "FFE3F5EA", texto: "FF1E6B41" }, // ok
  "⚠️": { fundo: "FFFCEFD4", texto: "FF92620C" }, // accent/amber
  "❓": { fundo: "FFEDE6FB", texto: "FF5B3AA0" }, // roxo (revisar)
  "❌": { fundo: "FFFBE4E3", texto: "FFA23731" }, // danger
};

function corPorSituacao(situacao: string) {
  const chave = Object.keys(COR_POR_STATUS).find((k) => situacao.startsWith(k));
  return chave ? COR_POR_STATUS[chave] : null;
}

export interface ExportOptions {
  nomeArquivo?: string;
  /** Nome do arquivo/base usada na verificação, exibido na aba de resumo. */
  origemBase?: string;
}

export async function exportarExcel(resultados: MatchResult[], options: ExportOptions = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Verificador de Inventário — Super Troca de Óleo";
  workbook.created = new Date();

  // ---------- Aba 1: Resultado completo ----------
  const abaResultado = workbook.addWorksheet("Resultado completo", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const colunas = [
    { header: "Produto pesquisado", key: "produto", width: 38 },
    { header: "Situação", key: "situacao", width: 26 },
    { header: "Código", key: "codigo", width: 16 },
    { header: "Descrição encontrada", key: "descricao", width: 42 },
    { header: "Score (%)", key: "score", width: 12 },
    { header: "Nº de candidatos", key: "candidatos", width: 16 },
  ];
  abaResultado.columns = colunas;

  const headerRow = abaResultado.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO } };
    cell.font = { bold: true, color: { argb: COR_TEXTO_CABECALHO } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF2C3137" } } };
  });
  headerRow.height = 22;

  resultados.forEach((r, i) => {
    const row = abaResultado.addRow({
      produto: r.produtoPesquisado,
      situacao: r.situacao,
      codigo: r.codigo,
      descricao: r.descricaoEncontrada,
      score: r.score || "",
      candidatos: r.candidatos.length || "",
    });

    const cor = corPorSituacao(r.situacao);
    const zebra = i % 2 === 1;
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFE4E4E4" } } };
      if (cor) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cor.fundo } };
        cell.font = { color: { argb: cor.texto } };
      } else if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F7" } };
      }
    });
    row.getCell("score").alignment = { horizontal: "right" };
    row.getCell("candidatos").alignment = { horizontal: "right" };
  });

  abaResultado.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colunas.length },
  };

  // ---------- Aba 2: Só pendências (tudo que não é ✅ Encontrado) ----------
  const pendencias = resultados.filter((r) => !r.situacao.startsWith("✅"));
  if (pendencias.length > 0) {
    const abaPendencias = workbook.addWorksheet("Pendências", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    abaPendencias.columns = colunas;
    const headerP = abaPendencias.getRow(1);
    headerP.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO } };
      cell.font = { bold: true, color: { argb: COR_TEXTO_CABECALHO } };
      cell.border = { bottom: { style: "thin", color: { argb: "FF2C3137" } } };
    });
    headerP.height = 22;

    pendencias.forEach((r) => {
      const row = abaPendencias.addRow({
        produto: r.produtoPesquisado,
        situacao: r.situacao,
        codigo: r.codigo,
        descricao: r.descricaoEncontrada,
        score: r.score || "",
        candidatos: r.candidatos.length || "",
      });
      const cor = corPorSituacao(r.situacao);
      row.eachCell((cell) => {
        cell.border = { bottom: { style: "hair", color: { argb: "FFE4E4E4" } } };
        if (cor) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cor.fundo } };
          cell.font = { color: { argb: cor.texto } };
        }
      });
    });
    abaPendencias.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: colunas.length },
    };
  }

  // ---------- Aba 3: Resumo ----------
  const abaResumo = workbook.addWorksheet("Resumo");
  abaResumo.columns = [
    { header: "Métrica", key: "metrica", width: 28 },
    { header: "Valor", key: "valor", width: 16 },
  ];
  const headerR = abaResumo.getRow(1);
  headerR.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO } };
    cell.font = { bold: true, color: { argb: COR_TEXTO_CABECALHO } };
  });

  const contagem = {
    "Total verificado": resultados.length,
    "✅ Encontrados": resultados.filter((r) => r.situacao === "✅ Encontrado").length,
    "⚠️ Divergência de descrição": resultados.filter((r) => r.situacao === "⚠️ Divergência de descrição").length,
    "⚠️ Duplicado na base": resultados.filter((r) => r.situacao === "⚠️ Duplicado na base").length,
    "⚠️ Produto inativo": resultados.filter((r) => r.situacao === "⚠️ Produto inativo").length,
    "❓ Possível match — revisar": resultados.filter((r) => r.situacao.startsWith("❓")).length,
    "❌ Não encontrados": resultados.filter((r) => r.situacao.startsWith("❌")).length,
  };
  if (options.origemBase) {
    abaResumo.addRow({ metrica: "Base utilizada", valor: options.origemBase });
  }
  abaResumo.addRow({ metrica: "Gerado em", valor: new Date().toLocaleString("pt-BR") });
  abaResumo.addRow({});
  Object.entries(contagem).forEach(([k, v]) => {
    abaResumo.addRow({ metrica: k, valor: v });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.nomeArquivo ?? "verificacao_inventario.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}