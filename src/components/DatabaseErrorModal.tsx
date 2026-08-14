/**
 * @file src/components/DatabaseErrorModal.tsx
 * @description Modal explicativo acionado ao clicar na tag "Off-line".
 * Exibe a mensagem de erro, o código da falha, o Script SQL do Supabase e o botão de sincronização dos dados pendentes.
 */

import React, { useState } from 'react';
import { AlertOctagon, RefreshCw, X, Copy, Check, ServerOff, HelpCircle, Code, CloudUpload } from 'lucide-react';
import { dbService, DbHealthStatus } from '../services/dbService';

interface DatabaseErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthStatus: DbHealthStatus;
  onRetryConnection: () => Promise<void>;
  onSyncComplete?: () => void;
}

const SUPABASE_DDL_SQL = `-- SCRIPT DE CRIAÇÃO LIMPA E SEGURA DAS TABELAS NO SUPABASE
-- Copie e cole no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Este script recria as tabelas, ativa o RLS (Row Level Security) e define as políticas de segurança.

-- 1. APAGAR TABELAS ANTIGAS (OPCIONAL/SEGURO PARA RECRIAÇÃO)
DROP TABLE IF EXISTS public.ocorrencias CASCADE;
DROP TABLE IF EXISTS public.resumos_passagem CASCADE;

-- 2. CRIAR TABELA DE OCORRÊNCIAS
CREATE TABLE public.ocorrencias (
  id TEXT PRIMARY KEY,
  data_hora TIMESTAMPTZ NOT NULL,
  data_hora_conclusao TIMESTAMPTZ,
  supervisor TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  impacto TEXT NOT NULL,
  acao_tomada TEXT NOT NULL,
  status TEXT NOT NULL,
  duracao_minutos INTEGER DEFAULT 0,
  historico_atualizacoes JSONB DEFAULT '[]'::jsonb
);

-- Adicionar coluna em tabelas existentes se já criadas previamente
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS historico_atualizacoes JSONB DEFAULT '[]'::jsonb;

-- 3. CRIAR TABELA DE PASSAGEM DE BASTÃO / FECHAMENTO
CREATE TABLE public.resumos_passagem (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  supervisor TEXT NOT NULL,
  o_que_funcionou TEXT NOT NULL,
  o_que_fica_pendente TEXT NOT NULL,
  data_hora_criacao TIMESTAMPTZ NOT NULL
);

-- 4. ATIVAR ROW LEVEL SECURITY (RLS) PARA SEGURANÇA
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumos_passagem ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE SEGURANÇA RLS PARA A TABELA 'ocorrencias' (Chave Anônima / Anon)
DROP POLICY IF EXISTS "Permitir leitura anonima ocorrencias" ON public.ocorrencias;
CREATE POLICY "Permitir leitura anonima ocorrencias" ON public.ocorrencias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima ocorrencias" ON public.ocorrencias;
CREATE POLICY "Permitir insercao anonima ocorrencias" ON public.ocorrencias FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima ocorrencias" ON public.ocorrencias;
CREATE POLICY "Permitir atualizacao anonima ocorrencias" ON public.ocorrencias FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao anonima ocorrencias" ON public.ocorrencias;
CREATE POLICY "Permitir exclusao anonima ocorrencias" ON public.ocorrencias FOR DELETE USING (true);

-- 6. POLÍTICAS DE SEGURANÇA RLS PARA A TABELA 'resumos_passagem' (Chave Anônima / Anon)
DROP POLICY IF EXISTS "Permitir leitura anonima resumos" ON public.resumos_passagem;
CREATE POLICY "Permitir leitura anonima resumos" ON public.resumos_passagem FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima resumos" ON public.resumos_passagem;
CREATE POLICY "Permitir insercao anonima resumos" ON public.resumos_passagem FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima resumos" ON public.resumos_passagem;
CREATE POLICY "Permitir atualizacao anonima resumos" ON public.resumos_passagem FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusao anonima resumos" ON public.resumos_passagem;
CREATE POLICY "Permitir exclusao anonima resumos" ON public.resumos_passagem FOR DELETE USING (true);
`;

