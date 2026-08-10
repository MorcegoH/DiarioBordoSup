/**
 * @file src/services/dbService.ts
 * @description Serviço unificado para persistência de dados e diagnóstico de sincronização.
 * Integra nativamente com o banco de dados Supabase e fornece fallback automático para LocalStorage.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Ocorrencia, ResumoPassagem, Status } from '../types';
import { sanitizeTextInput } from '../utils/security';

const LOCAL_KEY_OCORRENCIAS = 'diario_bordo_ocorrencias_v1';
const LOCAL_KEY_PASSAGENS = 'diario_bordo_passagens_v1';

/**
 * Interface para retorno estruturado do resultado de operações no banco
 */
export interface DbOperationResult {
  success: boolean;
  storage: 'supabase' | 'local';
  error?: string;
  errorCode?: string;
}

// Mapeadores para conversão entre o banco (snake_case) e TypeScript (camelCase)
function mapOcorrenciaFromDB(row: any): Ocorrencia {
  return {
    id: String(row.id || ''),
    dataHora: row.data_hora,
    dataHoraConclusao: row.data_hora_conclusao ?? undefined,
    supervisor: sanitizeTextInput(row.supervisor || '', 100),
    categoria: row.categoria,
    descricao: sanitizeTextInput(row.descricao || '', 2000),
    impacto: row.impacto,
    acaoTomada: sanitizeTextInput(row.acao_tomada || '', 2000),
    status: row.status,
    duracaoMinutos: Number(row.duracao_minutos ?? 0)
  };
}

