/**
 * @file src/services/discountService.ts
 * @description Serviço de persistência e gerenciamento de regras financeiras para Solicitações de Desconto.
 * Integra nativamente com a tabela public.solicitacoes_desconto no Supabase e provê fallback em LocalStorage.
 */

import { SolicitacaoDesconto, BudgetState, BudgetCycleInfo } from '../types';
import { BUDGET_LIMITS } from '../data/discountData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeTextInput } from '../utils/security';

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
 * Mapeador de linha do Banco de Dados para TypeScript
 */
function mapSolicitacaoFromDB(row: any): SolicitacaoDesconto {
  return {
    id: String(row.id || ''),
    dataHoraSolicitacao: row.data_hora_solicitacao,
    cliente: sanitizeTextInput(row.cliente || '', 120),
    placa: sanitizeTextInput(row.placa || '', 10),
    consultor: sanitizeTextInput(row.consultor || '', 100),
    supervisora: sanitizeTextInput(row.supervisora || '', 100),
    tipoDesconto: row.tipo_desconto === 'Plano' ? 'Plano' : 'Adesão',
    valorCheio: Number(row.valor_cheio ?? 0),
    descontoInput: Number(row.desconto_input ?? 0),
    valorDescontoCalculado: Number(row.valor_desconto_calculado ?? 0),
    percentualDesconto: Number(row.percentual_desconto ?? 0),
    valorFinal: Number(row.valor_final ?? 0),
    justificativa: sanitizeTextInput(row.justificativa || '', 2000),
    status: row.status === 'Aprovado' ? 'Aprovado' : (row.status === 'Negado' ? 'Negado' : 'Aguardando Aprovação'),
    dataHoraAprovacao: row.data_hora_aprovacao ?? undefined,
    parecer: row.parecer ? sanitizeTextInput(row.parecer, 1500) : undefined,
    aprovador: row.aprovador ? sanitizeTextInput(row.aprovador, 100) : undefined,
    tipoRegistro: row.tipo_registro ?? 'SolicitacaoSupervisao'
  };
}

/**
 * Mapeador de TypeScript para linha do Banco de Dados
 */
