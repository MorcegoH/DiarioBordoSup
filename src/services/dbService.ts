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
function parseHistorico(val: any) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

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
    duracaoMinutos: Number(row.duracao_minutos ?? 0),
    historicoAtualizacoes: parseHistorico(row.historico_atualizacoes)
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
    duracao_minutos: item.duracaoMinutos ?? 0,
    historico_atualizacoes: item.historicoAtualizacoes || []
  };
}

function mapPassagemFromDB(row: any): ResumoPassagem {
  const conteudoObj = typeof row.conteudo === 'object' && row.conteudo !== null ? row.conteudo : {};
  return {
    id: String(row.id || ''),
    data: row.data || '',
    supervisor: sanitizeTextInput(row.supervisor || '', 100),
    oQueFuncionou: sanitizeTextInput(
      row.o_que_funcionou || 
      row.oQueFuncionou || 
      conteudoObj.oQueFuncionou || 
      conteudoObj.o_que_funcionou || 
      row.o_que_funcionou_hoje || '', 
      3000
    ),
    oQueFicaPendente: sanitizeTextInput(
      row.o_que_fica_pendente || 
      row.oQueFicaPendente || 
      conteudoObj.oQueFicaPendente || 
      conteudoObj.o_que_fica_pendente || 
      row.o_que_fica_pendente_amanha || 
      row.pendencias || '', 
      3000
    ),
    dataHoraCriacao: row.data_hora_criacao || row.dataHoraCriacao || conteudoObj.dataHoraCriacao || row.created_at || new Date().toISOString(),
    dataHoraConclusao: row.data_hora_conclusao || row.dataHoraConclusao || conteudoObj.dataHoraConclusao || undefined,
    status: row.status || (row.data_hora_conclusao || row.dataHoraConclusao || conteudoObj.status === 'Concluído' ? 'Concluído' : 'Pendente')
  };
}

