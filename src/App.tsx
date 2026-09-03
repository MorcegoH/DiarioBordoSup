/**
 * @file src/App.tsx
 * @description Componente Principal da aplicação "Diário de Bordo - Supervisão Inside Sales".
 * Integra persistência em Supabase com fallback gracioso em LocalStorage.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ocorrencia, ResumoPassagem, Status, AuthUser } from './types';
import { INITIAL_MOCK_OCORRENCIAS, INITIAL_MOCK_PASSAGENS } from './data/mockData';
import { dbService } from './services/dbService';
import { discountService } from './services/discountService';
import { authService } from './services/authService';
import { LoginScreen } from './components/auth/LoginScreen';
import { Header } from './components/Header';
import { OccurrenceForm } from './components/OccurrenceForm';
import { OccurrenceHistory } from './components/OccurrenceHistory';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ShiftPassoverSection } from './components/ShiftPassoverSection';
import { DiscountRequestsSection } from './components/DiscountRequestsSection';
import { InspectionRequestsSection } from './components/InspectionRequestsSection';
import { inspectionService } from './services/inspectionService';
import { exportToCSV, exportPassagensToCSV } from './utils/statisticalAnalysis';
import { exportarDescontosCSV } from './data/discountData';
import { exportarVistoriasCSV } from './utils/csvInspectionExport';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'ocorrencias' | 'dashboard' | 'passagem' | 'descontos' | 'vistoria'>('ocorrencias');
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(INITIAL_MOCK_OCORRENCIAS);
  const [passagens, setPassagens] = useState<ResumoPassagem[]>(INITIAL_MOCK_PASSAGENS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Handler de Logout
  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
  }, []);

  // Monitoramento de inatividade: encerra sessão automaticamente após 10 minutos
  useInactivityTimeout({
    user: currentUser,
    onTimeoutLogout: handleLogout
  });

  // Inicializar credenciais e serviços de autenticação com listener de estado
  useEffect(() => {
    authService.init();
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handler de Sucesso de Login
  const handleLoginSuccess = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'apoio') {
      setActiveTab('vistoria');
    }
  }, []);

  // Restrição de acesso estrita para a função de Apoio à Supervisão (apenas Vistoria e Dashboard BI)
  useEffect(() => {
    if (currentUser?.role === 'apoio') {
      if (activeTab !== 'vistoria' && activeTab !== 'dashboard') {
        setActiveTab('vistoria');
      }
    }
  }, [currentUser, activeTab]);

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

  // Monitoramento de conexão em tempo real: sincroniza automaticamente ao reconectar
  const { isOnline, wasOffline } = useNetworkStatus({
    onReconnect: loadInitialData
  });

  // Handlers sincronizados com o dbService
  const handleAddOcorrencia = useCallback(async (nova: Ocorrencia) => {
    setOcorrencias((prev) => [nova, ...prev]);
    return await dbService.addOcorrencia(nova);
  }, []);

  const handleDeleteOcorrencia = useCallback(async (id: string) => {
    setOcorrencias((prev) => prev.filter((o) => o.id !== id));
    return await dbService.deleteOcorrencia(id);
  }, []);

  const handleUpdateStatus = useCallback(async (id: string, newStatus: Status) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    return await dbService.updateStatusOcorrencia(id, newStatus);
  }, []);

  const handleUpdateOcorrencia = useCallback(async (updated: Ocorrencia) => {
    setOcorrencias((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    return await dbService.updateOcorrencia(updated);
  }, []);

  const handleSavePassagem = useCallback(async (novaPassagem: ResumoPassagem) => {
    setPassagens((prev) => [novaPassagem, ...prev]);
    return await dbService.addPassagem(novaPassagem);
  }, []);

  const handleUpdatePassagem = useCallback(async (updated: ResumoPassagem) => {
    setPassagens((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    return await dbService.updatePassagem(updated);
  }, []);

  const handleUpdatePassagemStatus = useCallback(async (
    id: string, 
    newStatus: 'Pendente' | 'Concluído',
    observacaoConclusao?: string,
    responsavelConclusao?: string
  ) => {
    const isConcluido = newStatus === 'Concluído';
    const conclDate = isConcluido ? new Date().toISOString() : undefined;
    setPassagens((prev) =>
      prev.map((p) => (p.id === id ? { 
        ...p, 
        status: newStatus, 
        dataHoraConclusao: conclDate,
        observacaoConclusao: isConcluido ? observacaoConclusao : undefined,
        responsavelConclusao: isConcluido ? responsavelConclusao : undefined
      } : p))
    );
    return await dbService.updateStatusPassagem(id, newStatus, conclDate, observacaoConclusao, responsavelConclusao);
  }, []);

  const handleDeletePassagem = useCallback(async (id: string) => {
    setPassagens((prev) => prev.filter((p) => p.id !== id));
    return await dbService.deletePassagem(id);
  }, []);

  const handleAddComentarioPassagem = useCallback(async (passagemId: string, comentario: any) => {
    setPassagens((prev) =>
      prev.map((p) => {
        if (p.id === passagemId) {
          return {
            ...p,
            comentarios: [...(p.comentarios || []), comentario]
          };
        }
        return p;
      })
    );
    return await dbService.addComentarioPassagem(passagemId, comentario);
  }, []);

  // ARQUITETURA REFATORADA: Exportação Inteligente de CSV Contextual baseada na aba ativa
  const handleExportCSV = useCallback(() => {
    if (activeTab === 'vistoria') {
      const vistorias = inspectionService.getVistorias();
      exportarVistoriasCSV(vistorias);
    } else if (activeTab === 'descontos') {
      const descontos = discountService.getSolicitacoes();
      exportarDescontosCSV(descontos);
    } else if (activeTab === 'passagem') {
      exportPassagensToCSV(passagens);
    } else {
      // 'ocorrencias' ou 'dashboard'
      exportToCSV(ocorrencias);
    }
  }, [activeTab, ocorrencias, passagens]);

  const totalCriticos = useMemo(() => {
    let count = 0;
    for (let i = 0; i < ocorrencias.length; i++) {
      if (ocorrencias[i].impacto === 'Crítico' && ocorrencias[i].status !== 'Resolvido') {
        count++;
      }
    }
    return count;
  }, [ocorrencias]);

  // Se não houver usuário logado, apresenta a tela de Login com identificação
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-[#333333] flex flex-col font-sans transition-colors duration-200">
      
      {/* SEÇÃO 1: Cabeçalho com logo, título, status do Supabase e Perfil do Usuário */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalOcorrencias={ocorrencias.length}
        totalCriticos={totalCriticos}
        ocorrencias={ocorrencias}
        passagens={passagens}
        onExportCSV={handleExportCSV}
        onDataSynced={loadInitialData}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-grow w-full max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 pb-24 md:pb-8">
        
        {/* Banner de Contingência de Rede (Offline) */}
        {!isOnline && (
          <div className="mb-5 p-3.5 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-lg text-amber-900 flex items-center justify-between text-xs sm:text-sm shadow-sm animate-pulse">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Modo Offline Ativo:</strong> Sem conexão com a internet detectada. Os dados continuam sendo salvos de forma segura e resiliente na memória local do seu navegador e serão sincronizados com a nuvem assim que a rede retornar.
              </span>
            </div>
            <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-bold rounded uppercase tracking-wider whitespace-nowrap">
              Offline
            </span>
          </div>
        )}

        {/* Notificação de Reconexão Bem-Sucedida */}
        {isOnline && wasOffline && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border-l-4 border-emerald-600 rounded-r-lg text-emerald-900 flex items-center justify-between text-xs sm:text-sm shadow-sm">
            <div className="flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Conexão Restabelecida:</strong> O acesso à rede voltou ao normal. A sincronização automática com o Supabase foi reativada.
              </span>
            </div>
            <button
              onClick={() => loadInitialData()}
              className="ml-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sincronizar</span>
            </button>
          </div>
        )}

        {/* Guia 1: Ocorrências & Registro (Apenas para Gestão e Supervisão) */}
        {activeTab === 'ocorrencias' && currentUser.role !== 'apoio' && (
          <div className="space-y-4 sm:space-y-6">
            {/* SEÇÃO 2: Formulário de Registro (Nova Entrada) */}
            <OccurrenceForm 
              onAddOcorrencia={handleAddOcorrencia} 
              defaultSupervisor={currentUser.name}
            />

            {/* SEÇÃO 3: Histórico de Ocorrências */}
            <OccurrenceHistory
              ocorrencias={ocorrencias}
              onDeleteOcorrencia={handleDeleteOcorrencia}
              onUpdateStatus={handleUpdateStatus}
              onUpdateOcorrencia={handleUpdateOcorrencia}
            />
          </div>
        )}

        {/* Guia 2: Solicitações de Desconto & Governança de Inside Sales (Apenas Gestão e Supervisão) */}
        {activeTab === 'descontos' && currentUser.role !== 'apoio' && (
          <DiscountRequestsSection currentUser={currentUser} />
        )}

        {/* Guia 3: Solicitações de Vistoria & Gestão Danilo e Lucas (Liberado para Apoio, Supervisão e Gerência) */}
        {activeTab === 'vistoria' && (
          <InspectionRequestsSection currentUser={currentUser} />
        )}

        {/* Guia 4: Dashboard BI & Z-Score Anomaly Engine (Liberado para Apoio, Supervisão e Gerência) */}
        {activeTab === 'dashboard' && (
          <AnalyticsDashboard ocorrencias={ocorrencias} />
        )}

        {/* Guia 5: SEÇÃO 5: Passagem de Bastão (Apenas Gestão e Supervisão) */}
        {activeTab === 'passagem' && currentUser.role !== 'apoio' && (
          <ShiftPassoverSection
            ocorrencias={ocorrencias}
            passagens={passagens}
            onSavePassagem={handleSavePassagem}
            onUpdatePassagem={handleUpdatePassagem}
            onUpdateStatusPassagem={handleUpdatePassagemStatus}
            onDeletePassagem={handleDeletePassagem}
            onAddComentarioPassagem={handleAddComentarioPassagem}
            defaultSupervisor={currentUser.name}
          />
        )}

      </main>

      {/* Barra de Navegação Inferior Fixa Mobile (Estilo App Nativo) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg px-2 py-1.5 pb-safe flex items-center justify-around">
        {currentUser.role === 'apoio' ? (
          <>
            <button
              onClick={() => {
                setActiveTab('vistoria');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'vistoria'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'vistoria' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2zM9 15h6M7 11h10" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">Vistorias</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'dashboard'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">Dashboard BI</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setActiveTab('ocorrencias');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'ocorrencias'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'ocorrencias' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">Ocorrências</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('descontos');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'descontos'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'descontos' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">Descontos</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vistoria');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'vistoria'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'vistoria' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2zM9 15h6M7 11h10" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">Vistorias</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'dashboard'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">BI & Métricas</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('passagem');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                activeTab === 'passagem'
                  ? 'text-[#005b2e] font-bold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`p-1 rounded-lg ${activeTab === 'passagem' ? 'bg-emerald-100 text-[#005b2e]' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="text-[10px] tracking-tight mt-0.5">Turno</span>
            </button>
          </>
        )}
      </div>

      {/* Footer Corporativo */}
      <footer className="hidden md:block bg-white dark:bg-[#1a1b1e] border-t border-gray-200 dark:border-[#2b2e36] mt-12 py-4 transition-colors duration-200">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
          <p>
            Diário de Bordo - Supervisão Inside Sales • Sales Ops Intelligence System © {new Date().getFullYear()}
          </p>
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            Dashboard BI • Integração Supabase PostgreSQL & Exportação para Excel/CSV
          </p>
        </div>
      </footer>

    </div>
  );
}