export function mapSolicitacaoToDB(item: SolicitacaoDesconto) {
  const dataRef = item.dataHoraSolicitacao || new Date().toISOString();
  return {
    id: item.id,
    data_hora_solicitacao: dataRef,
    mes_competencia: extrairMesAno(dataRef),
    cliente: item.cliente,
    placa: item.placa,
    consultor: item.consultor,
    supervisora: item.supervisora,
    tipo_desconto: item.tipoDesconto,
    valor_cheio: item.valorCheio,
    desconto_input: item.descontoInput,
    valor_desconto_calculado: item.valorDescontoCalculado,
    percentual_desconto: item.percentualDesconto,
    valor_final: item.valorFinal,
    justificativa: item.justificativa,
    status: item.status,
    data_hora_aprovacao: item.dataHoraAprovacao || null,
    parecer: item.parecer || null,
    aprovador: item.aprovador || null,
    tipo_registro: item.tipoRegistro || 'SolicitacaoSupervisao'
  };
}

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
   * Recupera a lista de solicitações de desconto salvas localmente
   */
  getLocalSolicitacoes(): SolicitacaoDesconto[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filtra itens de teste antigos se existirem
          const limpos = parsed.filter(item => !item.id?.startsWith('desc-20260815-') && !item.id?.startsWith('desc-20260814-') && !item.id?.startsWith('desc-20260813-'));
          if (limpos.length !== parsed.length) {
            this.saveToStorage(limpos);
          }
          return limpos;
        }
      }
    } catch (e) {
      console.error('Erro ao ler solicitações de desconto do localStorage:', e);
    }
    return [];
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
   * Carrega as solicitações do Supabase ou LocalStorage
   */
  async getSolicitacoesAsync(): Promise<SolicitacaoDesconto[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('solicitacoes_desconto')
          .select('*')
          .order('data_hora_solicitacao', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped = data.map(mapSolicitacaoFromDB);
          this.saveToStorage(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Falha na consulta ao Supabase (solicitacoes_desconto), usando fallback local:', err);
      }
    }
    return this.getLocalSolicitacoes();
  }

  /**
   * Recupera a lista síncrona
   */
  getSolicitacoes(): SolicitacaoDesconto[] {
    return this.getLocalSolicitacoes();
  }

  /**
   * Adiciona uma nova solicitação de desconto
   */
  async addSolicitacao(nova: SolicitacaoDesconto): Promise<SolicitacaoDesconto[]> {
    const atuais = this.getLocalSolicitacoes();
    const atualizadas = [nova, ...atuais.filter(i => i.id !== nova.id)];
    this.saveToStorage(atualizadas);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('solicitacoes_desconto').insert(mapSolicitacaoToDB(nova));
      } catch (err) {
        console.error('Erro ao inserir no Supabase:', err);
      }
    }

    return atualizadas;
  }

  /**
   * Aprova uma solicitação de desconto
   */
  async aprovarSolicitacao(id: string, parecer: string, aprovador: string = 'Heder Santos (Gerente)'): Promise<SolicitacaoDesconto[]> {
    const atuais = this.getLocalSolicitacoes();
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

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('solicitacoes_desconto')
          .update({
            status: 'Aprovado',
            data_hora_aprovacao: agora,
            parecer: parecer.trim(),
            aprovador
          })
          .eq('id', id);
      } catch (err) {
        console.error('Erro ao atualizar aprovação no Supabase:', err);
      }
    }

    return atualizadas;
  }

  /**
   * Reprova uma solicitação de desconto
   */
  async reprovarSolicitacao(id: string, parecer: string, aprovador: string = 'Heder Santos (Gerente)'): Promise<SolicitacaoDesconto[]> {
    const atuais = this.getLocalSolicitacoes();
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

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('solicitacoes_desconto')
          .update({
            status: 'Negado',
            data_hora_aprovacao: agora,
            parecer: parecer.trim(),
            aprovador
          })
          .eq('id', id);
      } catch (err) {
        console.error('Erro ao atualizar reprovação no Supabase:', err);
      }
    }

    return atualizadas;
  }

  /**
   * Remove uma solicitação
   */
  async deleteSolicitacao(id: string): Promise<SolicitacaoDesconto[]> {
    const atuais = this.getLocalSolicitacoes();
    const atualizadas = atuais.filter((item) => item.id !== id);
    this.saveToStorage(atualizadas);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('solicitacoes_desconto').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar no Supabase:', err);
      }
    }

    return atualizadas;
  }

  /**
   * Limpa todos os dados
   */
  async clearAllData(): Promise<SolicitacaoDesconto[]> {
    this.saveToStorage([]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('solicitacoes_desconto').delete().neq('id', 'placeholder-none');
      } catch (err) {
        console.error('Erro ao limpar solicitacoes_desconto no Supabase:', err);
      }
    }

    return [];
  }

  /**
   * Restaura os dados para o padrão limpo
   */
  resetData(): SolicitacaoDesconto[] {
    this.saveToStorage([]);
    return [];
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
   */
  calcularBudget(solicitacoes: SolicitacaoDesconto[], mesAnoReferencia?: string): BudgetState {
    const ciclo = gerarInfoCiclo(mesAnoReferencia);
    const chaveAlvo = ciclo.mesAno;

    let deboraGasto = 0;
    let deboraPendente = 0;
    let gerenteGasto = 0;

    solicitacoes.forEach((item) => {
      const dataRef = item.dataHoraSolicitacao || item.dataHoraAprovacao;
      const mesItem = extrairMesAno(dataRef);

      if (mesItem !== chaveAlvo) {
        return;
      }

      const valor = item.valorDescontoCalculado || 0;
      const isGerencia = item.supervisora.includes('Gerência') || item.tipoRegistro === 'LiberacaoGerencial';

      if (item.status === 'Aprovado') {
        if (isGerencia || item.tipoRegistro === 'LiberacaoGerencial') {
          gerenteGasto += valor;
        } else {
          // Todas as solicitações de equipe ficam sob a supervisão unificada Débora
          deboraGasto += valor;
        }
      } else if (item.status === 'Aguardando Aprovação') {
        if (!isGerencia) {
          deboraPendente += valor;
        }
      }
    });

    const deboraTeto = BUDGET_LIMITS.tetoSupervisoras['Débora Rodrigues'] || 700.0;
    const gerenteTeto = BUDGET_LIMITS.reservaGerente;

    const deboraSaldo = Math.max(0, deboraTeto - deboraGasto);
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
        tetoMensal: 0,
        totalUtilizado: 0,
        saldoDisponivel: 0,
        totalPendente: 0
      },
      ciclo
    };
  }
}

export const discountService = new DiscountService();