export const DatabaseErrorModal: React.FC<DatabaseErrorModalProps> = ({
  isOpen,
  onClose,
  healthStatus,
  onRetryConnection,
  onSyncComplete
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'erro' | 'sql'>('erro');

  const [diagResult, setDiagResult] = useState<{
    canRead: boolean;
    canWrite: boolean;
    diagnosticMessage: string;
    errorMessage?: string | null;
  } | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetryConnection();
    setIsRetrying(false);
  };

  const handleRunDiagnostic = async () => {
    setIsRunningDiag(true);
    const res = await dbService.runFullDatabaseDiagnostic();
    setDiagResult(res);
    setIsRunningDiag(false);
  };

  const handleSyncPending = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const result = await dbService.syncLocalToSupabase();
    setIsSyncing(false);
    setSyncMessage(result.message);
    if (result.success && onSyncComplete) {
      onSyncComplete();
    }
  };

  const handleCopyErrorCode = () => {
    if (healthStatus.errorCode) {
      navigator.clipboard.writeText(healthStatus.errorCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_DDL_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-red-200 text-gray-800 flex flex-col max-h-[90vh]">
        
        {/* Header do Modal */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg shrink-0">
              <ServerOff className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Diagnóstico de Conexão com Supabase
              </h3>
              <p className="text-xs text-red-100">
                Identificação de problemas e guia de sincronização dos lançamentos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('erro')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'erro'
                ? 'border-red-600 text-red-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Diagnóstico do Erro
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Script SQL (Tabelas e RLS)</span>
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto flex-grow">
          
          {activeTab === 'erro' && (
            <>
              {/* Card de Destaque do Código do Erro */}
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    Status da Conexão:
                  </span>
                  {healthStatus.errorCode && (
                    <button
                      onClick={handleCopyErrorCode}
                      className="px-2 py-0.5 bg-white border border-red-300 hover:bg-red-100 text-red-800 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Copiar código do erro"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-red-700" />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="bg-gray-900 text-red-400 font-mono font-bold text-sm px-3 py-2 rounded-md border border-gray-800 flex items-center justify-between">
                  <span>{healthStatus.errorCode || (healthStatus.isConnected ? 'HTTP 200 OK (Apenas Leitura)' : 'ERR_DESCONHECIDO')}</span>
                </div>
              </div>

              {/* Botão de Teste Completo de Escrita/Gravação */}
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Diagnóstico Completo de Gravação (INSERT):
                  </span>
                  <button
                    onClick={handleRunDiagnostic}
                    disabled={isRunningDiag}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isRunningDiag ? 'Executando Teste...' : 'Testar Escrita Agora'}
                  </button>
                </div>
                {diagResult && (
                  <div className={`p-3 rounded text-xs font-medium border leading-relaxed ${
                    diagResult.canWrite 
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold' 
                      : 'bg-red-100 border-red-300 text-red-950'
                  }`}>
                    <p className="font-bold mb-1">
                      {diagResult.canWrite ? '✅ Teste de Escrita com Sucesso!' : '❌ Falha Detectada no Teste de Escrita:'}
                    </p>
                    <p>{diagResult.diagnosticMessage}</p>
                    {diagResult.errorMessage && (
                      <p className="mt-1 font-mono text-[11px] opacity-80">
                        Detalhes: {diagResult.errorMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Mensagem e Detalhes do Erro */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                  Descrição e Causa Provável:
                </h4>
                <p className="text-xs font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                  {healthStatus.errorMessage || 'Não foi possível se comunicar com o banco de dados.'}
                </p>
              </div>

              {healthStatus.errorDetails && (
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                    Detalhes Técnicos do PostgreSQL/Supabase:
                  </h4>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-md border border-gray-200 font-mono leading-relaxed">
                    {healthStatus.errorDetails}
                  </p>
                </div>
              )}

              {/* Painel de Sincronização em Lote */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <CloudUpload className="w-4 h-4 text-emerald-700" />
                    <span>Recuperação e Sincronização de Dados Retidos:</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Os dados digitados pelas supervisoras estão mantidos com segurança no <strong>LocalStorage do navegador</strong>. Clique no botão abaixo para tentar sincronizá-los diretamente para o Supabase:
                </p>

                <button
                  onClick={handleSyncPending}
                  disabled={isSyncing}
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando no Supabase...' : 'Sincronizar Dados Retidos no Supabase'}</span>
                </button>

                {syncMessage && (
                  <p className="text-xs font-semibold p-2 bg-white rounded border border-emerald-300 text-emerald-950 mt-2">
                    {syncMessage}
                  </p>
                )}
              </div>

              {/* Dicas de Solução */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-xs space-y-1.5 text-amber-900">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  Passo a Passo de Resolução:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-amber-800 leading-relaxed">
                  <li>Confirme se as variáveis <code className="bg-amber-100 px-1 font-mono text-amber-950">VITE_SUPABASE_URL</code> e <code className="bg-amber-100 px-1 font-mono text-amber-950">VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> contêm as chaves do projeto.</li>
                  <li>No painel do Supabase, vá em <strong>SQL Editor</strong> e execute o script SQL disponibilizado na aba ao lado para criar as tabelas e políticas RLS.</li>
                  <li>Após aplicar o script no Supabase, clique em <strong>"Tentar Reconectar"</strong> e depois em <strong>"Sincronizar Dados Retidos"</strong>.</li>
                </ol>
              </div>

              {/* Horário da última verificação */}
              <p className="text-[11px] text-gray-400 text-right">
                Última verificação: {new Date(healthStatus.lastChecked).toLocaleTimeString('pt-BR')}
              </p>
            </>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                  Script DDL de Criação de Tabelas e Permissões RLS:
                </h4>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                      <span>SQL Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Copie o script abaixo e cole diretamente no <strong>SQL Editor</strong> do projeto no Supabase para garantir que as tabelas <code className="font-mono bg-gray-100 px-1">ocorrencias</code> e <code className="font-mono bg-gray-100 px-1">resumos_passagem</code> existam com as políticas de acesso público ativas:
              </p>

              <pre className="bg-gray-900 text-emerald-400 font-mono text-xs p-3.5 rounded-lg border border-gray-800 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-64">
                {SUPABASE_DDL_SQL}
              </pre>
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Testando Conexão...' : 'Tentar Reconectar'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

