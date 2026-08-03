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
export interface DbHealthStatus {
  isConnected: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  errorDetails: string | null;
  lastChecked: string;
}

let lastHealthStatus: DbHealthStatus = {
  isConnected: isSupabaseConfigured,
  errorCode: isSupabaseConfigured ? null : 'ERR_CONFIG_MISSING',
  errorMessage: isSupabaseConfigured ? null : 'As variáveis de ambiente do banco de dados não foram configuradas.',
  errorDetails: isSupabaseConfigured ? null : 'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não contêm valores válidos no ambiente.',
  lastChecked: new Date().toISOString()
};

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

  getHealthStatus(): DbHealthStatus {
    return lastHealthStatus;
  },

  async checkConnection(): Promise<DbHealthStatus> {
    if (!isSupabaseConfigured || !supabase) {
      lastHealthStatus = {
        isConnected: false,
        errorCode: 'ERR_ENV_MISSING',
        errorMessage: 'Variáveis de conexão não configuradas.',
        errorDetails: 'As chaves VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não foram preenchidas no arquivo .env.',
        lastChecked: new Date().toISOString()
      };
      return lastHealthStatus;
    }

    try {
      const { error } = await supabase.from('ocorrencias').select('id').limit(1);
      if (error) {
        lastHealthStatus = {
          isConnected: false,
          errorCode: error.code || 'ERR_DATABASE_RESPONSE',
          errorMessage: error.message || 'Erro de resposta do servidor de banco de dados.',
          errorDetails: error.details || error.hint || 'Permissão negada ou estrutura de tabela não encontrada.',
          lastChecked: new Date().toISOString()
        };
      } else {
        lastHealthStatus = {
          isConnected: true,
          errorCode: null,
          errorMessage: null,
          errorDetails: null,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (err: any) {
      lastHealthStatus = {
        isConnected: false,
        errorCode: 'ERR_NETWORK_FAILED',
        errorMessage: err?.message || 'Falha de comunicação de rede com o servidor.',
        errorDetails: 'Não foi possível se comunicar com o serviço. Verifique sua conexão com a internet ou as permissões de acesso.',
        lastChecked: new Date().toISOString()
      };
    }
    return lastHealthStatus;
  },

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
          lastHealthStatus = {
            isConnected: false,
            errorCode: error.code || 'PGRST_ERROR',
            errorMessage: error.message || 'Erro ao consultar a tabela de ocorrências.',
            errorDetails: error.details || error.hint || 'Falha ao recuperar dados do banco de dados.',
            lastChecked: new Date().toISOString()
          };
          return getLocalOcorrencias();
        }

        lastHealthStatus = {
          isConnected: true,
          errorCode: null,
          errorMessage: null,
          errorDetails: null,
          lastChecked: new Date().toISOString()
        };

        if (data) {
          const list = data.map(mapOcorrenciaFromDB);
          setLocalOcorrencias(list); // Mantém cache sincronizado
          return list;
        }
      } catch (err: any) {
        console.error('Falha na requisição ao Supabase:', err);
        lastHealthStatus = {
          isConnected: false,
          errorCode: 'ERR_FETCH_EXCEPTION',
          errorMessage: err?.message || 'Falha na conexão de rede com o banco de dados.',
          errorDetails: 'A requisição foi interrompida ou não obteve resposta do servidor remoto.',
          lastChecked: new Date().toISOString()
        };
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
