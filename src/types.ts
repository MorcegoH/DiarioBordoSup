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
 * Representa um comentário ou apontamento de auxílio feito por um líder no fechamento de turno.
 */
export interface ComentarioPassagem {
  id: string;
  autor: string; // Nome do líder/supervisor
  contexto: 'funcionou' | 'pendente' | 'geral'; // Se o comentário é sobre o que funcionou ou auxílio na pendência
  tipo: 'auxilio' | 'reconhecimento' | 'alinhamento'; // Tipo do apontamento
  mensagem: string; // Texto do comentário/auxílio
  dataHora: string; // ISO string do comentário
}

/**
 * Representa o registro de Fechamento de Turno / Resumo Diário e Pendências.
 */
export interface ResumoPassagem {
  id: string;
  data: string; // Formato YYYY-MM-DD
  supervisor: string;
  oQueFuncionou: string;
  oQueFicaPendente: string;
  dataHoraCriacao: string; // ISO string de criação do registro
  dataHoraConclusao?: string; // ISO string de conclusão da pendência
  status?: 'Pendente' | 'Concluído';
  observacaoConclusao?: string; // Tabulação / Explicação da solução aplicada na conclusão
  responsavelConclusao?: string; // Supervisor ou responsável que concluiu a pendência
  comentarios?: ComentarioPassagem[]; // Lista de comentários e auxílios de outros líderes
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

/**
 * =====================================================================
 * TIPOS PARA A ABA: SOLICITAÇÕES DE DESCONTO & GOVERNANÇA FINANCEIRA
 * =====================================================================
 */

export type TipoDesconto = 'Adesão' | 'Plano';

export type StatusDesconto = 'Aguardando Aprovação' | 'Aprovado' | 'Negado';

export interface SolicitacaoDesconto {
  id: string;
  dataHoraSolicitacao: string; // ISO string
  cliente: string;
  supervisora: 'Débora Rodrigues' | 'Gerência (Heder Santos)' | string;
  consultor: string;
  placa: string;
  tipoDesconto: TipoDesconto;
  valorCheio: number; // R$ 200,00 se Adesão, ou valor digitado se Plano
  descontoInput: number; // R$ se Adesão, % se Plano
  valorDescontoCalculado: number; // Em R$ efetivo
  percentualDesconto: number; // % efetivo (máx 20% no plano)
  valorFinal: number; // valorCheio - valorDescontoCalculado
  justificativa: string;
  status: StatusDesconto;
  dataHoraAprovacao?: string;
  parecer?: string;
  aprovador?: string;
  tipoRegistro?: 'SolicitacaoSupervisao' | 'LiberacaoGerencial';
}

export interface BudgetSupervisor {
  tetoMensal: number;
  totalUtilizado: number;
  saldoDisponivel: number;
  totalPendente: number;
}

export interface BudgetManager {
  tetoMensal: number;
  totalUtilizado: number;
  saldoDisponivel: number;
}

export interface BudgetCycleInfo {
  mesAno: string; // formato "YYYY-MM", ex: "2026-08"
  mesExtenso: string; // ex: "Agosto de 2026"
  mesCurto: string; // ex: "Ago/2026"
  periodoInicio: string; // ex: "01/08/2026"
  periodoFim: string; // ex: "31/08/2026"
  dataConsulta: string; // ex: "15/08/2026"
  diasRestantesParaRenovacao: number;
  dataProximaRenovacao: string; // ex: "01/09/2026"
  isMesAtual: boolean;
}

export interface BudgetState {
  tetoTotalDepartamento: number; // R$ 900,00
  reservaGerente: number; // R$ 100,00
  gerente?: BudgetManager;
  debora: BudgetSupervisor; // R$ 800,00 base unificada
  marilia?: BudgetSupervisor; // retrocompatibilidade
  ciclo: BudgetCycleInfo;
}

/**
 * =====================================================================
 * TIPOS PARA BACKUP, PONTO DE RESTAURAÇÃO E RESET SEGURO DO BANCO
 * =====================================================================
 */
export interface PontoRestauracao {
  id: string; // Ex: "ponto-20260822-145000"
  dataHora: string; // ISO string
  titulo: string; // Ex: "Ponto Automático pré-Reset Geral"
  motivo: 'pre_reset' | 'manual' | 'agendado';
  autor: string; // Ex: "Heder Santos (Administrador)"
  contagem: {
    ocorrencias: number;
    passagens: number;
    solicitacoesDesconto: number;
    totalRegistros: number;
  };
  dados: {
    ocorrencias: Ocorrencia[];
    passagens: ResumoPassagem[];
    solicitacoesDesconto: SolicitacaoDesconto[];
  };
  scriptSql: string; // Script SQL com regras nativas para recriação e restauração direta no Supabase
}

