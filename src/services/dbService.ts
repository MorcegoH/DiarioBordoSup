/**
 * @file src/services/dbService.ts
 * @description Serviço unificado para persistência de dados.
 * Integra nativamente com o banco de dados Supabase e fornece fallback automático para LocalStorage.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Ocorrencia, ResumoPassagem, Status } from '../types';
import { INITIAL_MOCK_OCORRENCIAS, INITIAL_MOCK_PASSAGENS } from '../data/mockData';

const LOCAL_KEY_OCORRENCIAS = 'diario_bordo_ocorrencias_v1';
const LOCAL_KEY_PASSAGENS = 'diario_bordo_passagens_v1';

// Mapeadores para conversão entre o banco (snake_case) e TypeScript (camelCase)
function mapOcorrenciaFromDB(row: any): Ocorrencia {
  return {
    id: row.id,
    dataHora: row.data_hora,
    supervisor: row.supervisor,
    categoria: row.categoria,
    descricao: row.descricao,
    impacto: row.impacto,
    acaoTomada: row.acao_tomada,
    status: row.status,
    duracaoMinutos: row.duracao_minutos ?? 0
  };
}

function mapOcorrenciaToDB(item: Ocorrencia) {
  return {
    id: item.id,
    data_hora: item.dataHora,
    supervisor: item.supervisor,
    categoria: item.categoria,
    descricao: item.descricao,
    impacto: item.impacto,
    acao_tomada: item.acaoTomada,
    status: item.status,
    duracao_minutos: item.duracaoMinutos ?? 0
  };
}

function mapPassagemFromDB(row: any): ResumoPassagem {
  return {
    id: row.id,
    data: row.data,
    supervisor: row.supervisor,
    oQueFuncionou: row.o_que_funcionou,
    oQueFicaPendente: row.o_que_fica_pendente,
    dataHoraCriacao: row.data_hora_criacao
  };
}

function mapPassagemToDB(item: ResumoPassagem) {
  return {
    id: item.id,
    data: item.data,
    supervisor: item.supervisor,
    o_que_funcionou: item.oQueFuncionou,
    o_que_fica_pendente: item.oQueFicaPendente,
    data_hora_criacao: item.dataHoraCriacao
  };
}

// Auxiliares LocalStorage
function getLocalOcorrencias(): Ocorrencia[] {
  try {
    const saved = localStorage.getItem(LOCAL_KEY_OCORRENCIAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao carregar ocorrencias locais:', e);
  }
  return [];
}

function setLocalOcorrencias(data: Ocorrencia[]) {
  try {
    localStorage.setItem(LOCAL_KEY_OCORRENCIAS, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar ocorrencias locais:', e);
  }
}

function getLocalPassagens(): ResumoPassagem[] {
  try {
    const saved = localStorage.getItem(LOCAL_KEY_PASSAGENS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao carregar passagens locais:', e);
  }
  return [];
}

function setLocalPassagens(data: ResumoPassagem[]) {
  try {
    localStorage.setItem(LOCAL_KEY_PASSAGENS, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar passagens locais:', e);
  }
}

export const dbService = {
  isConfigured: isSupabaseConfigured,

  // --- OCORRÊNCIAS ---
  async getOcorrencias(): Promise<Ocorrencia[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('ocorrencias')
          .select('*')
          .order('data_hora', { ascending: false });

        if (error) {
          console.warn('Erro ao carregar ocorrencias do Supabase, usando LocalStorage:', error.message);
          return getLocalOcorrencias();
        }

        if (data) {
          const list = data.map(mapOcorrenciaFromDB);
          setLocalOcorrencias(list); // Mantém cache sincronizado
          return list;
        }
      } catch (err) {
        console.error('Falha na requisição ao Supabase:', err);
      }
    }
    return getLocalOcorrencias();
  },

  async addOcorrencia(nova: Ocorrencia): Promise<void> {
    const local = getLocalOcorrencias();
    const atualizado = [nova, ...local];
    setLocalOcorrencias(atualizado);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapOcorrenciaToDB(nova);
        const { error } = await supabase.from('ocorrencias').insert([payload]);
        if (error) console.error('Erro ao inserir ocorrência no Supabase:', error.message);
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err);
      }
    }
  },

  async updateOcorrencia(item: Ocorrencia): Promise<void> {
    const local = getLocalOcorrencias();
    const atualizado = local.map((o) => (o.id === item.id ? item : o));
    setLocalOcorrencias(atualizado);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapOcorrenciaToDB(item);
        const { error } = await supabase.from('ocorrencias').update(payload).eq('id', item.id);
        if (error) console.error('Erro ao atualizar ocorrência no Supabase:', error.message);
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err);
      }
    }
  },

  async updateStatusOcorrencia(id: string, newStatus: Status): Promise<void> {
    const local = getLocalOcorrencias();
    const atualizado = local.map((o) => (o.id === id ? { ...o, status: newStatus } : o));
    setLocalOcorrencias(atualizado);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('ocorrencias').update({ status: newStatus }).eq('id', id);
        if (error) console.error('Erro ao atualizar status no Supabase:', error.message);
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err);
      }
    }
  },

  async deleteOcorrencia(id: string): Promise<void> {
    const local = getLocalOcorrencias();
    const atualizado = local.filter((o) => o.id !== id);
    setLocalOcorrencias(atualizado);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
        if (error) console.error('Erro ao excluir ocorrência no Supabase:', error.message);
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err);
      }
    }
  },

  // --- PASSAGENS DE BASTÃO ---
  async getPassagens(): Promise<ResumoPassagem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('resumos_passagem')
          .select('*')
          .order('data_hora_criacao', { ascending: false });

        if (error) {
          console.warn('Erro ao carregar passagens do Supabase, usando LocalStorage:', error.message);
          return getLocalPassagens();
        }

        if (data) {
          const list = data.map(mapPassagemFromDB);
          setLocalPassagens(list);
          return list;
        }
      } catch (err) {
        console.error('Falha na requisição ao Supabase:', err);
      }
    }
    return getLocalPassagens();
  },

  async addPassagem(nova: ResumoPassagem): Promise<void> {
    const local = getLocalPassagens();
    const atualizado = [nova, ...local];
    setLocalPassagens(atualizado);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = mapPassagemToDB(nova);
        const { error } = await supabase.from('resumos_passagem').insert([payload]);
        if (error) console.error('Erro ao inserir passagem de bastão no Supabase:', error.message);
      } catch (err) {
        console.error('Erro ao conectar com Supabase:', err);
      }
    }
  },

  // --- RESTAURAR DADOS / SEED NO SUPABASE ---
  async clearAllData(): Promise<void> {
    setLocalOcorrencias([]);
    setLocalPassagens([]);
    localStorage.removeItem(LOCAL_KEY_OCORRENCIAS);
    localStorage.removeItem(LOCAL_KEY_PASSAGENS);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('ocorrencias').delete().neq('id', '___none___');
        await supabase.from('resumos_passagem').delete().neq('id', '___none___');
      } catch (err) {
        console.error('Erro ao limpar Supabase:', err);
      }
    }
  },

  async seedSupabase(ocorrencias: Ocorrencia[], passagens: ResumoPassagem[]): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Supabase não configurado. Verifique as variáveis de ambiente.' };
    }

    try {
      const ocPayloads = ocorrencias.map(mapOcorrenciaToDB);
      const passPayloads = passagens.map(mapPassagemToDB);

      const { error: ocErr } = await supabase.from('ocorrencias').upsert(ocPayloads, { onConflict: 'id' });
      if (ocErr) throw ocErr;

      const { error: passErr } = await supabase.from('resumos_passagem').upsert(passPayloads, { onConflict: 'id' });
      if (passErr) throw passErr;

      return { success: true, message: 'Dados de exemplo populados com sucesso no Supabase!' };
    } catch (err: any) {
      console.error('Erro ao enviar seed para o Supabase:', err);
      return { success: false, message: `Erro: ${err.message || err}` };
    }
  }
};