function mapOcorrenciaToDB(item: Ocorrencia) {
  return {
    id: item.id,
    data_hora: item.dataHora,
    data_hora_conclusao: item.dataHoraConclusao || null,
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
    id: String(row.id || ''),
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

  /**
   * Testa a conexão real com a tabela ocorrencias do Supabase
   */
  async checkConnection(): Promise<DbHealthStatus> {
    if (!isSupabaseConfigured || !supabase) {
      lastHealthStatus = {
        isConnected: false,
        errorCode: 'ERR_ENV_MISSING',
        errorMessage: 'Variáveis de conexão VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.',
        errorDetails: 'O sistema está operando em Modo Local (LocalStorage). Configure o arquivo .env com as credenciais do seu projeto no Supabase.',
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
          errorMessage: error.message || 'Erro ao consultar o servidor Supabase.',
          errorDetails: error.details || error.hint || `Falha de permissão (RLS) ou tabela 'ocorrencias' não encontrada. Código HTTP/PostgREST: ${error.code}`,
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
        errorMessage: err?.message || 'Falha de comunicação de rede com o servidor Supabase.',
        errorDetails: 'Não foi possível se comunicar com o endpoint do Supabase. Verifique sua conexão ou se a URL do projeto está correta.',
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
          console.warn('Erro ao carregar ocorrencias do Supabase, fallback para LocalStorage:', error.message);
          lastHealthStatus = {
            isConnected: false,
            errorCode: error.code || 'PGRST_ERROR',
            errorMessage: error.message || 'Erro ao consultar a tabela de ocorrências no Supabase.',
            errorDetails: error.details || error.hint || 'Permissão negada (RLS) ou tabela inexistente.',
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
        console.error('Exceção ao buscar do Supabase:', err);
        lastHealthStatus = {
          isConnected: false,
          errorCode: 'ERR_FETCH_EXCEPTION',
          errorMessage: err?.message || 'Falha de rede ao se conectar ao Supabase.',
          errorDetails: 'Instabilidade de conexão ou erro no cliente Supabase.',
          lastChecked: new Date().toISOString()
        };
      }
    }
    return getLocalOcorrencias();
  },

  /**
   * Adiciona uma nova ocorrência com salvamento híbrido
   */
  async addOcorrencia(nova: Ocorrencia): Promise<DbOperationResult> {
    // 1. Salva imediatamente em LocalStorage para garantir zero perda de dados
    const local = getLocalOcorrencias();
    const atualizado = [nova, ...local];
    setLocalOcorrencias(atualizado);

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: true,
        storage: 'local',
        error: 'Supabase não configurado. Salvo apenas no dispositivo local.'
      };
    }

    try {
      const payload = mapOcorrenciaToDB(nova);
      const { error } = await supabase.from('ocorrencias').insert([payload]);

      if (error) {
        console.error('Erro de gravação no Supabase:', error);
        lastHealthStatus = {
          isConnected: false,
          errorCode: error.code || 'ERR_INSERT_FAILED',
          errorMessage: error.message || 'Erro ao inserir ocorrência no Supabase.',
          errorDetails: error.details || error.hint || 'Verifique o RLS (Row Level Security) e os nomes de colunas no banco.',
          lastChecked: new Date().toISOString()
        };

        return {
          success: false,
          storage: 'local',
          errorCode: error.code,
          error: `Ocorrência salva no navegador, mas OCORREU ERRO no Supabase: ${error.message} (Código: ${error.code})`
        };
      }

      lastHealthStatus = {
        isConnected: true,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        lastChecked: new Date().toISOString()
      };

      return {
        success: true,
        storage: 'supabase'
      };
    } catch (err: any) {
      console.error('Exceção ao inserir no Supabase:', err);
      return {
        success: false,
        storage: 'local',
        errorCode: 'EXCEPT_INSERT',
        error: `Exceção ao gravar no Supabase: ${err?.message || err}`
      };
    }
  },

  async updateOcorrencia(item: Ocorrencia): Promise<DbOperationResult> {
    const local = getLocalOcorrencias();
    const atualizado = local.map((o) => (o.id === item.id ? item : o));
    setLocalOcorrencias(atualizado);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, storage: 'local' };
    }

    try {
      const payload = mapOcorrenciaToDB(item);
      const { error } = await supabase.from('ocorrencias').update(payload).eq('id', item.id);
      if (error) {
        console.error('Erro ao atualizar ocorrência no Supabase:', error);
        return { success: false, storage: 'local', errorCode: error.code, error: error.message };
      }
      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return { success: false, storage: 'local', error: err?.message };
    }
  },

  async updateStatusOcorrencia(id: string, newStatus: Status, dataHoraConclusao?: string): Promise<DbOperationResult> {
    const local = getLocalOcorrencias();
    let updatedItem: Ocorrencia | undefined;

    const atualizado = local.map((o) => {
      if (o.id === id) {
        const isResolvido = newStatus === 'Resolvido';
        const conclDate = isResolvido ? (dataHoraConclusao || o.dataHoraConclusao || new Date().toISOString()) : undefined;
        let duracao = o.duracaoMinutos;
        if (isResolvido && conclDate && o.dataHora) {
          const diffMs = new Date(conclDate).getTime() - new Date(o.dataHora).getTime();
          duracao = Math.max(0, Math.round(diffMs / 60000));
        }
        updatedItem = { ...o, status: newStatus, dataHoraConclusao: conclDate, duracaoMinutos: duracao };
        return updatedItem;
      }
      return o;
    });
    setLocalOcorrencias(atualizado);

    if (!isSupabaseConfigured || !supabase || !updatedItem) {
      return { success: true, storage: 'local' };
    }

    try {
      const payload = mapOcorrenciaToDB(updatedItem);
      const { error } = await supabase.from('ocorrencias').update(payload).eq('id', id);
      if (error) {
        console.error('Erro ao atualizar status no Supabase:', error);
        return { success: false, storage: 'local', errorCode: error.code, error: error.message };
      }
      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return { success: false, storage: 'local', error: err?.message };
    }
  },

  async deleteOcorrencia(id: string): Promise<DbOperationResult> {
    const local = getLocalOcorrencias();
    const atualizado = local.filter((o) => o.id !== id);
    setLocalOcorrencias(atualizado);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, storage: 'local' };
    }

    try {
      const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir ocorrência no Supabase:', error);
        return { success: false, storage: 'local', errorCode: error.code, error: error.message };
      }
      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return { success: false, storage: 'local', error: err?.message };
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

  async addPassagem(nova: ResumoPassagem): Promise<DbOperationResult> {
    const local = getLocalPassagens();
    const atualizado = [nova, ...local];
    setLocalPassagens(atualizado);

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: true,
        storage: 'local',
        error: 'Supabase não configurado. Salvo apenas localmente.'
      };
    }

    try {
      const payload = mapPassagemToDB(nova);
      const { error } = await supabase.from('resumos_passagem').insert([payload]);

      if (error) {
        console.error('Erro ao inserir passagem no Supabase:', error);
        return {
          success: false,
          storage: 'local',
          errorCode: error.code,
          error: `Salvo localmente, erro ao enviar para Supabase: ${error.message}`
        };
      }

      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return {
        success: false,
        storage: 'local',
        error: `Erro ao enviar para Supabase: ${err?.message || err}`
      };
    }
  },

  /**
   * Sincroniza todos os registros armazenados no LocalStorage com o Supabase
   * Útil para enviar as informações das supervisoras que ficaram retidas off-line
   */
  async syncLocalToSupabase(): Promise<{
    success: boolean;
    syncedOcorrencias: number;
    syncedPassagens: number;
    message: string;
    error?: string;
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        syncedOcorrencias: 0,
        syncedPassagens: 0,
        message: 'O Supabase não está configurado. Verifique o arquivo .env com as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
      };
    }

    const localOcorrencias = getLocalOcorrencias();
    const localPassagens = getLocalPassagens();

    if (localOcorrencias.length === 0 && localPassagens.length === 0) {
      return {
        success: true,
        syncedOcorrencias: 0,
        syncedPassagens: 0,
        message: 'Não há registros pendentes no navegador para sincronizar.'
      };
    }

    try {
      let countOc = 0;
      let countPass = 0;

      if (localOcorrencias.length > 0) {
        const ocPayloads = localOcorrencias.map(mapOcorrenciaToDB);
        const { error: errOc } = await supabase.from('ocorrencias').upsert(ocPayloads, { onConflict: 'id' });
        if (errOc) {
          throw new Error(`Erro ao enviar ocorrências: ${errOc.message} (Código: ${errOc.code})`);
        }
        countOc = localOcorrencias.length;
      }

      if (localPassagens.length > 0) {
        const passPayloads = localPassagens.map(mapPassagemToDB);
        const { error: errPass } = await supabase.from('resumos_passagem').upsert(passPayloads, { onConflict: 'id' });
        if (errPass) {
          throw new Error(`Erro ao enviar fechamentos de turno: ${errPass.message} (Código: ${errPass.code})`);
        }
        countPass = localPassagens.length;
      }

      lastHealthStatus = {
        isConnected: true,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        lastChecked: new Date().toISOString()
      };

      return {
        success: true,
        syncedOcorrencias: countOc,
        syncedPassagens: countPass,
        message: `Sincronização concluída! ${countOc} ocorrência(s) e ${countPass} fechamento(s) foram salvos com sucesso no Supabase!`
      };
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      lastHealthStatus = {
        isConnected: false,
        errorCode: 'ERR_SYNC_FAILED',
        errorMessage: err?.message || 'Erro durante a sincronização em lote.',
        errorDetails: 'Certifique-se de que as tabelas "ocorrencias" e "resumos_passagem" existem no Supabase com permissões de gravação ativas.',
        lastChecked: new Date().toISOString()
      };

      return {
        success: false,
        syncedOcorrencias: 0,
        syncedPassagens: 0,
        message: `Falha na sincronização: ${err?.message || err}`,
        error: err?.message
      };
    }
  },

  // --- RESTAURAR DADOS / RESET ---
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

