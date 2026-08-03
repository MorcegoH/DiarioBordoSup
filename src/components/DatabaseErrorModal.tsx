/**
 * @file src/components/DatabaseErrorModal.tsx
 * @description Modal explicativo acionado ao clicar na tag "Off-line".
 * Exibe a mensagem de erro, o código da falha e diagnósticos de reconexão.
 */

import React, { useState } from 'react';
import { AlertOctagon, RefreshCw, X, Copy, Check, ServerOff, HelpCircle } from 'lucide-react';
import { DbHealthStatus } from '../services/dbService';

interface DatabaseErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthStatus: DbHealthStatus;
  onRetryConnection: () => Promise<void>;
}

export const DatabaseErrorModal: React.FC<DatabaseErrorModalProps> = ({
  isOpen,
  onClose,
  healthStatus,
  onRetryConnection
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetryConnection();
    setIsRetrying(false);
  };

  const handleCopyErrorCode = () => {
    if (healthStatus.errorCode) {
      navigator.clipboard.writeText(healthStatus.errorCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-200 text-gray-800 flex flex-col">
        
        {/* Header do Modal */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg shrink-0">
              <ServerOff className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Status do Banco de Dados: Off-line
              </h3>
              <p className="text-xs text-red-100">
                Ocorreu uma falha de comunicação ou configuração
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

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-4 text-sm">
          
          {/* Card de Destaque do Código do Erro */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                Código da Falha:
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
              <span>{healthStatus.errorCode || 'ERR_DESCONHECIDO'}</span>
            </div>
          </div>

          {/* Mensagem e Detalhes do Erro */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-gray-500">
              Descrição do Erro:
            </h4>
            <p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
              {healthStatus.errorMessage || 'Não foi possível se comunicar com o banco de dados.'}
            </p>
          </div>

          {healthStatus.errorDetails && (
            <div className="space-y-1">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                Detalhes Técnicos:
              </h4>
              <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-md border border-gray-200 font-mono leading-relaxed">
                {healthStatus.errorDetails}
              </p>
            </div>
          )}

          {/* Dicas de Solução */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-xs space-y-1.5 text-amber-900">
            <p className="font-bold flex items-center gap-1.5 text-amber-900">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
              Orientação para Resolução:
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-800 leading-relaxed">
              {healthStatus.errorCode === 'ERR_ENV_MISSING' ? (
                <>
                  <li>Insira as variáveis <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950">VITE_SUPABASE_URL</code> e <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950">VITE_SUPABASE_ANON_KEY</code> no arquivo de variáveis de ambiente.</li>
                  <li>Reinicie a aplicação para carregar as novas variáveis.</li>
                </>
              ) : (
                <>
                  <li>Verifique se o serviço de banco de dados está ativo e acessível.</li>
                  <li>Confirme se as tabelas <code className="bg-amber-100 px-1 font-mono text-amber-950">ocorrencias</code> e <code className="bg-amber-100 px-1 font-mono text-amber-950">resumos_passagem</code> foram criadas com as permissões RLS ativas.</li>
                  <li>Enquanto estiver Off-line, o sistema utilizará o modo local automático para salvar e não perder nenhum dado.</li>
                </>
              )}
            </ul>
          </div>

          {/* Horário da última verificação */}
          <p className="text-[11px] text-gray-400 text-right">
            Última verificação: {new Date(healthStatus.lastChecked).toLocaleTimeString('pt-BR')}
          </p>
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
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
