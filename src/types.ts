/**
 * @file src/types.ts
 * @description Definições de tipos e interfaces do sistema "Diário de Bordo - Supervisão Inside Sales".
 * Aplicando tipagem estrita para segurança de dados na operação de Sales Ops.
 */

export type Categoria = 
  | 'Sistemas & Ferramentas'
  | 'Qualidade de Leads & Mídia'
  | 'Processos & SLA'
  | 'Pessoas & Performance'
  | 'Comercial & Objeções';

export type Impacto = 'Baixo' | 'Médio' | 'Crítico';

export type Status = 'Pendente' | 'Em Análise' | 'Resolvido';

/**
 * Representa um registro individual de atualização de andamento da ocorrência (Card de Trabalho).
 */
export interface RegistroAtualizacao {
  id: string;
  dataHora: string; // ISO string de data e hora do registro de andamento
  supervisor: string;
  observacao: string;
  statusNoMomento?: Status;
  impactoNoMomento?: Impacto;
}

/**
 * Representa um registro individual de ocorrência operacional de vendas.
 */
export interface Ocorrencia {
  id: string;
  dataHora: string; // ISO string de data e hora do registro
  dataHoraConclusao?: string; // ISO string de data e hora de conclusão/resolução
  supervisor: string;
  categoria: Categoria;
  descricao: string;
  impacto: Impacto;
  acaoTomada: string;
  status: Status;
  duracaoMinutos?: number; // Duração estimada para resolução (se resolvido)
  historicoAtualizacoes?: RegistroAtualizacao[]; // Registro de atualizações de andamento no Card de Trabalho
}

/**
 * Representa o registro de Fechamento de Turno / Resumo Diário.
 */
export interface ResumoPassagem {
  id: string;
  data: string; // Formato YYYY-MM-DD
  supervisor: string;
  oQueFuncionou: string;
  oQueFicaPendente: string;
  dataHoraCriacao: string;
}

/**
 * Resultado da Análise Estatística de Z-Score para Detecção de Anomalias.
 */
export interface AnomaliaZScore {
  categoria: Categoria | string;
  quantidade: number;
  mediaEsperada: number;
  desvioPadrao: number;
  zScore: number;
  isOutlier: boolean;
  nivelAlerta: 'Normal' | 'Atenção' | 'Anomalia Crítica';
  mensagem: string;
}

/**
 * Filtros para histórico de ocorrências.
 */
export interface FiltrosOcorrencia {
  busca: string;
  categoria: string;
  impacto: string;
  status: string;
  supervisor: string;
  dataInicio?: string;
  dataFim?: string;
}
