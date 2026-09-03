/**
 * @file src/components/common/ErrorBoundary.tsx
 * @description Barreira de contenção de erros de renderização (Error Boundary).
 * Previne que falhas pontuais de JavaScript quebrem a aplicação inteira em tela branca,
 * provendo contingência com recuperação rápida e salvamento emergencial dos dados locais.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, RotateCcw, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { exportEmergencyStorageDump } from '../../utils/safeStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  backupDownloaded: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      backupDownloaded: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro crítico capturado na interface:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleDownloadEmergencyBackup = () => {
    try {
      const dump = exportEmergencyStorageDump();
      const blob = new Blob([dump], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dataStr = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `backup-emergencial-diario-bordo-${dataStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.setState({ backupDownloaded: true });
    } catch (e) {
      alert('Falha ao gerar o arquivo de backup emergencial: ' + String(e));
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-gray-800">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Topo Corporativo */}
            <div className="bg-[#005b2e] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">Contingência de Interface Ativada</h1>
                  <p className="text-xs text-emerald-100 font-medium">Diário de Bordo • Supervisão Inside Sales</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-900/60 rounded-full text-xs font-semibold border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Dados Locais Preservados</span>
              </div>
            </div>

            {/* Conteúdo Informativo */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="border-l-4 border-amber-500 pl-4 py-1">
                <h2 className="text-base font-bold text-gray-900">
                  Ocorreu uma instabilidade pontual na exibição da tela
                </h2>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  O sistema de proteção conteve o erro para evitar corrupção de dados. 
                  Suas ocorrências, passagens de turno e relatórios salvos no navegador estão intactos e seguros.
                </p>
              </div>

              {/* Ações de Recuperação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-3 bg-[#005b2e] hover:bg-[#004724] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  title="Tenta restabelecer os componentes da tela sem recarregar o navegador"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tentar Recuperar</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  title="Recarrega a aplicação no navegador"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Recarregar Página</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleDownloadEmergencyBackup}
                  className={`px-4 py-3 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border ${
                    this.state.backupDownloaded
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300'
                  }`}
                  title="Gera um arquivo JSON contendo todos os dados operacionais armazenados localmente"
                >
                  <Download className="w-4 h-4" />
                  <span>{this.state.backupDownloaded ? 'Backup Baixado!' : 'Baixar Backup (JSON)'}</span>
                </button>
              </div>

              {/* Detalhes Técnicos Recolhíveis */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Detalhes do diagnóstico técnico</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3 bg-gray-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-48 border border-gray-800">
                    <p className="font-bold text-red-400">
                      {this.state.error?.name}: {this.state.error?.message}
                    </p>
                    {this.state.error?.stack && (
                      <pre className="mt-2 text-[11px] text-gray-400 whitespace-pre-wrap leading-tight">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé */}
            <div className="bg-gray-50 px-6 py-3 text-center border-t border-gray-100 text-[11px] text-gray-500">
              Caso a instabilidade persista, utilize o botão "Baixar Backup" para salvar seus dados e notifique a TI/Supervisão.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
