/**
 * @file src/services/inspectionService.ts
 * @description Serviço de persistência, auditoria e governança para Solicitações de Vistoria.
 * Integra nativamente com a tabela public.solicitacoes_vistoria no Supabase e provê fallback em LocalStorage.
 */

import { SolicitacaoVistoria, StatusVistoria, Vistoriador } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeTextInput } from '../utils/security';
import { safeLocalStorageSetItem, safeLocalStorageGetJSON } from '../utils/safeStorage';
import { validarPlacaVeiculo } from '../data/discountData';

const LOCAL_STORAGE_KEY = 'diario_bordo_solicitacoes_vistoria_v1';

/**
 * Mapeador de linha do Banco de Dados para TypeScript
 */
export function mapVistoriaFromDB(row: any): SolicitacaoVistoria {
  const placa = sanitizeTextInput(row.placa || '', 10).toUpperCase();
  const infoPlaca = validarPlacaVeiculo(placa);

  return {
    id: String(row.id || ''),
    dataHoraSolicitacao: row.data_hora_solicitacao || row.created_at || new Date().toISOString(),
    dataVistoria: row.data_vistoria || '',
    horarioVistoria: row.horario_vistoria || '',
    valorAdesao: Number(row.valor_adesao ?? 0),
    adesaoPaga: Boolean(row.adesao_paga),
    vistoriador: (row.vistoriador === 'Lucas' ? 'Lucas' : 'Danilo') as Vistoriador,
    nomeAssociado: sanitizeTextInput(row.nome_associado || '', 150),
    contato: sanitizeTextInput(row.contato || '', 30),
    localizacaoMaps: sanitizeTextInput(row.localizacao_maps || '', 1000),
    modeloCarro: sanitizeTextInput(row.modelo_carro || '', 100),
    placa: placa,
    tipoPlaca: infoPlaca.formato === 'Mercosul' ? 'Mercosul' : (infoPlaca.formato === 'Antigo' ? 'Tradicional' : 'Inválida'),
    linkVistoria: sanitizeTextInput(row.link_vistoria || '', 2000),
    linkPagamento: sanitizeTextInput(row.link_pagamento || '', 2000),
    solicitante: row.solicitante ? sanitizeTextInput(row.solicitante, 100) : undefined,
    status: (row.status || 'Aguardando Vistoria') as StatusVistoria,
    dataHoraAprovacao: row.data_hora_aprovacao ?? undefined,
    parecer: row.parecer ? sanitizeTextInput(row.parecer, 2000) : undefined,
    aprovador: row.aprovador ? sanitizeTextInput(row.aprovador, 100) : undefined,
    motivoReprovacao: row.motivo_reprovacao ? sanitizeTextInput(row.motivo_reprovacao, 2000) : undefined
  };
}

/**
 * Mapeador de TypeScript para linha do Banco de Dados
 */
export function mapVistoriaToDB(item: SolicitacaoVistoria) {
  const dataRef = item.dataHoraSolicitacao || new Date().toISOString();
  return {
    id: item.id,
    data_hora_solicitacao: dataRef,
    data_vistoria: item.dataVistoria,
    horario_vistoria: item.horarioVistoria,
    valor_adesao: item.valorAdesao,
    adesao_paga: item.adesaoPaga,
    vistoriador: item.vistoriador,
    nome_associado: item.nomeAssociado,
    contato: item.contato,
    localizacao_maps: item.localizacaoMaps,
    modelo_carro: item.modeloCarro,
    placa: item.placa,
    tipo_placa: item.tipoPlaca || null,
    link_vistoria: item.linkVistoria,
    link_pagamento: item.linkPagamento,
    solicitante: item.solicitante || null,
    status: item.status,
    data_hora_aprovacao: item.dataHoraAprovacao || null,
    parecer: item.parecer || null,
    aprovador: item.aprovador || null,
    motivo_reprovacao: item.motivoReprovacao || null
  };
}

const EXAMPLE_IDS = new Set(['vis-101', 'vis-102', 'vis-103']);

/**
 * Identifica se uma vistoria é um dado de exemplo/demonstração
 */