function mapPassagemToDB(item: ResumoPassagem) {
  return {
    id: item.id,
    data: item.data,
    supervisor: item.supervisor,
    conteudo: {
      oQueFuncionou: item.oQueFuncionou,
      oQueFicaPendente: item.oQueFicaPendente,
      dataHoraCriacao: item.dataHoraCriacao,
      dataHoraConclusao: item.dataHoraConclusao || null,
      status: item.status || (item.dataHoraConclusao ? 'Concluído' : 'Pendente')
    },
    o_que_funcionou: item.oQueFuncionou,
    o_que_fica_pendente: item.oQueFicaPendente,
    data_hora_criacao: item.dataHoraCriacao,
    data_hora_conclusao: item.dataHoraConclusao || null,
    status: item.status || (item.dataHoraConclusao ? 'Concluído' : 'Pendente')
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
   * Testa a conexão e permissões de Leitura e Escrita nas tabelas do Supabase
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
      // 1. Testa leitura na tabela de ocorrências
      const { error: selectErr } = await supabase.from('ocorrencias').select('id').limit(1);
      if (selectErr) {
        let details = selectErr.details || selectErr.hint || `Código PostgREST: ${selectErr.code}`;
        if (selectErr.code === '42P01') {
          details = 'A tabela "ocorrencias" NÃO EXISTE no seu banco de dados Supabase. Execute o Script SQL no Editor SQL do Supabase.';
        } else if (selectErr.code === '42501') {
          details = 'Permissão RLS negada para leitura. Execute as políticas RLS no Editor SQL do Supabase.';
        }

        lastHealthStatus = {
          isConnected: false,
          errorCode: selectErr.code || 'ERR_DATABASE_RESPONSE',
          errorMessage: selectErr.message || 'Erro ao consultar o servidor Supabase.',
          errorDetails: details,
          lastChecked: new Date().toISOString()
        };
        return lastHealthStatus;
      }

      // 2. Testa leitura na tabela de resumos_passagem
      const { error: passErr } = await supabase.from('resumos_passagem').select('id').limit(1);
      if (passErr) {
        let details = passErr.details || passErr.hint || `Código PostgREST: ${passErr.code}`;
        if (passErr.code === '42P01') {
          details = 'A tabela "resumos_passagem" NÃO EXISTE no seu banco de dados Supabase. Execute o Script SQL para criar ambas as tabelas.';
        }

        lastHealthStatus = {
          isConnected: false,
          errorCode: passErr.code || 'ERR_MISSING_TABLE',
          errorMessage: `A tabela 'resumos_passagem' não foi encontrada: ${passErr.message}`,
          errorDetails: details,
          lastChecked: new Date().toISOString()
        };
        return lastHealthStatus;
      }

      lastHealthStatus = {
        isConnected: true,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        lastChecked: new Date().toISOString()
      };
    } catch (err: any) {
      lastHealthStatus = {
        isConnected: false,
        errorCode: 'ERR_NETWORK_FAILED',
        errorMessage: err?.message || 'Falha de comunicação de rede com o servidor Supabase.',
        errorDetails: 'Não foi possível se comunicar com o endpoint do Supabase. Verifique sua conexão de internet ou a URL do projeto.',
        lastChecked: new Date().toISOString()
      };
    }
    return lastHealthStatus;
  },

  /**
   * Executa um diagnóstico assertivo de Leitura, Escrita e Compatibilidade de Tipos
   */
  async runFullDatabaseDiagnostic(): Promise<{
    canRead: boolean;
    canWrite: boolean;
    errorCode: string | null;
    errorMessage: string | null;
    errorDetails: string | null;
    diagnosticMessage: string;
  }> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        canRead: false,
        canWrite: false,
        errorCode: 'ERR_ENV_MISSING',
        errorMessage: 'Variáveis de ambiente ausentes no projeto.',
        errorDetails: 'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        diagnosticMessage: 'Supabase não configurado no ambiente.'
      };
    }

    try {
      // Teste 1: Leitura na tabela ocorrencias
      const { error: readErr } = await supabase.from('ocorrencias').select('id').limit(1);
      if (readErr) {
        let diagMsg = `Falha na leitura da tabela "ocorrencias" (${readErr.code}).`;
        if (readErr.code === '42P01') {
          diagMsg = 'A tabela "ocorrencias" não existe no banco de dados Supabase.';
        } else if (readErr.code === '42501') {
          diagMsg = 'Bloqueado por RLS (Row Level Security). Crie a política SELECT para anon.';
        }

        return {
          canRead: false,
          canWrite: false,
          errorCode: readErr.code,
          errorMessage: readErr.message,
          errorDetails: readErr.details || readErr.hint || 'Verifique a estrutura do banco.',
          diagnosticMessage: diagMsg
        };
      }

      // Teste 2: Escrita de teste (Dummy Insert)
      const testId = 'diag-test-' + Date.now();
      const { error: writeErr } = await supabase.from('ocorrencias').insert([{
        id: testId,
        data_hora: new Date().toISOString(),
        supervisor: 'Teste Diagnostico',
        categoria: 'Sistemas & Ferramentas',
        descricao: 'Registro temporario de teste de escrita',
        impacto: 'Baixo',
        acao_tomada: 'Teste de integridade',
        status: 'Pendente',
        duracao_minutos: 0
      }]);

      if (writeErr) {
        let diagMsg = `Falha na gravação no Supabase (${writeErr.code}).`;
        if (writeErr.code === '22P02') {
          diagMsg = 'MOTIVO DA FALHA DE GRAVAÇÃO: A coluna "id" na tabela "ocorrencias" do Supabase foi criada como UUID ou INTEGER, mas a aplicação envia IDs em formato TEXTO (ex: "oc-xyz"). Solução: Execute "ALTER TABLE public.ocorrencias ALTER COLUMN id TYPE TEXT;" no Editor SQL do Supabase ou recrie as tabelas.';
        } else if (writeErr.code === '42703') {
          diagMsg = 'MOTIVO DA FALHA DE GRAVAÇÃO: Faltam colunas na tabela "ocorrencias" (ex: "duracao_minutos" ou "data_hora_conclusao"). Execute o Script SQL completo fornecido no modal.';
        } else if (writeErr.code === '42501') {
          diagMsg = 'MOTIVO DA FALHA DE GRAVAÇÃO: Bloqueio de RLS (Row Level Security) para a ação INSERT. Crie as políticas RLS para anon ou desabilite o RLS para a tabela.';
        }

        return {
          canRead: true,
          canWrite: false,
          errorCode: writeErr.code,
          errorMessage: writeErr.message,
          errorDetails: writeErr.details || writeErr.hint || writeErr.message,
          diagnosticMessage: diagMsg
        };
      }

      // Limpar registro de teste
      await supabase.from('ocorrencias').delete().eq('id', testId);

      return {
        canRead: true,
        canWrite: true,
        errorCode: null,
        errorMessage: null,
        errorDetails: null,
        diagnosticMessage: 'O banco de dados Supabase está 100% operacional para Leitura e Escrita!'
      };
    } catch (err: any) {
      return {
        canRead: false,
        canWrite: false,
        errorCode: 'ERR_DIAGNOSTIC_EXCEPT',
        errorMessage: err?.message || 'Exceção ao testar o banco de dados.',
        errorDetails: String(err),
        diagnosticMessage: 'Erro ao conectar ao Supabase.'
      };
    }
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
      let payload: any = mapOcorrenciaToDB(item);
      let { error } = await supabase.from('ocorrencias').update(payload).eq('id', item.id);
      
      // Se der erro de coluna inexistente (ex: historico_atualizacoes ainda não foi criada via SQL)
      if (error && error.code === '42703') {
        const { historico_atualizacoes, ...payloadSemHistorico } = payload;
        const retryRes = await supabase.from('ocorrencias').update(payloadSemHistorico).eq('id', item.id);
        error = retryRes.error;
      }

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
      // 1. Tentar payload padrão (snake_case completo)
      const payloadPadrao: any = mapPassagemToDB(nova);
      let { error } = await supabase.from('resumos_passagem').insert([payloadPadrao]);

      // 2. Se der erro de coluna ausente no schema cache (PGRST204 ou código 42703)
      if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache'))) {
        
        // Tentativa A1: camelCase completo
        const payloadCamelCaseCompleto = {
          id: nova.id,
          data: nova.data,
          supervisor: nova.supervisor,
          oQueFuncionou: nova.oQueFuncionou,
          oQueFicaPendente: nova.oQueFicaPendente,
          dataHoraCriacao: nova.dataHoraCriacao,
          dataHoraConclusao: nova.dataHoraConclusao || null,
          status: nova.status || 'Pendente'
        };
        const retryA1 = await supabase.from('resumos_passagem').insert([payloadCamelCaseCompleto]);
        if (!retryA1.error) {
          return { success: true, storage: 'supabase' };
        }

        // Tentativa A2: camelCase Clássico (exatamente as colunas da tabela criada no Supabase sem dataHoraConclusao)
        const payloadCamelCaseClassico = {
          id: nova.id,
          data: nova.data,
          supervisor: nova.supervisor,
          oQueFuncionou: nova.oQueFuncionou,
          oQueFicaPendente: nova.oQueFicaPendente,
          dataHoraCriacao: nova.dataHoraCriacao
        };
        const retryA2 = await supabase.from('resumos_passagem').insert([payloadCamelCaseClassico]);
        if (!retryA2.error) {
          return { success: true, storage: 'supabase' };
        }

        // Tentativa B: Nomes descritivos legados
        const payloadLegadoDescritivo = {
          id: nova.id,
          data: nova.data,
          supervisor: nova.supervisor,
          o_que_funcionou_hoje: nova.oQueFuncionou,
          o_que_fica_pendente_amanha: nova.oQueFicaPendente,
          data_hora_criacao: nova.dataHoraCriacao
        };
        const retryB = await supabase.from('resumos_passagem').insert([payloadLegadoDescritivo]);
        if (!retryB.error) {
          return { success: true, storage: 'supabase' };
        }

        // Tentativa C: snake_case clássico sem as colunas novas
        const { data_hora_conclusao, status, ...payloadBase } = payloadPadrao;
        const retryC = await supabase.from('resumos_passagem').insert([payloadBase]);
        if (!retryC.error) {
          return { success: true, storage: 'supabase' };
        }

        error = retryA2.error || retryA1.error || retryB.error || retryC.error || error;
      }

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

  async updatePassagem(item: ResumoPassagem): Promise<DbOperationResult> {
    const local = getLocalPassagens();
    const atualizado = local.map((p) => (p.id === item.id ? item : p));
    setLocalPassagens(atualizado);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, storage: 'local' };
    }

    try {
      const payloadPadrao: any = mapPassagemToDB(item);
      let { error } = await supabase.from('resumos_passagem').update(payloadPadrao).eq('id', item.id);

      if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column'))) {
        const payloadCamelCase: any = {
          supervisor: item.supervisor,
          oQueFuncionou: item.oQueFuncionou,
          oQueFicaPendente: item.oQueFicaPendente
        };
        const retry = await supabase.from('resumos_passagem').update(payloadCamelCase).eq('id', item.id);
        error = retry.error;
      }

      if (error) {
        console.error('Erro ao atualizar passagem no Supabase:', error);
        return { success: false, storage: 'local', errorCode: error.code, error: error.message };
      }
      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return { success: false, storage: 'local', error: err?.message };
    }
  },

  async updateStatusPassagem(id: string, newStatus: 'Pendente' | 'Concluído', dataHoraConclusao?: string): Promise<DbOperationResult> {
    const local = getLocalPassagens();
    let updatedItem: ResumoPassagem | undefined;

    const atualizado = local.map((p) => {
      if (p.id === id) {
        const isConcluido = newStatus === 'Concluído';
        const conclDate = isConcluido ? (dataHoraConclusao || p.dataHoraConclusao || new Date().toISOString()) : undefined;
        updatedItem = {
          ...p,
          status: newStatus,
          dataHoraConclusao: conclDate
        };
        return updatedItem;
      }
      return p;
    });
    setLocalPassagens(atualizado);

    if (!isSupabaseConfigured || !supabase || !updatedItem) {
      return { success: true, storage: 'local' };
    }

    try {
      const payload: any = mapPassagemToDB(updatedItem);
      let { error } = await supabase.from('resumos_passagem').update(payload).eq('id', id);

      if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column'))) {
        const { data_hora_conclusao, status, ...payloadLegado } = payload;
        const retry = await supabase.from('resumos_passagem').update(payloadLegado).eq('id', id);
        error = retry.error;
      }

      if (error) {
        console.error('Erro ao atualizar status da passagem no Supabase:', error);
        return { success: false, storage: 'local', errorCode: error.code, error: error.message };
      }
      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return { success: false, storage: 'local', error: err?.message };
    }
  },

  async deletePassagem(id: string): Promise<DbOperationResult> {
    const local = getLocalPassagens();
    const atualizado = local.filter((p) => p.id !== id);
    setLocalPassagens(atualizado);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, storage: 'local' };
    }

    try {
      const { error } = await supabase.from('resumos_passagem').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir passagem no Supabase:', error);
        return { success: false, storage: 'local', errorCode: error.code, error: error.message };
      }
      return { success: true, storage: 'supabase' };
    } catch (err: any) {
      return { success: false, storage: 'local', error: err?.message };
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

