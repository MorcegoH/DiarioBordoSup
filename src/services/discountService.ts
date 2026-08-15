/**
 * @file src/services/discountService.ts
 * @description Serviço de persistência e gerenciamento de regras financeiras para Solicitações de Desconto.
 */

import { SolicitacaoDesconto, BudgetState, BudgetCycleInfo } from '../types';
import { INITIAL_MOCK_DESCONTOS, BUDGET_LIMITS } from '../data/discountData';

const LOCAL_STORAGE_KEY = 'diario_bordo_solicitacoes_desconto_v1';

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Extrai a chave "YYYY-MM" de uma string ISO ou objeto Date
 */
export function extrairMesAno(dataIsoOuDate?: string | Date): string {
  const d = dataIsoOuDate ? new Date(dataIsoOuDate) : new Date();
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}`;
  }
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

/**
 * Monta as informações completas do ciclo mensal
 */
export function gerarInfoCiclo(mesAnoRef?: string): BudgetCycleInfo {
  const agora = new Date();
  const mesAnoAtual = extrairMesAno(agora);
  const mesAno = mesAnoRef || mesAnoAtual;
  
  const [anoStr, mesStr] = mesAno.split('-');
  const ano = parseInt(anoStr, 10) || agora.getFullYear();
  const mesIdx = (parseInt(mesStr, 10) || (agora.getMonth() + 1)) - 1; // 0-indexado
  
  const mesExtenso = `${MESES_NOMES[mesIdx] || 'Mês'} de ${ano}`;
  const mesCurto = `${MESES_CURTOS[mesIdx] || 'Mês'}/${ano}`;
  
  const primeiroDia = new Date(ano, mesIdx, 1);
  const ultimoDia = new Date(ano, mesIdx + 1, 0);
  const proximaRenovacao = new Date(ano, mesIdx + 1, 1);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const periodoInicio = `${pad(primeiroDia.getDate())}/${pad(primeiroDia.getMonth() + 1)}/${primeiroDia.getFullYear()}`;
  const periodoFim = `${pad(ultimoDia.getDate())}/${pad(ultimoDia.getMonth() + 1)}/${ultimoDia.getFullYear()}`;
  const dataProximaRenovacao = `${pad(proximaRenovacao.getDate())}/${pad(proximaRenovacao.getMonth() + 1)}/${proximaRenovacao.getFullYear()}`;
  const dataConsulta = `${pad(agora.getDate())}/${pad(agora.getMonth() + 1)}/${agora.getFullYear()}`;
  
  // Cálculo de dias restantes para renovação do teto
  const diffMs = proximaRenovacao.getTime() - agora.getTime();
  const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  
  return {
    mesAno,
    mesExtenso,
    mesCurto,
    periodoInicio,
    periodoFim,
    dataConsulta,
    diasRestantesParaRenovacao: diasRestantes,
    dataProximaRenovacao,
    isMesAtual: mesAno === mesAnoAtual
  };
}

class DiscountService {
  /**
   * Recupera a lista de solicitações de desconto salvas
   */
  getSolicitacoes(): SolicitacaoDesconto[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler solicitações de desconto do localStorage:', e);
    }
    // Salvar mock inicial na primeira vez
    this.saveToStorage(INITIAL_MOCK_DESCONTOS);
    return INITIAL_MOCK_DESCONTOS;
  }

  /**
   * Salva a lista no LocalStorage
   */
  private saveToStorage(solicitacoes: SolicitacaoDesconto[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(solicitacoes));
    } catch (e) {
      console.error('Erro ao salvar solicitações de desconto no localStorage:', e);
    }
  }

  /**
   * Adiciona uma nova solicitação de desconto
   */
  addSolicitacao(nova: SolicitacaoDesconto): SolicitacaoDesconto[] {
    const atuais = this.getSolicitacoes();
    const atualizadas = [nova, ...atuais];
    this.saveToStorage(atualizadas);
    return atualizadas;
  }

  /**
   * Aprova uma solicitação de desconto
   */
  aprovarSolicitacao(id: string, parecer: string, aprovador: string = 'Heder Santos (Gerente)'): SolicitacaoDesconto[] {
    const atuais = this.getSolicitacoes();
    const agora = new Date().toISOString();
    const atualizadas = atuais.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Aprovado' as const,
          dataHoraAprovacao: agora,
          parecer: parecer.trim(),
          aprovador
        };
      }
      return item;
    });
    this.saveToStorage(atualizadas);
    return atualizadas;
  }

  /**
   * Reprova uma solicitação de desconto
   */
  reprovarSolicitacao(id: string, parecer: string, aprovador: string = 'Heder Santos (Gerente)'): SolicitacaoDesconto[] {
    const atuais = this.getSolicitacoes();
    const agora = new Date().toISOString();
    const atualizadas = atuais.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Negado' as const,
          dataHoraAprovacao: agora,
          parecer: parecer.trim(),
          aprovador
        };
      }
      return item;
    });
    this.saveToStorage(atualizadas);
    return atualizadas;
  }

  /**
   * Remove uma solicitação
   */
  deleteSolicitacao(id: string): SolicitacaoDesconto[] {
    const atuais = this.getSolicitacoes();
    const atualizadas = atuais.filter((item) => item.id !== id);
    this.saveToStorage(atualizadas);
    return atualizadas;
  }

  /**
   * Restaura os dados para o padrão de mock
   */
  resetData(): SolicitacaoDesconto[] {
    this.saveToStorage(INITIAL_MOCK_DESCONTOS);
    return INITIAL_MOCK_DESCONTOS;
  }

  /**
   * Recupera a lista de meses disponíveis com solicitações ou mês atual
   */
  getMesesDisponiveis(solicitacoes: SolicitacaoDesconto[]): { mesAno: string; label: string; count: number }[] {
    const mesesMap = new Map<string, number>();
    const mesAtual = extrairMesAno(new Date());
    
    // Garante que o mês atual sempre esteja presente
    mesesMap.set(mesAtual, 0);

    solicitacoes.forEach((item) => {
      const dataRef = item.dataHoraSolicitacao || item.dataHoraAprovacao;
      const chave = extrairMesAno(dataRef);
      mesesMap.set(chave, (mesesMap.get(chave) || 0) + 1);
    });

    const ordenados = Array.from(mesesMap.keys()).sort().reverse();

    return ordenados.map((chave) => {
      const ciclo = gerarInfoCiclo(chave);
      return {
        mesAno: chave,
        label: ciclo.mesExtenso,
        count: mesesMap.get(chave) || 0
      };
    });
  }

  /**
   * Calcula a posição do orçamento (Budget) referente a um mês específico.
   * Por padrão, calcula o mês atual. O teto é mensal (R$ 900 total: R$ 400 Débora, R$ 400 Marília, R$ 100 Gerente)
   * e se renova integralmente a cada mês.
   */
  calcularBudget(solicitacoes: SolicitacaoDesconto[], mesAnoReferencia?: string): BudgetState {
    const ciclo = gerarInfoCiclo(mesAnoReferencia);
    const chaveAlvo = ciclo.mesAno;

    let deboraGasto = 0;
    let deboraPendente = 0;
    let mariliaGasto = 0;
    let mariliaPendente = 0;
    let gerenteGasto = 0;

    solicitacoes.forEach((item) => {
      // Data relevante para cômputo no ciclo mensal
      const dataRef = item.dataHoraSolicitacao || item.dataHoraAprovacao;
      const mesItem = extrairMesAno(dataRef);

      // Apenas considera lançamentos pertencentes ao ciclo mensal consultado
      if (mesItem !== chaveAlvo) {
        return;
      }

      const valor = item.valorDescontoCalculado || 0;
      const isDebora = item.supervisora.includes('Débora') || item.supervisora.includes('Debora');
      const isMarilia = item.supervisora.includes('Marília') || item.supervisora.includes('Marilia');
      const isGerencia = item.supervisora.includes('Gerência') || item.tipoRegistro === 'LiberacaoGerencial';

      if (item.status === 'Aprovado') {
        if (isGerencia && !isDebora && !isMarilia) {
          gerenteGasto += valor;
        } else if (item.tipoRegistro === 'LiberacaoGerencial') {
          // Se o gerente liberou diretamente utilizando sua reserva de contingência
          gerenteGasto += valor;
        } else if (isDebora) {
          deboraGasto += valor;
        } else if (isMarilia) {
          mariliaGasto += valor;
        }
      } else if (item.status === 'Aguardando Aprovação') {
        if (isDebora) deboraPendente += valor;
        else if (isMarilia) mariliaPendente += valor;
      }
    });

    const deboraTeto = BUDGET_LIMITS.tetoSupervisoras['Débora Rodrigues'];
    const mariliaTeto = BUDGET_LIMITS.tetoSupervisoras['Marília Farias'];
    const gerenteTeto = BUDGET_LIMITS.reservaGerente;

    const deboraSaldo = Math.max(0, deboraTeto - deboraGasto);
    const mariliaSaldo = Math.max(0, mariliaTeto - mariliaGasto);
    const gerenteSaldo = Math.max(0, gerenteTeto - gerenteGasto);

    return {
      tetoTotalDepartamento: BUDGET_LIMITS.tetoTotalDepartamento,
      reservaGerente: gerenteSaldo,
      gerente: {
        tetoMensal: gerenteTeto,
        totalUtilizado: gerenteGasto,
        saldoDisponivel: gerenteSaldo
      },
      debora: {
        tetoMensal: deboraTeto,
        totalUtilizado: deboraGasto,
        saldoDisponivel: deboraSaldo,
        totalPendente: deboraPendente
      },
      marilia: {
        tetoMensal: mariliaTeto,
        totalUtilizado: mariliaGasto,
        saldoDisponivel: mariliaSaldo,
        totalPendente: mariliaPendente
      },
      ciclo
    };
  }
}

export const discountService = new DiscountService();
