/**
 * @file src/services/inspectionService.ts
 * @description Serviço de persistência, auditoria e governança para Solicitações de Vistoria.
 * Integra nativamente com a tabela public.solicitacoes_vistoria no Supabase e provê fallback em LocalStorage.
 */

import { SolicitacaoVistoria, StatusVistoria, Vistoriador } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeTextInput } from '../utils/security';
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

/**
 * Dados iniciais de demonstração caso o banco esteja vazio
 */
function getInitialMockVistorias(): SolicitacaoVistoria[] {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  return [
    {
      id: 'vis-101',
      dataHoraSolicitacao: new Date(Date.now() - 3600000 * 4).toISOString(),
      dataVistoria: hojeStr,
      horarioVistoria: '14:30',
      valorAdesao: 250.00,
      adesaoPaga: true,
      vistoriador: 'Danilo',
      nomeAssociado: 'Carlos Eduardo Silveira',
      contato: '(11) 98765-4321',
      localizacaoMaps: 'https://maps.google.com/?q=-23.550520,-46.633308',
      modeloCarro: 'Toyota Corolla 2.0 XEi',
      placa: 'BRA2E19',
      tipoPlaca: 'Mercosul',
      linkVistoria: 'https://vistoria.sistema-externo.com/laudo/vis-101',
      linkPagamento: 'https://pagamento.sistema-externo.com/fatura/pag-8891',
      solicitante: 'Débora Rodrigues',
      status: 'Aguardando Vistoria'
    },
    {
      id: 'vis-102',
      dataHoraSolicitacao: new Date(Date.now() - 3600000 * 8).toISOString(),
      dataVistoria: hojeStr,
      horarioVistoria: '16:00',
      valorAdesao: 200.00,
      adesaoPaga: false,
      vistoriador: 'Lucas',
      nomeAssociado: 'Mariana Ferreira Gomes',
      contato: '(11) 97123-8899',
      localizacaoMaps: 'https://maps.google.com/?q=-23.561684,-46.655981',
      modeloCarro: 'Hyundai HB20 1.0 Comfort',
      placa: 'ABC1234',
      tipoPlaca: 'Tradicional',
      linkVistoria: 'https://vistoria.sistema-externo.com/laudo/vis-102',
      linkPagamento: 'https://pagamento.sistema-externo.com/fatura/pag-8892',
      solicitante: 'Heder Santos',
      status: 'Aguardando Vistoria'
    },
    {
      id: 'vis-103',
      dataHoraSolicitacao: new Date(Date.now() - 3600000 * 24).toISOString(),
      dataVistoria: hojeStr,
      horarioVistoria: '10:00',
      valorAdesao: 300.00,
      adesaoPaga: true,
      vistoriador: 'Danilo',
      nomeAssociado: 'Roberto Albuquerque Neto',
      contato: '(11) 99887-1122',
      localizacaoMaps: 'https://maps.google.com/?q=-23.587416,-46.682125',
      modeloCarro: 'Honda Civic 1.5 Touring',
      placa: 'RTE4B99',
      tipoPlaca: 'Mercosul',
      linkVistoria: 'https://vistoria.sistema-externo.com/laudo/vis-103',
      linkPagamento: 'https://pagamento.sistema-externo.com/fatura/pag-8893',
      solicitante: 'Débora Rodrigues',
      status: 'Aprovado',
      dataHoraAprovacao: new Date(Date.now() - 3600000 * 2).toISOString(),
      parecer: 'Vistoria presencial realizada com sucesso. Veículo em excelente estado de conservação, sem avarias e com chassi/motor conferidos.',
      aprovador: 'Danilo (Vistoriador)'
    }
  ];
}

export const inspectionService = {
  /**
   * Obtém as solicitações do LocalStorage
   */
  getVistorias(): SolicitacaoVistoria[] {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erro ao ler solicitações de vistoria do LocalStorage:', e);
    }
    const initial = getInitialMockVistorias();
    this.saveToLocalStorage(initial);
    return initial;
  },

  /**
   * Salva lista no LocalStorage
   */
  saveToLocalStorage(data: SolicitacaoVistoria[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao gravar solicitações de vistoria no LocalStorage:', e);
    }
  },

  /**
   * Obtém solicitações de vistoria com sincronização assíncrona com Supabase
   */
  async getVistoriasAsync(): Promise<SolicitacaoVistoria[]> {
    const locais = this.getVistorias();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('solicitacoes_vistoria')
          .select('*')
          .order('data_hora_solicitacao', { ascending: false });

        if (error) {
          console.warn('Tabela solicitacoes_vistoria inacessível no Supabase, usando LocalStorage:', error.message);
          return locais;
        }

        if (data && Array.isArray(data)) {
          if (data.length === 0 && locais.length > 0) {
            // Popula o Supabase se a tabela estiver vazia
            try {
              const payloads = locais.map(mapVistoriaToDB);
              await supabase.from('solicitacoes_vistoria').upsert(payloads, { onConflict: 'id' });
            } catch (seedErr) {
              console.warn('Erro ao enviar seed de vistorias para o Supabase:', seedErr);
            }
            return locais;
          }

          const remotas = data.map(mapVistoriaFromDB);
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