function isExemploVistoria(item: any): boolean {
  if (!item) return false;
  if (EXAMPLE_IDS.has(item.id)) return true;
  if (item.placa === 'BRA2E19' && String(item.nomeAssociado || '').includes('Carlos Eduardo')) return true;
  if (item.placa === 'ABC1234' && String(item.nomeAssociado || '').includes('Mariana Ferreira')) return true;
  if (item.placa === 'RTE4B99' && String(item.nomeAssociado || '').includes('Roberto Albuquerque')) return true;
  return false;
}

export const inspectionService = {
  /**
   * Obtém as solicitações do LocalStorage (garantindo ausência de dados de exemplo)
   */
  getVistorias(): SolicitacaoVistoria[] {
    const parsed = safeLocalStorageGetJSON<SolicitacaoVistoria[]>(LOCAL_STORAGE_KEY, []);
    if (Array.isArray(parsed)) {
      const limpas = parsed.filter((item) => !isExemploVistoria(item));
      if (limpas.length !== parsed.length) {
        this.saveToLocalStorage(limpas);
      }
      return limpas;
    }
    return [];
  },

  /**
   * Salva lista no LocalStorage de forma resiliente contra estouro de cota
   */
  saveToLocalStorage(data: SolicitacaoVistoria[]): void {
    const dadosFiltrados = (data || []).filter((item) => !isExemploVistoria(item));
    safeLocalStorageSetItem(LOCAL_STORAGE_KEY, JSON.stringify(dadosFiltrados));
  },

  /**
   * Obtém solicitações de vistoria com sincronização assíncrona com Supabase
   */
  async getVistoriasAsync(): Promise<SolicitacaoVistoria[]> {
    const locais = this.getVistorias();

    if (isSupabaseConfigured && supabase) {
      try {
        // Remove quaisquer registros de exemplo que possam ter sido gravados no Supabase
        try {
          await supabase.from('solicitacoes_vistoria').delete().in('id', ['vis-101', 'vis-102', 'vis-103']);
        } catch (delErr) {
          // Exclusão preventiva de exemplos
        }

        const { data, error } = await supabase
          .from('solicitacoes_vistoria')
          .select('*')
          .order('data_hora_solicitacao', { ascending: false });

        if (error) {
          console.warn('Tabela solicitacoes_vistoria inacessível no Supabase, usando LocalStorage:', error.message);
          return locais;
        }

        if (data && Array.isArray(data)) {
          const remotas = data
            .map(mapVistoriaFromDB)
            .filter((item) => !isExemploVistoria(item));
          this.saveToLocalStorage(remotas);
          return remotas;
        }
      } catch (err) {
        console.warn('Exceção ao buscar vistorias no Supabase:', err);
      }
    }

    return locais;
  },

  /**
   * Adiciona uma nova solicitação de vistoria
   */
  async addVistoria(nova: SolicitacaoVistoria): Promise<SolicitacaoVistoria[]> {
    const atuais = this.getVistorias();
    const infoPlaca = validarPlacaVeiculo(nova.placa);
    
    const vistoriaFinal: SolicitacaoVistoria = {
      ...nova,
      id: nova.id || `vis-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      dataHoraSolicitacao: nova.dataHoraSolicitacao || new Date().toISOString(),
      tipoPlaca: infoPlaca.formato === 'Mercosul' ? 'Mercosul' : (infoPlaca.formato === 'Antigo' ? 'Tradicional' : 'Inválida'),
      status: nova.status || 'Aguardando Vistoria'
    };

    const atualizadas = [vistoriaFinal, ...atuais];
    this.saveToLocalStorage(atualizadas);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapVistoriaToDB(vistoriaFinal);
        const { error } = await supabase.from('solicitacoes_vistoria').insert([payload]);
        if (error) {
          console.error('Erro ao inserir vistoria no Supabase:', error.message);
        }
      } catch (err) {
        console.error('Exceção ao salvar vistoria no Supabase:', err);
      }
    }

    return atualizadas;
  },

  /**
   * Aprova uma vistoria com parecer técnico
   */
  async aprovarVistoria(
    id: string,
    parecer: string,
    aprovador: string = 'Vistoriador Responsável',
    adesaoFoiPaga?: boolean
  ): Promise<SolicitacaoVistoria[]> {
    const atuais = this.getVistorias();
    const dataHoraIso = new Date().toISOString();

    const atualizadas = atuais.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Aprovado' as StatusVistoria,
          dataHoraAprovacao: dataHoraIso,
          parecer: sanitizeTextInput(parecer, 2000),
          aprovador: sanitizeTextInput(aprovador, 100),
          adesaoPaga: adesaoFoiPaga !== undefined ? adesaoFoiPaga : item.adesaoPaga
        };
      }
      return item;
    });

    this.saveToLocalStorage(atualizadas);

    if (isSupabaseConfigured && supabase) {
      try {
        const itemAtualizado = atualizadas.find((i) => i.id === id);
        if (itemAtualizado) {
          const payload = mapVistoriaToDB(itemAtualizado);
          await supabase.from('solicitacoes_vistoria').upsert([payload], { onConflict: 'id' });
        }
      } catch (err) {
        console.error('Erro ao aprovar vistoria no Supabase:', err);
      }
    }

    return atualizadas;
  },

  /**
   * Reprova uma vistoria com motivo
   */
  async reprovarVistoria(
    id: string,
    motivoReprovacao: string,
    aprovador: string = 'Vistoriador Responsável'
  ): Promise<SolicitacaoVistoria[]> {
    const atuais = this.getVistorias();
    const dataHoraIso = new Date().toISOString();

    const atualizadas = atuais.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: 'Reprovado' as StatusVistoria,
          dataHoraAprovacao: dataHoraIso,
          motivoReprovacao: sanitizeTextInput(motivoReprovacao, 2000),
          aprovador: sanitizeTextInput(aprovador, 100)
        };
      }
      return item;
    });

    this.saveToLocalStorage(atualizadas);

    if (isSupabaseConfigured && supabase) {
      try {
        const itemAtualizado = atualizadas.find((i) => i.id === id);
        if (itemAtualizado) {
          const payload = mapVistoriaToDB(itemAtualizado);
          await supabase.from('solicitacoes_vistoria').upsert([payload], { onConflict: 'id' });
        }
      } catch (err) {
        console.error('Erro ao reprovar vistoria no Supabase:', err);
      }
    }

    return atualizadas;
  },

  /**
   * Atualiza status de recebimento da taxa de adesão
   */
  async toggleStatusAdesao(id: string, paga: boolean): Promise<SolicitacaoVistoria[]> {
    const atuais = this.getVistorias();
    const atualizadas = atuais.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          adesaoPaga: paga
        };
      }
      return item;
    });

    this.saveToLocalStorage(atualizadas);

    if (isSupabaseConfigured && supabase) {
      try {
        const itemAtualizado = atualizadas.find((i) => i.id === id);
        if (itemAtualizado) {
          const payload = mapVistoriaToDB(itemAtualizado);
          await supabase.from('solicitacoes_vistoria').upsert([payload], { onConflict: 'id' });
        }
      } catch (err) {
        console.error('Erro ao atualizar taxa de adesão no Supabase:', err);
      }
    }

    return atualizadas;
  },

  /**
   * Exclui uma vistoria
   */
  async deleteVistoria(id: string): Promise<SolicitacaoVistoria[]> {
    const atuais = this.getVistorias();
    const filtradas = atuais.filter((item) => item.id !== id);
    this.saveToLocalStorage(filtradas);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('solicitacoes_vistoria').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao deletar vistoria no Supabase:', err);
      }
    }

    return filtradas;
  },

  /**
   * Limpa todas as vistorias
   */
  async clearAllData(): Promise<SolicitacaoVistoria[]> {
    this.saveToLocalStorage([]);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('solicitacoes_vistoria').delete().neq('id', '___filtro_placeholder___');
      } catch (err) {
        console.error('Erro ao limpar solicitacoes_vistoria no Supabase:', err);
      }
    }
    return [];
  }
};
