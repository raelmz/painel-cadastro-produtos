/**
 * storage
 * =======
 * Persistência local (localStorage do navegador) — sem backend, sem
 * banco externo. Tudo fica salvo na própria máquina de quem usa o app.
 *
 * Chaves usadas:
 *  - vp:base            -> base de produtos importada (código/descrição/ativo)
 *  - vp:baseMeta         -> nome do arquivo e data de importação
 *  - vp:sinonimos        -> dicionário de sinônimos/equivalências
 *  - vp:historico_verif  -> histórico de verificações de inventário
 *  - vp:historico_padr   -> histórico de padronizações
 *  - vp:fila             -> fila de itens pendentes de cadastro
 */

import type { BaseProduct } from "./matching";
import type { Synonym } from "./textUtils";

const KEYS = {
  base: "vp:base",
  baseMeta: "vp:baseMeta",
  sinonimos: "vp:sinonimos",
  historicoVerif: "vp:historico_verif",
  historicoPadr: "vp:historico_padr",
  fila: "vp:fila",
} as const;

function isBrowser() {
  return typeof window !== "undefined";
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export interface BaseMeta {
  nomeArquivo: string;
  importadoEm: string;
  total: number;
}

export const storage = {
  getBase(): BaseProduct[] {
    return readJSON<BaseProduct[]>(KEYS.base, []);
  },
  setBase(base: BaseProduct[], meta: BaseMeta) {
    writeJSON(KEYS.base, base);
    writeJSON(KEYS.baseMeta, meta);
  },
  getBaseMeta(): BaseMeta | null {
    return readJSON<BaseMeta | null>(KEYS.baseMeta, null);
  },
  clearBase() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(KEYS.base);
    window.localStorage.removeItem(KEYS.baseMeta);
  },

  getSinonimos(): Synonym[] {
    return readJSON<Synonym[]>(KEYS.sinonimos, []);
  },
  setSinonimos(synonyms: Synonym[]) {
    writeJSON(KEYS.sinonimos, synonyms);
  },

  getHistoricoVerificacoes<T>(): T[] {
    return readJSON<T[]>(KEYS.historicoVerif, []);
  },
  addHistoricoVerificacao<T>(entry: T, limit = 200) {
    const atual = readJSON<T[]>(KEYS.historicoVerif, []);
    const novo = [entry, ...atual].slice(0, limit);
    writeJSON(KEYS.historicoVerif, novo);
  },

  getHistoricoPadronizacoes<T>(): T[] {
    return readJSON<T[]>(KEYS.historicoPadr, []);
  },
  addHistoricoPadronizacao<T>(entry: T, limit = 200) {
    const atual = readJSON<T[]>(KEYS.historicoPadr, []);
    const novo = [entry, ...atual].slice(0, limit);
    writeJSON(KEYS.historicoPadr, novo);
  },

  getFila<T>(): T[] {
    return readJSON<T[]>(KEYS.fila, []);
  },
  setFila<T>(fila: T[]) {
    writeJSON(KEYS.fila, fila);
  },

  /**
   * Backup/restore — exporta/importa TUDO que está salvo no localStorage
   * do app (base, sinônimos, históricos, fila) num único JSON. Não muda
   * a decisão de "sem banco de dados" (ver CONTEXTO_PROJETO.md seção 4):
   * é só uma forma de não perder tudo ao limpar o navegador ou trocar de
   * computador — o usuário baixa o arquivo e importa manualmente onde
   * precisar.
   */
  exportBackup(): BackupPayload {
    return {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      base: this.getBase(),
      baseMeta: this.getBaseMeta(),
      sinonimos: this.getSinonimos(),
      historicoVerificacoes: this.getHistoricoVerificacoes(),
      historicoPadronizacoes: this.getHistoricoPadronizacoes(),
      fila: this.getFila(),
    };
  },

  downloadBackup() {
    if (!isBrowser()) return;
    const payload = this.exportBackup();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const carimbo = new Date().toISOString().slice(0, 10);
    a.download = `backup_verificador_${carimbo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Restaura um backup exportado por `exportBackup`/`downloadBackup`.
   * Substitui os dados atuais — pedir confirmação ao usuário antes de
   * chamar isso na UI. Lança erro se o arquivo não tiver o formato
   * esperado, pra tela poder avisar em vez de corromper o estado. */
  restoreBackup(payload: unknown) {
    if (!isBrowser()) return;
    if (!payload || typeof payload !== "object" || !("versao" in payload)) {
      throw new Error("Arquivo de backup inválido ou de outra versão.");
    }
    const p = payload as BackupPayload;
    if (Array.isArray(p.base)) writeJSON(KEYS.base, p.base);
    if (p.baseMeta) writeJSON(KEYS.baseMeta, p.baseMeta);
    if (Array.isArray(p.sinonimos)) writeJSON(KEYS.sinonimos, p.sinonimos);
    if (Array.isArray(p.historicoVerificacoes)) writeJSON(KEYS.historicoVerif, p.historicoVerificacoes);
    if (Array.isArray(p.historicoPadronizacoes)) writeJSON(KEYS.historicoPadr, p.historicoPadronizacoes);
    if (Array.isArray(p.fila)) writeJSON(KEYS.fila, p.fila);
  },
};

export interface BackupPayload {
  versao: number;
  exportadoEm: string;
  base: BaseProduct[];
  baseMeta: BaseMeta | null;
  sinonimos: Synonym[];
  historicoVerificacoes: unknown[];
  historicoPadronizacoes: unknown[];
  fila: unknown[];
}