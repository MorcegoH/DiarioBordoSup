/**
 * @file src/App.tsx
 * @description Componente Principal da aplicação "Diário de Bordo - Supervisão Inside Sales".
 * Integra persistência em Supabase com fallback gracioso em LocalStorage.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ocorrencia, ResumoPassagem, Status } from './types';
import { INITIAL_MOCK_OCORRENCIAS, INITIAL_MOCK_PASSAGENS } from './data/mockData';
import { dbService } from './services/dbService';
import { Header } from './components/Header';
import { OccurrenceForm } from './components/OccurrenceForm';
import { OccurrenceHistory } from './components/OccurrenceHistory';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ShiftPassoverSection } from './components/ShiftPassoverSection';
import { exportToCSV } from './utils/statisticalAnalysis';

import { verifyAdminAuthorization } from './utils/security';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ocorrencias' | 'dashboard' | 'passagem'>('ocorrencias');
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(INITIAL_MOCK_OCORRENCIAS);
  const [passagens, setPassagens] = useState<ResumoPassagem[]>(INITIAL_MOCK_PASSAGENS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Estado do Modo Escuro (Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('diario_bordo_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('diario_bordo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('diario_bordo_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Carrega os dados iniciais do Supabase ou do LocalStorage
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedOcorrencias, fetchedPassagens] = await Promise.all([
        dbService.getOcorrencias(),
        dbService.getPassagens()
      ]);
      setOcorrencias(fetchedOcorrencias);
      setPassagens(fetchedPassagens);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handlers sincronizados com o dbService
  const handleAddOcorrencia = useCallback(async (nova: Ocorrencia) => {
    setOcorrencias((prev) => [nova, ...prev]);
    await dbService.addOcorrencia(nova);
  }, []);

  const handleDeleteOcorrencia = useCallback(async (id: string) => {
    setOcorrencias((prev) => prev.filter((o) => o.id !== id));
    await dbService.deleteOcorrencia(id);
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, newStatus: Status) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    await dbService.updateStatusOcorrencia(id, newStatus);
  }, []);

  const handleUpdateOcorrencia = useCallback(async (updated: Ocorrencia) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    await dbService.updateOcorrencia(updated);
  }, []);

  const handleSavePassagem = useCallback(async (novaPassagem: ResumoPassagem) => {
    setPassagens((prev) => [novaPassagem, ...prev]);
    await dbService.addPassagem(novaPassagem);
  }, []);

  const handleResetData = useCallback(async () => {
    const senhaInput = window.prompt('Confirmação de Segurança: Informe a senha de autorização para zerar o banco de dados e registros:');
    if (verifyAdminAuthorization(senhaInput)) {
      if (window.confirm('Tem certeza absoluta que deseja zerar todos os registros do sistema (Banco Supabase e LocalStorage)?')) {
        setOcorrencias([]);
        setPassagens([]);
        await dbService.clearAllData();
        alert('Todos os dados foram zerados com sucesso.');
      }
    } else if (senhaInput !== null) {
      alert('Senha incorreta! Ação de exclusão/limpeza não autorizada.');
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    exportToCSV(ocorrencias);
  }, [ocorrencias]);

  const totalCriticos = useMemo(() => {
    let count = 0;
    for (let i = 0; i < ocorrencias.length; i++) {
      if (ocorrencias[i].impacto === 'Crítico' && ocorrencias[i].status !== 'Resolvido') {
        count++;
      }
    }
    return count;
  }, [ocorrencias]);

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-[#333333] flex flex-col font-sans">
      
      {/* SEÇÃO 1: Cabeçalho com logo, título e status do Supabase */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalOcorrencias={ocorrencias.length}
        totalCriticos={totalCriticos}
        ocorrencias={ocorrencias}
        passagens={passagens}
        onResetData={handleResetData}
        onExportCSV={handleExportCSV}
        onDataSynced={loadInitialData}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Guia 1: Ocorrências & Registro */}
        {activeTab === 'ocorrencias' && (
          <div className="space-y-6">
            {/* SEÇÃO 2: Formulário de Registro (Nova Entrada) */}
            <OccurrenceForm onAddOcorrencia={handleAddOcorrencia} />

            {/* SEÇÃO 3: Histórico de Ocorrências */}
            <OccurrenceHistory
              ocorrencias={ocorrencias}
              onDeleteOcorrencia={handleDeleteOcorrencia}
              onUpdateStatus={handleUpdateStatus}
              onUpdateOcorrencia={handleUpdateOcorrencia}
            />
          </div>
        )}

        {/* Guia 2: Dashboard BI & Z-Score Anomaly Engine */}
        {activeTab === 'dashboard' && (
          <AnalyticsDashboard ocorrencias={ocorrencias} />
        )}

        {/* Guia 3: SEÇÃO 4: Passagem de Bastão */}
        {activeTab === 'passagem' && (
          <ShiftPassoverSection
            ocorrencias={ocorrencias}
            passagens={passagens}
            onSavePassagem={handleSavePassagem}
          />
        )}

      </main>

      {/* Footer Corporativo */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500 font-medium">
          <p>
            Diário de Bordo - Supervisão Inside Sales • Sales Ops Intelligence System © {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            Dashboard BI • Integração Supabase PostgreSQL & Exportação para Excel/CSV
          </p>
        </div>
      </footer>

    </div>
  );
}
