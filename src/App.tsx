/**
 * @file src/App.tsx
 * @description Componente Principal da aplicação "Diário de Bordo - Supervisão Inside Sales".
 * Integra persistência em Supabase com fallback gracioso em LocalStorage.
 */

import React, { useState, useEffect } from 'react';
import { Ocorrencia, ResumoPassagem, Status } from './types';
import { INITIAL_MOCK_OCORRENCIAS, INITIAL_MOCK_PASSAGENS } from './data/mockData';
import { dbService } from './services/dbService';
import { Header } from './components/Header';
import { OccurrenceForm } from './components/OccurrenceForm';
import { OccurrenceHistory } from './components/OccurrenceHistory';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ShiftPassoverSection } from './components/ShiftPassoverSection';
import { exportToCSV } from './utils/statisticalAnalysis';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ocorrencias' | 'dashboard' | 'passagem'>('ocorrencias');
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(INITIAL_MOCK_OCORRENCIAS);
  const [passagens, setPassagens] = useState<ResumoPassagem[]>(INITIAL_MOCK_PASSAGENS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carrega os dados iniciais do Supabase ou do LocalStorage
  const loadInitialData = async () => {
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
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handlers sincronizados com o dbService
  const handleAddOcorrencia = async (nova: Ocorrencia) => {
    setOcorrencias((prev) => [nova, ...prev]);
    await dbService.addOcorrencia(nova);
  };

  const handleDeleteOcorrencia = async (id: string) => {
    setOcorrencias((prev) => prev.filter((o) => o.id !== id));
    await dbService.deleteOcorrencia(id);
  };

  const handleUpdateStatus = async (id: string, newStatus: Status) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    await dbService.updateStatusOcorrencia(id, newStatus);
  };

  const handleUpdateOcorrencia = async (updated: Ocorrencia) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    await dbService.updateOcorrencia(updated);
  };

  const handleSavePassagem = async (novaPassagem: ResumoPassagem) => {
    setPassagens((prev) => [novaPassagem, ...prev]);
    await dbService.addPassagem(novaPassagem);
  };

  const handleResetData = () => {
    if (window.confirm('Deseja restaurar os dados de exemplo padrão?')) {
      setOcorrencias(INITIAL_MOCK_OCORRENCIAS);
      setPassagens(INITIAL_MOCK_PASSAGENS);
      localStorage.setItem('diario_bordo_ocorrencias_v1', JSON.stringify(INITIAL_MOCK_OCORRENCIAS));
      localStorage.setItem('diario_bordo_passagens_v1', JSON.stringify(INITIAL_MOCK_PASSAGENS));
    }
  };

  const handleExportCSV = () => {
    exportToCSV(ocorrencias);
  };

  const totalCriticos = ocorrencias.filter((o) => o.impacto === 'Crítico' && o.status !== 'Resolvido').length;

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
