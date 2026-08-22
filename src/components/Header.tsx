/**
 * @file src/components/Header.tsx
 * @description Cabeçalho corporativo principal da aplicação "Diário de Bordo - Supervisão".
 * Estilizado com a cor primária #005b2e e tipografia Montserrat.
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, BarChart3, ClipboardList, Sparkles, Clock, Download, Database, CheckCircle2, ServerOff, BadgePercent } from 'lucide-react';
import { dbService, DbHealthStatus } from '../services/dbService';
import { DatabaseErrorModal } from './DatabaseErrorModal';
import { Ocorrencia, ResumoPassagem } from '../types';

interface HeaderProps {
  activeTab: 'ocorrencias' | 'dashboard' | 'passagem' | 'descontos';
  setActiveTab: (tab: 'ocorrencias' | 'dashboard' | 'passagem' | 'descontos') => void;
  totalOcorrencias: number;
  totalCriticos: number;
  ocorrencias: Ocorrencia[];
  passagens: ResumoPassagem[];
  onExportCSV: () => void;
  onDataSynced?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeTab,
  setActiveTab,
  totalOcorrencias,
  totalCriticos,
  ocorrencias,
  passagens,
  onExportCSV,
  onDataSynced,
  isDarkMode = true,
  onToggleDarkMode
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<DbHealthStatus>(dbService.getHealthStatus());
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' • ' +
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Atualiza o estado da saúde do banco quando as ocorrências mudam
  useEffect(() => {
    setHealthStatus(dbService.getHealthStatus());
  }, [ocorrencias, passagens]);

  const handleRetryConnection = async () => {
    const updatedHealth = await dbService.checkConnection();
    setHealthStatus(updatedHealth);
    if (updatedHealth.isConnected && onDataSynced) {
      onDataSynced();
      setIsErrorModalOpen(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' • ' +
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-primary-green text-white shadow-md border-b border-green-900 w-full">
      {/* Top Banner */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Title & Brand */}
          <div className="flex items-center space-x-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('ocorrencias');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
              title="Ir para a Página Inicial (Diário de Bordo)"
            >
              <ShieldCheck className="w-8 h-8 text-emerald-300" />
            </a>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('ocorrencias');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group cursor-pointer text-left"
                  title="Ir para a Página Inicial (Diário de Bordo)"
                >
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-emerald-100 transition-colors">
                    Diário de Bordo - Supervisão
                  </h1>
                </a>

                {/* Tag de Status de Conexão alinhada ao título */}
                <button
                  type="button"
                  onClick={() => setIsErrorModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs transition-all select-none cursor-pointer ${
                    healthStatus.isConnected
                      ? 'bg-emerald-900/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-800'
                      : 'bg-red-950/90 text-red-100 border-red-500/60 hover:bg-red-900 animate-pulse'
                  }`}
                  title="Clique para visualizar o diagnóstico de conexão, script SQL e sincronizar dados"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {healthStatus.isConnected ? 'Conectado' : 'Off-line'}
                  </span>
                  {healthStatus.isConnected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <ServerOff className="w-3.5 h-3.5 text-red-300" />
                  )}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                Gestão Operacional de Vendas • Gerente: <strong className="text-white">Heder Santos</strong>
              </p>
            </div>
          </div>


          {/* Quick Stats & Controls */}
          <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
            <div className="hidden lg:flex items-center gap-2 text-xs bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-700/50 text-emerald-100">
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>{timeString}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-700/40 flex items-center gap-2">
                <span className="text-xs text-emerald-200">Total:</span>
                <span className="text-sm font-bold text-white">{totalOcorrencias}</span>
              </div>

              {totalCriticos > 0 && (
                <div className="bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-400/40 flex items-center gap-2 animate-pulse">
                  <span className="text-xs text-red-200 font-semibold">Críticos:</span>
                  <span className="text-sm font-bold text-red-200">{totalCriticos}</span>
                </div>
              )}

              {/* ARQUITETURA REFATORADA: Botão de Exportar CSV com Consciência Contextual de Aba */}
              <button
                id="btn-global-export-csv"
                onClick={onExportCSV}
                title={
                  activeTab === 'descontos'
                    ? 'Exportar Solicitações de Desconto para Excel/CSV'
                    : activeTab === 'passagem'
                    ? 'Exportar Fechamentos de Turno e Pendências para Excel/CSV'
                    : 'Exportar Histórico de Ocorrências para Excel/CSV'
                }
                className="p-2 sm:px-3 sm:py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-emerald-600/60 shadow-xs cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span className="hidden sm:inline">
                  {activeTab === 'descontos'
                    ? 'Exportar Descontos'
                    : activeTab === 'passagem'
                    ? 'Exportar Fechamento'
                    : 'Exportar CSV'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Estilo App com suporte a touch e rolagem suave */}
        <nav className="flex overflow-x-auto space-x-2 mt-4 pt-2 border-t border-emerald-700/60 no-scrollbar touch-pan-x py-1">
          <button
            onClick={() => setActiveTab('ocorrencias')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 active:scale-95 select-none ${
              activeTab === 'ocorrencias'
                ? 'bg-white text-[#005b2e] shadow-sm font-bold ring-2 ring-white/30'
                : 'text-emerald-100 bg-white/5 hover:bg-emerald-800/60 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Ocorrências & Registro</span>
          </button>

          <button
            onClick={() => setActiveTab('descontos')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 active:scale-95 select-none ${
              activeTab === 'descontos'
                ? 'bg-white text-[#005b2e] shadow-sm font-bold ring-2 ring-white/30'
                : 'text-emerald-100 bg-white/5 hover:bg-emerald-800/60 hover:text-white'
            }`}
          >
            <BadgePercent className="w-4 h-4" />
            <span>Solicitações de Desconto</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 active:scale-95 select-none ${
              activeTab === 'dashboard'
                ? 'bg-white text-[#005b2e] shadow-sm font-bold ring-2 ring-white/30'
                : 'text-emerald-100 bg-white/5 hover:bg-emerald-800/60 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard BI</span>
          </button>

          <button
            onClick={() => setActiveTab('passagem')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 active:scale-95 select-none ${
              activeTab === 'passagem'
                ? 'bg-white text-[#005b2e] shadow-sm font-bold ring-2 ring-white/30'
                : 'text-emerald-100 bg-white/5 hover:bg-emerald-800/60 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Fechamento de Turno</span>
          </button>
        </nav>
      </div>

      {/* Modal de Infraestrutura, Diagnóstico, Backup & Reset do Banco */}
      <DatabaseErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        healthStatus={healthStatus}
        onRetryConnection={handleRetryConnection}
        onSyncComplete={onDataSynced}
        onDataResetOrRestored={onDataSynced}
      />
    </header>
  );
});
