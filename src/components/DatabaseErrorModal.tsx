/**
 * @file src/components/DatabaseErrorModal.tsx
 * @description Modal informativo, de diagnóstico da infraestrutura, gerenciador de Pontos de Restauração (Backup no Banco)
 * e comando de Reset Seguro com senha de autorização.
 * 
 * Abas:
 * 1. Infraestrutura da Plataforma: Apresenta os 3 pilares (Vercel, GitHub, Supabase), resiliência e contato.
 * 2. Teste de Conexão & Escrita: Ferramentas de teste de integridade em tempo real e sincronização de dados retidos.
 * 3. Backup & Restauração / Zerar Banco: Criação de pontos de restauração com regras SQL, recuperação mediante senha
 *    e comando protegido para apagar e zerar todo o banco com geração obrigatória prévia de backup.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Code,
  RotateCcw,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  PlusCircle,
  Trash2,
  Calendar,
  Layers as LayersIcon
} from 'lucide-react';
import { dbService, DbHealthStatus } from '../services/dbService';
import { PontoRestauracao } from '../types';

interface DatabaseErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthStatus: DbHealthStatus;
  onRetryConnection: () => Promise<void>;
  onSyncComplete?: () => void;
  onDataResetOrRestored?: () => void;
}

export const DatabaseErrorModal: React.FC<DatabaseErrorModalProps> = ({
  isOpen,
  onClose,
  healthStatus,
  onRetryConnection,
  onSyncComplete,
  onDataResetOrRestored
}) => {
  const isHealthy = healthStatus.isConnected && !healthStatus.errorCode;

  const [activeTab, setActiveTab] = useState<'visao_geral' | 'diagnostico' | 'backup_reset'>(
    isHealthy ? 'visao_geral' : 'diagnostico'
  );

  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Diagnóstico
  const [diagResult, setDiagResult] = useState<{
    canRead: boolean;
    canWrite: boolean;
    diagnosticMessage: string;
    errorMessage?: string | null;
  } | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // Estados da Aba 3: Limpar e Backup
  const [pontos, setPontos] = useState<PontoRestauracao[]>([]);
  const [isLoadingPontos, setIsLoadingPontos] = useState(false);
  const [isCreatingPonto, setIsCreatingPonto] = useState(false);

  // Reset do Banco
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restauração de Ponto Selecionado
  const [pontoParaRestaurar, setPontoParaRestaurar] = useState<PontoRestauracao | null>(null);
  const [restorePasswordInput, setRestorePasswordInput] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar lista de pontos de restauração
  const carregarPontos = useCallback(async () => {
    setIsLoadingPontos(true);
    try {
      const lista = await dbService.getPontosRestauracao();
      setPontos(lista);
    } catch (err) {
      console.error('Erro ao carregar pontos de restauração:', err);
    } finally {
      setIsLoadingPontos(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'backup_reset') {
      carregarPontos();
    }
  }, [isOpen, activeTab, carregarPontos]);

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

  // --- Handlers da Aba 3 ---
  const handleCriarPontoManual = async () => {
    setIsCreatingPonto(true);
    try {
      await dbService.criarPontoRestauracao('manual');
      await carregarPontos();
    } catch (e) {
      console.error('Erro ao criar ponto manual:', e);
    } finally {
      setIsCreatingPonto(false);
    }
  };

  const handleExecutarReset = async () => {
    if (!resetPasswordInput.trim()) {
      setResetMessage({
        type: 'error',
        text: 'Por favor, digite a senha de segurança para autorizar o reset do banco de dados.'
      });
      return;
    }

    setIsResetting(true);
    setResetMessage(null);

    const resultado = await dbService.zerarBancoDeDados(
      resetPasswordInput.trim(),
      'Heder Santos (Gerente de Vendas)'
    );

    setIsResetting(false);

    if (resultado.success) {
      setResetMessage({
        type: 'success',
        text: resultado.message
      });
      setResetPasswordInput('');
      await carregarPontos();
      if (onDataResetOrRestored) {
        onDataResetOrRestored();
      }
    } else {
      const mensagemErroCompleta = resultado.detalhesErro 
        ? `${resultado.message} Motivo: ${resultado.detalhesErro}`
        : resultado.message;

      setResetMessage({
        type: 'error',
        text: mensagemErroCompleta
      });
    }
  };

  const handleConfirmarRestauracao = async () => {
    if (!pontoParaRestaurar) return;

    if (!restorePasswordInput.trim()) {
      setRestoreMessage({
        type: 'error',
        text: 'Digite a senha de segurança para autorizar a recuperação deste ponto de restauração.'
      });
      return;
    }

    setIsRestoring(true);
    setRestoreMessage(null);

    const resultado = await dbService.restaurarPonto(
      pontoParaRestaurar.id,
      restorePasswordInput.trim()
    );

    setIsRestoring(false);

    if (resultado.success) {
      setRestoreMessage({
        type: 'success',
        text: resultado.message
      });
      setRestorePasswordInput('');
      if (onDataResetOrRestored) {
        onDataResetOrRestored();
      }
    } else {
      setRestoreMessage({
        type: 'error',
        text: resultado.message
      });
    }
  };

  const handleBaixarJson = (ponto: PontoRestauracao) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ponto, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup-${ponto.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border text-gray-800 flex flex-col max-h-[94vh] ${
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

        {/* Abas Internas (3 Abas: Infraestrutura, Diagnóstico e Backup/Restauração/Reset) */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 shrink-0 overflow-x-auto gap-1">
          {/* Aba 1: Infraestrutura */}
          {isHealthy && (
            <button
              onClick={() => setActiveTab('visao_geral')}
              className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'visao_geral'
                  ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Infraestrutura da Plataforma</span>
            </button>
          )}

          {/* Aba 2: Teste / Diagnóstico */}
          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'diagnostico'
                ? isHealthy
                  ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs'
                  : 'border-red-600 text-red-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {isHealthy ? (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Teste de Conexão & Escrita</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Diagnóstico do Erro</span>
              </>
            )}
          </button>

          {/* Aba 3: Limpar e Backup */}
          <button
            onClick={() => setActiveTab('backup_reset')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backup_reset'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-lg shadow-2xs font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
            <span>Limpar e Backup</span>
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto flex-grow">
          
          {/* ================= ABA 1: VISÃO GERAL DA INFRAESTRUTURA ================= */}
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

          {/* ================= ABA 3: LIMPAR E BACKUP ================= */}
          {activeTab === 'backup_reset' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Top Banner de Governança e Regras SQL de Backup */}
              <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
                  <h4 className="font-bold text-sm">
                    Limpar e Backup
                  </h4>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  Sempre que for solicitado zerar os dados, cria-se automaticamente um backup completo com regras SQL nativas para PostgreSQL/Supabase. O backup atual <strong>sempre substitui o backup anterior</strong>, mantendo-se <strong>apenas um backup ativo</strong> para restauração.
                </p>
              </div>

              {/* ================= SEÇÃO 1: ZONA CRÍTICA - ZERAR E APAGAR BANCO DE DADOS ================= */}
              <div className="border border-red-200 bg-red-50/60 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-600 text-white rounded-lg shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-red-950 flex items-center gap-2">
                      Comando Administrativo: Apagar e Zerar Todo o Banco de Dados
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-200 text-red-900 rounded uppercase">
                        Ação Protegida
                      </span>
                    </h5>
                    <p className="text-xs text-red-900 leading-relaxed">
                      Zera todas as tabelas (<strong>Ocorrências</strong>, <strong>Fechamentos de Turno</strong> e <strong>Solicitações de Desconto</strong>) reiniciando o sistema limpo.
                    </p>
                  </div>
                </div>

                {/* Formulário de Confirmação com Senha de Segurança */}
                <div className="bg-white p-4 rounded-lg border border-red-200 space-y-3">
                  <label className="block text-xs font-bold text-gray-700">
                    Digite a Senha de Segurança Administrativa para Confirmar o Reset:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        value={resetPasswordInput}
                        onChange={(e) => setResetPasswordInput(e.target.value)}
                        placeholder="Digite a senha administrativa..."
                        className="w-full pl-9 pr-10 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                      />
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        title={showResetPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleExecutarReset}
                      disabled={isResetting || !resetPasswordInput}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      {isResetting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Validando Backup & Zerando...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Criar Backup & Zerar Banco</span>
                        </>
                      )}
                    </button>
                  </div>

                  {resetMessage && (
                    <div className={`p-3 rounded-lg text-xs border ${
                      resetMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-red-50 border-red-300 text-red-950'
                    }`}>
                      <p className="font-bold">{resetMessage.text}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= SEÇÃO 2: CAMPO DE RESTAURAÇÃO DO BACKUP ATIVO ================= */}
              {pontoParaRestaurar && (
                <div className="border-2 border-emerald-500 bg-emerald-50/70 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-emerald-800 shrink-0" />
                      <div>
                        <h5 className="font-bold text-sm text-emerald-950">
                          Recuperar Backup: {pontoParaRestaurar.titulo}
                        </h5>
                        <p className="text-xs text-emerald-800">
                          Data do Backup: {new Date(pontoParaRestaurar.dataHora).toLocaleString('pt-BR')} • {pontoParaRestaurar.contagem.totalRegistros} registro(s) no total
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPontoParaRestaurar(null);
                        setRestoreMessage(null);
                        setRestorePasswordInput('');
                      }}
                      className="p-1 rounded-lg hover:bg-emerald-200 text-emerald-900 cursor-pointer"
                      title="Cancelar seleção"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-emerald-300 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Ocorrências:</span>
                        <strong className="text-emerald-800 font-mono text-sm">{pontoParaRestaurar.contagem.ocorrencias}</strong>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Fechamentos Turno:</span>
                        <strong className="text-emerald-800 font-mono text-sm">{pontoParaRestaurar.contagem.passagens}</strong>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">Descontos:</span>
                        <strong className="text-emerald-800 font-mono text-sm">{pontoParaRestaurar.contagem.solicitacoesDesconto}</strong>
                      </div>
                    </div>

                    <label className="block text-xs font-bold text-gray-700">
                      Digite a Senha de Segurança para Autorizar a Restauração no Banco:
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-grow">
                        <input
                          type={showRestorePassword ? 'text' : 'password'}
                          value={restorePasswordInput}
                          onChange={(e) => setRestorePasswordInput(e.target.value)}
                          placeholder="Digite a senha administrativa..."
                          className="w-full pl-9 pr-10 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                        />
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <button
                          type="button"
                          onClick={() => setShowRestorePassword(!showRestorePassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showRestorePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmarRestauracao}
                        disabled={isRestoring || !restorePasswordInput}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                      >
                        {isRestoring ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Restaurando Dados...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Confirmar e Restaurar Backup</span>
                          </>
                        )}
                      </button>
                    </div>

                    {restoreMessage && (
                      <div className={`p-3 rounded-lg text-xs font-semibold border ${
                        restoreMessage.type === 'success'
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                          : 'bg-red-50 border-red-300 text-red-950'
                      }`}>
                        {restoreMessage.text}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= SEÇÃO 3: CRIAÇÃO MANUAL DE BACKUP ================= */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-emerald-700" />
                      Gerar Novo Backup
                    </h5>
                    <p className="text-xs text-gray-600">
                      Cria um novo backup substituindo o anterior.
                    </p>
                  </div>

                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={handleCriarPontoManual}
                      disabled={isCreatingPonto}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      <PlusCircle className={`w-3.5 h-3.5 ${isCreatingPonto ? 'animate-spin' : ''}`} />
                      <span>{isCreatingPonto ? 'Gerando Backup...' : 'Gerar Backup Agora'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ================= SEÇÃO 4: BACKUP ATIVO DISPONÍVEL (MANTIDO 1 ÚNICO) ================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <LayersIcon className="w-4 h-4 text-emerald-700" />
                    Backup Ativo para Restauração (Único Ponto):
                  </h5>
                  <button
                    onClick={carregarPontos}
                    disabled={isLoadingPontos}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPontos ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {pontos.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center text-xs text-gray-500 space-y-1">
                    <p className="font-semibold">Nenhum backup registrado no momento.</p>
                    <p>Ao solicitar zerar os dados ou clicar em "Gerar Backup Agora", o backup ativo único será listado aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pontos.slice(0, 1).map((ponto) => {
                      const isPreReset = ponto.motivo === 'pre_reset';
                      return (
                        <div
                          key={ponto.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isPreReset
                              ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                              : 'bg-white border-gray-200 hover:border-emerald-300 shadow-2xs'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-gray-900">
                                {ponto.titulo}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                isPreReset
                                  ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}>
                                {isPreReset ? 'Backup Pré-Reset' : 'Backup Ativo'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                                Backup Único
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-gray-600 flex-wrap">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {new Date(ponto.dataHora).toLocaleString('pt-BR')}
                              </span>
                              <span>•</span>
                              <span>
                                Salvos: <strong>{ponto.contagem.ocorrencias}</strong> ocorrências, <strong>{ponto.contagem.passagens}</strong> fechamentos, <strong>{ponto.contagem.solicitacoesDesconto}</strong> descontos (Total: <strong>{ponto.contagem.totalRegistros}</strong>)
                              </span>
                            </div>
                          </div>

                          {/* Botões de Ação por Ponto */}
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setPontoParaRestaurar(ponto);
                                setRestoreMessage(null);
                                setRestorePasswordInput('');
                              }}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Restaurar este backup no banco de dados"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleBaixarJson(ponto)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300 cursor-pointer"
                              title="Baixar arquivo JSON de backup"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
