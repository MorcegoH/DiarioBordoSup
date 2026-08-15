/**
 * @file src/components/DatabaseErrorModal.tsx
 * @description Modal informativo e de diagnóstico da infraestrutura da plataforma e conexão com o Supabase.
 * - Quando Conectado: Apresenta a infraestrutura completa (Vercel, GitHub, Supabase), resiliência e boas práticas.
 * - Quando Desconectado/Erro: Apresenta diagnóstico sucinto, ferramentas de teste, sincronização e contato do Administrador.
 */

import React, { useState } from 'react';
import {
  AlertOctagon,
  RefreshCw,
  X,
  Copy,
  Check,
  ServerOff,
  HelpCircle,
  CloudUpload,
  CheckCircle2,
  Globe,
  Database,
  Mail,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  FileSpreadsheet,
  Code
} from 'lucide-react';
import { dbService, DbHealthStatus } from '../services/dbService';

interface DatabaseErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthStatus: DbHealthStatus;
  onRetryConnection: () => Promise<void>;
  onSyncComplete?: () => void;
}

export const DatabaseErrorModal: React.FC<DatabaseErrorModalProps> = ({
  isOpen,
  onClose,
  healthStatus,
  onRetryConnection,
  onSyncComplete
}) => {
  const isHealthy = healthStatus.isConnected && !healthStatus.errorCode;

  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'diagnostico'>(
    isHealthy ? 'visao_geral' : 'diagnostico'
  );

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

  const handleCopyAdminEmail = () => {
    navigator.clipboard.writeText('heder.santos@adarco.com.br');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border text-gray-800 flex flex-col max-h-[92vh] ${
        isHealthy ? 'border-emerald-200' : 'border-red-200'
      }`}>
        
        {/* Header do Modal */}
        <div className={`p-4 sm:p-5 flex items-center justify-between shrink-0 text-white ${
          isHealthy ? 'bg-emerald-800' : 'bg-red-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg shrink-0">
              {isHealthy ? (
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
              ) : (
                <ServerOff className="w-6 h-6 text-red-200" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                {isHealthy ? 'Status da Infraestrutura & Plataforma' : 'Diagnóstico de Conexão com Supabase'}
              </h3>
              <p className="text-xs text-white/90">
                {isHealthy
                  ? 'Ambiente de produção operacional, sincronizado e com alta disponibilidade'
                  : 'Identificação de problemas e guia de sincronização dos lançamentos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas (Apenas Infraestrutura e Diagnóstico/Teste) */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 shrink-0 overflow-x-auto">
          {isHealthy ? (
            <>
              <button
                onClick={() => setActiveTab('visao_geral')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'visao_geral'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Infraestrutura da Plataforma</span>
              </button>
              <button
                onClick={() => setActiveTab('diagnostico')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'diagnostico'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Teste de Conexão & Escrita</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('diagnostico')}
              className="px-4 py-2 text-xs font-bold border-b-2 border-red-600 text-red-700 bg-white rounded-t-lg shadow-2xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Diagnóstico do Erro</span>
            </button>
          )}
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto flex-grow">
          
          {/* ================= ABA 1: VISÃO GERAL DA INFRAESTRUTURA (QUANDO TUDO OK) ================= */}
          {activeTab === 'visao_geral' && isHealthy && (
            <div className="space-y-4">
              {/* Card de Status Geral */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Sistema Operacional e Sincronizado
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Comunicação ativa com o banco PostgreSQL no Supabase (Leitura e Gravação habilitadas).
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 text-xs font-bold bg-emerald-200 text-emerald-900 rounded-full border border-emerald-300">
                  Status: 100% Online
                </span>
              </div>

              {/* Seção dos 3 Pilares da Aplicação */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Pilares de Arquitetura & Infraestrutura:
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Pilar 1: Vercel */}
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg space-y-1.5 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                      <Globe className="w-4 h-4 text-black" />
                      <span>Deploy em Vercel</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Frontend SPA em <strong>React + Vite</strong> distribuído na rede Edge global da Vercel com carregamento instantâneo, CDN ultrarrápido e HTTPS automático.
                    </p>
                  </div>

                  {/* Pilar 2: GitHub */}
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg space-y-1.5 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                      <Code className="w-4 h-4 text-gray-800" />
                      <span>Estrutura no GitHub</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Código-fonte versionado e modular com <strong>TypeScript</strong> estrito, tipagem de dados segura, componentes isolados e arquitetura resiliente.
                    </p>
                  </div>

                  {/* Pilar 3: Supabase */}
                  <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-lg space-y-1.5 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-xs">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>BD Supabase (Postgres)</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Banco de dados relacional <strong>PostgreSQL</strong> na nuvem com Row Level Security (RLS), sincronização em tempo real e integridade transacional.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pontos Importantes da Infraestrutura */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Destaques e Recursos da Plataforma:
                </h4>

                <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 space-y-2.5 text-xs text-blue-950">
                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-blue-200 text-blue-900 rounded shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="font-semibold text-blue-950">Tolerância a Falhas & Fallback Offline:</strong> Se a conexão oscilar, os dados continuam sendo gravados com total segurança no <em>LocalStorage</em> do navegador para garantir zero perda de informações.
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-blue-200 text-blue-900 rounded shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="font-semibold text-blue-950">Métricas & Exportação Integrada:</strong> Cálculo automático de MTTR, análise de Pareto, tempo de resolução e exportação de relatórios em formato CSV em tempo real.
                    </div>
                  </div>
                </div>
              </div>

              {/* Contato do Administrador */}
              <div className="bg-gray-100 border border-gray-300 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-gray-800">
                  <div className="p-2 bg-white rounded-lg border border-gray-200 text-emerald-800">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block">Administrador da Plataforma:</span>
                    <span className="text-gray-600 font-mono">heder.santos@adarco.com.br</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAdminEmail}
                    className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-md font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Copiar e-mail do administrador"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar E-mail</span>
                      </>
                    )}
                  </button>
                  <a
                    href="mailto:heder.santos@adarco.com.br?subject=Diario%20de%20Bordo%20-%20Contato%20Administracao"
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Contatar</span>
                  </a>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-right">
                Última checagem de integridade: {new Date(healthStatus.lastChecked).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          )}

          {/* ================= ABA 2: DIAGNÓSTICO / TESTE DE GRAVAÇÃO OU ERRO ================= */}
          {activeTab === 'diagnostico' && (
            <div className="space-y-4">
              
              {/* Se estiver com erro, exibe o bloco de erro sucinto */}
              {!isHealthy ? (
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
                          className="px-2 py-0.5 bg-white border border-red-300 hover:bg-red-100 text-red-800 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
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
                      <span>{healthStatus.errorCode || 'ERR_CONEXAO_SUPABASE'}</span>
                    </div>
                  </div>

                  {/* Diagnóstico Sucinto */}
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                      Diagnóstico do Erro:
                    </h4>
                    <p className="text-xs font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                      {healthStatus.errorMessage || 'Não foi possível se comunicar com o banco de dados Supabase.'}
                    </p>
                  </div>

                  {healthStatus.errorDetails && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                        Causa Técnica Provável:
                      </h4>
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-md border border-gray-200 font-mono leading-relaxed">
                        {healthStatus.errorDetails}
                      </p>
                    </div>
                  )}

                  {/* Sinalização para Contatar Administrador */}
                  <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <span className="font-bold block">Precisa de auxílio técnico?</span>
                        <span>Entre em contato com o Administrador: <strong className="font-mono text-amber-900">heder.santos@adarco.com.br</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyAdminEmail}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded font-semibold text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedEmail ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar E-mail</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Bloco informativo quando tudo está OK e o usuário quer testar */
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950">
                    <p className="font-bold mb-1">A conexão está saudável e ativa.</p>
                    <p className="text-emerald-800">
                      Você pode disparar um teste de leitura e inserção em tempo real abaixo para validar permissões de escrita (INSERT) no Supabase.
                    </p>
                  </div>
                </div>
              )}

              {/* Botão de Teste Completo de Escrita/Gravação */}
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Diagnóstico Completo de Gravação (INSERT):
                  </span>
                  <button
                    onClick={handleRunDiagnostic}
                    disabled={isRunningDiag}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRunningDiag ? 'animate-spin' : ''}`} />
                    <span>{isRunningDiag ? 'Executando Teste...' : 'Testar Escrita Agora'}</span>
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
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
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

              {/* Dicas de Solução se estiver com erro */}
              {!isHealthy && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-xs space-y-1.5 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    Passo a Passo de Resolução Rápida:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800 leading-relaxed">
                    <li>Confirme se as variáveis <code className="bg-amber-100 px-1 font-mono text-amber-950">VITE_SUPABASE_URL</code> e <code className="bg-amber-100 px-1 font-mono text-amber-950">VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> contêm as chaves do projeto.</li>
                    <li>Após verificar as variáveis no Supabase, clique em <strong>"Tentar Reconectar"</strong> e depois em <strong>"Sincronizar Dados Retidos"</strong>.</li>
                  </ol>
                </div>
              )}

              {/* Horário da última verificação */}
              <p className="text-[11px] text-gray-400 text-right">
                Última verificação: {new Date(healthStatus.lastChecked).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Testando Conexão...' : 'Tentar Reconectar'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
