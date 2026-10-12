/**
 * @file src/components/OccurrenceHistory.tsx
 * @description SEÇÃO 3: Dashboard e Histórico de Ocorrências & Registros Factuais de Consultores.
 * Apresenta navegação por abas ("Todas", "Operacionais", "Fatos de Consultor", "Dossiê Individual 1-on-1"),
 * tabela responsiva, cartões, filtros avançados e integração completa de feedback.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Ocorrencia, FiltrosOcorrencia, Status, Impacto, Categoria, TipoRegistroOcorrencia, TipoFatoConsultor, StatusFeedback, AuthUser } from '../types';
import { formatBrazilianDate, exportToCSV } from '../utils/statisticalAnalysis';
import { 
  Search, Filter, Trash2, CheckCircle, Edit3, Clock, AlertTriangle, 
  CheckCircle2, AlertCircle, Calendar, User, Tag, ShieldAlert, FileText, 
  LayoutGrid, ListFilter, RotateCcw, X, Download, MessageSquare, PlusCircle,
  History, Send, Eye, ChevronRight, UserCheck, Award, MessageSquareShare, Users
} from 'lucide-react';

import { verifyAdminAuthorization, sanitizeTextInput } from '../utils/security';
import { HIERARQUIA_EQUIPES } from '../data/discountData';
import { ConsultantDossierView } from './ConsultantDossierView';

interface OccurrenceHistoryProps {
  ocorrencias: Ocorrencia[];
  onDeleteOcorrencia: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onUpdateOcorrencia: (updated: Ocorrencia) => void;
  tipoRegistroFiltro?: 'todas' | 'operacional' | 'fato_consultor' | 'dossie';
  onTipoRegistroFiltroChange?: (tipo: 'todas' | 'operacional' | 'fato_consultor' | 'dossie') => void;
  currentUser?: AuthUser | null;
}

export const OccurrenceHistory: React.FC<OccurrenceHistoryProps> = React.memo(({
  ocorrencias,
  onDeleteOcorrencia,
  onUpdateStatus,
  onUpdateOcorrencia,
  tipoRegistroFiltro,
  onTipoRegistroFiltroChange,
  currentUser
}) => {
  // Aba ativa dentro da visualização de histórico:
  // 'todas' | 'operacional' | 'fato_consultor' | 'dossie'
  const [internalSubTab, setInternalSubTab] = useState<'todas' | 'operacional' | 'fato_consultor' | 'dossie'>(
    tipoRegistroFiltro || 'todas'
  );

  React.useEffect(() => {
    if (tipoRegistroFiltro) {
      setInternalSubTab(tipoRegistroFiltro);
    }
  }, [tipoRegistroFiltro]);

  const activeSubTab = tipoRegistroFiltro || internalSubTab;

  const handleSubTabChange = (novaAba: 'todas' | 'operacional' | 'fato_consultor' | 'dossie') => {
    setInternalSubTab(novaAba);
    if (onTipoRegistroFiltroChange) {
      onTipoRegistroFiltroChange(novaAba);
    }
  };
  
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
  
  // Card de Trabalho & Acompanhamento
  const [selectedWorkCard, setSelectedWorkCard] = useState<Ocorrencia | null>(null);
  const [supervisorNovoAndamento, setSupervisorNovoAndamento] = useState<string>('Débora Rodrigues');
  const [novaObservacaoAndamento, setNovaObservacaoAndamento] = useState<string>('');

  const consultoresDisponiveis = HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'] || [];

  const handleAddAndamento = useCallback(() => {
    if (!selectedWorkCard || !novaObservacaoAndamento.trim()) return;

    const timestampISO = new Date().toISOString();
    const novoRegistro = {
      id: `att-${Date.now()}`,
      dataHora: timestampISO,
      supervisor: supervisorNovoAndamento,
      observacao: sanitizeTextInput(novaObservacaoAndamento, 2000),
      statusNoMomento: selectedWorkCard.status,
      impactoNoMomento: selectedWorkCard.impacto
    };

    const historicoAtual = selectedWorkCard.historicoAtualizacoes || [];
    const atualizado: Ocorrencia = {
      ...selectedWorkCard,
      historicoAtualizacoes: [...historicoAtual, novoRegistro]
    };

    setSelectedWorkCard(atualizado);
    onUpdateOcorrencia(atualizado);
    setNovaObservacaoAndamento('');
  }, [selectedWorkCard, novaObservacaoAndamento, supervisorNovoAndamento, onUpdateOcorrencia]);
  
  // State de Filtros
  const [filtros, setFiltros] = useState<FiltrosOcorrencia>({
    busca: '',
    categoria: '',
    impacto: '',
    status: '',
    supervisor: '',
    tipoRegistro: 'todos',
    consultor: '',
    tipoFato: '',
    statusFeedback: ''
  });

  const handleConfirmDelete = useCallback((id: string) => {
    const senhaInput = window.prompt('Confirmação de Segurança: Digite a senha de autorização para excluir este registro:');
    if (verifyAdminAuthorization(senhaInput)) {
      onDeleteOcorrencia(id);
    } else if (senhaInput !== null) {
      alert('Senha incorreta! A exclusão não foi autorizada.');
    }
  }, [onDeleteOcorrencia]);

  const handleResetFiltros = useCallback(() => {
    setFiltros({
      busca: '',
      categoria: '',
      impacto: '',
      status: '',
      supervisor: '',
      tipoRegistro: 'todos',
      consultor: '',
      tipoFato: '',
      statusFeedback: ''
    });
  }, []);

  // Filtragem das ocorrências
  const ocorrenciasFiltradas = useMemo(() => {
    const buscaLower = filtros.busca.trim().toLowerCase();

    return ocorrencias.filter((oc) => {
      // Filtro da Sub-Aba ativa
      if (activeSubTab === 'operacional') {
        const isOp = !oc.tipoRegistro || oc.tipoRegistro === 'operacional';
        if (!isOp) return false;
      } else if (activeSubTab === 'fato_consultor') {
        const isFato = oc.tipoRegistro === 'fato_consultor' || Boolean(oc.consultor);
        if (!isFato) return false;
      }

      // Filtro de Busca
      const matchBusca = 
        !buscaLower ||
        oc.descricao.toLowerCase().includes(buscaLower) ||
        oc.acaoTomada.toLowerCase().includes(buscaLower) ||
        oc.supervisor.toLowerCase().includes(buscaLower) ||
        (oc.consultor && oc.consultor.toLowerCase().includes(buscaLower)) ||
        (oc.tipoFato && oc.tipoFato.toLowerCase().includes(buscaLower));

      const matchCategoria = !filtros.categoria || oc.categoria === filtros.categoria;
      const matchImpacto = !filtros.impacto || oc.impacto === filtros.impacto;
      const matchStatus = !filtros.status || oc.status === filtros.status;
      
      const matchSupervisor = !filtros.supervisor || 
        oc.supervisor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
        filtros.supervisor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Filtros específicos de consultor
      const matchConsultor = !filtros.consultor || (oc.consultor && oc.consultor.toLowerCase() === filtros.consultor.toLowerCase());
      const matchTipoFato = !filtros.tipoFato || oc.tipoFato === filtros.tipoFato;
      const matchStatusFeedback = !filtros.statusFeedback || oc.statusFeedback === filtros.statusFeedback;

      return matchBusca && matchCategoria && matchImpacto && matchStatus && matchSupervisor && matchConsultor && matchTipoFato && matchStatusFeedback;
    });
  }, [ocorrencias, filtros, activeSubTab]);

  // Badges auxiliares para impacto
  const getImpactoBadge = (impacto: Impacto) => {
    switch (impacto) {
      case 'Crítico':
        return (
          <span className="corporate-badge-critico px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Crítico
          </span>
        );
      case 'Médio':
        return (
          <span className="corporate-badge-medio px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Médio
          </span>
        );
      case 'Baixo':
      default:
        return (
          <span className="corporate-badge-baixo px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Baixo
          </span>
        );
    }
  };

  // Badges auxiliares para status
  const getStatusBadge = (status: Status) => {
    switch (status) {
      case 'Resolvido':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Resolvido
          </span>
        );
      case 'Em Análise':
        return (
          <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Em Análise
          </span>
        );
      case 'Pendente':
      default:
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Pendente
          </span>
        );
    }
  };

  // Totais para as abas
  const countOperacional = useMemo(() => ocorrencias.filter(o => !o.tipoRegistro || o.tipoRegistro === 'operacional').length, [ocorrencias]);
  const countFatoConsultor = useMemo(() => ocorrencias.filter(o => o.tipoRegistro === 'fato_consultor' || Boolean(o.consultor)).length, [ocorrencias]);

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8">
      
      {/* Header Principal do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-gray-200 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-primary-green" />
            Ocorrências Operacionais & Registros Factuais
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Acompanhamento centralizado de incidentes da operação e registros por consultor para reuniões de feedback 1-on-1.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Botão de Exportar CSV */}
          <button
            onClick={() => exportToCSV(ocorrenciasFiltradas)}
            className="px-3 py-1.5 bg-[#005b2e] hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Exportar registros visíveis para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          {/* View Mode Toggle (para tabelas e cartões) */}
          {activeSubTab !== 'dossie' && (
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-primary-green shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                Tabela
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-primary-green shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cartões
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Abas de Navegação */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => handleSubTabChange('todas')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'todas'
              ? 'bg-[#005b2e] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Todas ({ocorrencias.length})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('operacional')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'operacional'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Ocorrências Operacionais ({countOperacional})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('fato_consultor')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'fato_consultor'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Fatos de Consultores ({countFatoConsultor})</span>
        </button>

        <button
          onClick={() => handleSubTabChange('dossie')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'dossie'
              ? 'bg-purple-900 text-white shadow-sm ring-2 ring-purple-400'
              : 'text-purple-800 bg-purple-50 hover:bg-purple-100'
          }`}
        >
          <Award className="w-4 h-4 text-purple-300" />
          <span>Dossiê Individual (Ficha 1-on-1)</span>
        </button>
      </div>

      {/* Renderização Condicional: Se aba for 'dossie', renderiza o componente ConsultantDossierView */}
      {activeSubTab === 'dossie' ? (
        <ConsultantDossierView
          ocorrencias={ocorrencias}
          onUpdateOcorrencia={onUpdateOcorrencia}
          currentUser={currentUser}
        />
      ) : (
        <>
          {/* Painel de Filtros */}
          <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 mb-6 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Busca por texto */}
              <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, consultor, ação ou supervisor..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] focus:border-[#005b2e]"
                />
              </div>

              {/* Filtro por Consultor */}
              <div className="w-full sm:w-auto">
                <select
                  value={filtros.consultor || ''}
                  onChange={(e) => setFiltros({ ...filtros, consultor: e.target.value })}
                  className="w-full sm:w-36 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-600 cursor-pointer font-medium"
                >
                  <option value="">Consultor (Todos)</option>
                  {consultoresDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Impacto */}
              <div className="w-full sm:w-auto">
                <select
                  value={filtros.impacto}
                  onChange={(e) => setFiltros({ ...filtros, impacto: e.target.value })}
                  className="w-full sm:w-28 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
                >
                  <option value="">Impacto</option>
                  <option value="Baixo">Baixo</option>
                  <option value="Médio">Médio</option>
                  <option value="Crítico">Crítico</option>
                </select>
              </div>

              {/* Status */}
              <div className="w-full sm:w-auto">
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                  className="w-full sm:w-32 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
                >
                  <option value="">Status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Análise">Em Análise</option>
                  <option value="Resolvido">Resolvido</option>
                </select>
              </div>

              {/* Responsável / Supervisor */}
              <div className="w-full sm:w-auto">
                <select
                  value={filtros.supervisor}
                  onChange={(e) => setFiltros({ ...filtros, supervisor: e.target.value })}
                  className="w-full sm:w-44 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
                >
                  <option value="">Liderança</option>
                  <option value="Heder Santos">Heder Santos (Gerente)</option>
                  <option value="Débora Rodrigues">Débora Rodrigues (Supervisora)</option>
                </select>
              </div>
            </div>

            {/* Limpar Filtros */}
            {(filtros.busca || filtros.categoria || filtros.impacto || filtros.status || filtros.supervisor || filtros.consultor) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleResetFiltros}
                  className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar Filtros Aplicados
                </button>
              </div>
            )}
          </div>

          {/* Lista Vazia */}
          {ocorrenciasFiltradas.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-700">Nenhum registro encontrado</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Ajuste os filtros de pesquisa acima ou registre um novo fato/ocorrência no formulário acima.
              </p>
            </div>
          )}

          {/* Exibição em Tabela */}
          {viewMode === 'table' && ocorrenciasFiltradas.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-[#005b2e] text-white uppercase font-bold tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">Data / Hora</th>
                    <th scope="col" className="px-4 py-3">Tipo / Contexto</th>
                    <th scope="col" className="px-4 py-3">Consultor / Supervisor</th>
                    <th scope="col" className="px-4 py-3">Descrição Factual / Problema</th>
                    <th scope="col" className="px-4 py-3">Impacto</th>
                    <th scope="col" className="px-4 py-3">Ação Tomada</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 font-medium">
                  {ocorrenciasFiltradas.map((oc) => {
                    const isFato = oc.tipoRegistro === 'fato_consultor' || Boolean(oc.consultor);

                    return (
                      <tr key={oc.id} className="hover:bg-emerald-50/50 transition-colors">
                        
                        {/* Data / Hora */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-gray-600 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary-green" />
                            <span>{formatBrazilianDate(oc.dataHora)}</span>
                          </div>
                        </td>

                        {/* Tipo / Contexto */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isFato ? (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-[11px] font-bold border border-purple-200 inline-flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-purple-700" />
                              {oc.tipoFato || 'Fato Consultor'}
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-[11px] font-semibold border border-gray-200">
                              {oc.categoria}
                            </span>
                          )}
                        </td>

                        {/* Consultor / Supervisor & Gestor Registrante */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isFato && oc.consultor ? (
                            <div>
                              <div className="font-bold text-purple-900 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-purple-700" />
                                {oc.consultor}
                              </div>
                              <span className="text-[10px] text-gray-600 block">
                                Reg: <strong className="text-gray-800">{oc.gestorRegistro || oc.supervisor}</strong>
                              </span>
                              {oc.gestorFeedback && oc.statusFeedback === 'Aplicado / Concluído' && (
                                <span className="text-[10px] text-emerald-800 font-semibold block bg-emerald-50 px-1 py-0.5 rounded mt-0.5">
                                  Feed: {oc.gestorFeedback}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-gray-800">{oc.gestorRegistro || oc.supervisor}</div>
                              {oc.dataHoraCriacao && (
                                <span className="text-[10px] text-gray-400 block">{formatBrazilianDate(oc.dataHoraCriacao)}</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Descrição com Hover Box / Popover flutuante */}
                        <td className="px-4 py-3.5 text-gray-800 max-w-xs leading-relaxed relative group cursor-pointer" onClick={() => setSelectedWorkCard(oc)}>
                          <div>
                            <p className="line-clamp-3 font-medium text-gray-800 group-hover:text-emerald-900 transition-colors">{oc.descricao}</p>
                            
                            {/* Badges adicionais */}
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              {oc.historicoAtualizacoes && oc.historicoAtualizacoes.length > 0 && (
                                <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-blue-600" />
                                  {oc.historicoAtualizacoes.length} andamento(s)
                                </span>
                              )}
                              {isFato && oc.statusFeedback && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  oc.statusFeedback === 'Aplicado / Concluído'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : oc.statusFeedback === 'Agendado'
                                    ? 'bg-sky-50 text-sky-800 border-sky-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}>
                                  1-on-1: {oc.statusFeedback}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Popover flutuante */}
                          <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 w-80 sm:w-96 p-4 bg-white rounded-xl shadow-2xl border border-emerald-300 text-xs text-gray-800 pointer-events-none animate-fadeIn transition-all">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 bg-[#005b2e] text-white p-2.5 -mx-4 -mt-4 rounded-t-xl">
                              <span className="font-bold flex items-center gap-1.5 text-xs text-white">
                                <MessageSquare className="w-4 h-4 text-emerald-300" />
                                Detalhes Completos do Registro
                              </span>
                              <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded text-emerald-200 border border-emerald-700">
                                #{oc.id}
                              </span>
                            </div>

                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                              <div>
                                <span className="font-bold text-gray-900 block mb-1">
                                  {isFato ? 'Fato Registrado:' : 'Descrição do Incidente:'}
                                </span>
                                <p className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                                  {oc.descricao}
                                </p>
                              </div>

                              <div>
                                <span className="font-bold text-gray-900 block mb-1">Ação Tomada / Direcionamento:</span>
                                <p className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-gray-700 italic leading-relaxed">
                                  {oc.acaoTomada || 'Nenhuma ação registrada.'}
                                </p>
                              </div>

                              {isFato && oc.observacoesFeedback && (
                                <div>
                                  <span className="font-bold text-purple-900 block mb-1">Combinados do Feedback 1-on-1:</span>
                                  <p className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 text-purple-900 leading-relaxed font-medium">
                                    {oc.observacoesFeedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Impacto */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getImpactoBadge(oc.impacto)}
                        </td>

                        {/* Ação Tomada */}
                        <td className="px-4 py-3.5 text-gray-700 max-w-xs leading-relaxed">
                          <p className="line-clamp-3 italic">{oc.acaoTomada}</p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div>
                            {getStatusBadge(oc.status)}
                            {oc.status === 'Resolvido' && oc.dataHoraConclusao && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Concluído: {formatBrazilianDate(oc.dataHoraConclusao)}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Card de Trabalho */}
                            <button
                              onClick={() => setSelectedWorkCard(oc)}
                              title="Abrir Card de Trabalho e Registrar Andamento"
                              className="px-2.5 py-1 bg-[#005b2e] hover:bg-emerald-800 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Card</span>
                            </button>

                            {/* Resolução Rápida */}
                            {oc.status !== 'Resolvido' && (
                              <button
                                onClick={() => onUpdateStatus(oc.id, 'Resolvido')}
                                title="Marcar como Resolvido / Concluído"
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden xl:inline">Resolver</span>
                              </button>
                            )}

                            {/* Editar Ocorrência */}
                            <button
                              onClick={() => setEditingOcorrencia(oc)}
                              title="Editar Ocorrência"
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Excluir Ocorrência */}
                            <button
                              onClick={() => handleConfirmDelete(oc.id)}
                              title="Excluir Registro (Exige Senha)"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Exibição em Cartões */}
          {viewMode === 'cards' && ocorrenciasFiltradas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ocorrenciasFiltradas.map((oc) => {
                const isFato = oc.tipoRegistro === 'fato_consultor' || Boolean(oc.consultor);

                return (
                  <div
                    key={oc.id}
                    className={`corporate-card p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative ${
                      isFato ? 'border-l-4 border-l-purple-600' : 'border-l-4 border-l-[#005b2e]'
                    }`}
                  >
                    <div>
                      {/* Header do Card */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary-green" />
                          {formatBrazilianDate(oc.dataHora)}
                        </span>
                        {getImpactoBadge(oc.impacto)}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        {isFato && oc.consultor ? (
                          <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                            {oc.consultor}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-emerald-700" />
                            {oc.supervisor}
                          </span>
                        )}

                        <div className="text-right">
                          {getStatusBadge(oc.status)}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded mb-1 ${
                          isFato ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isFato ? (oc.tipoFato || 'Fato Consultor') : oc.categoria}
                        </span>
                        <p className="text-xs text-gray-800 font-medium leading-relaxed">
                          {oc.descricao}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100 mb-3 text-xs">
                        <span className="font-bold text-gray-700 block mb-0.5">Ação Tomada / Direcionamento:</span>
                        <span className="text-gray-600 italic leading-relaxed">{oc.acaoTomada}</span>
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-[11px] text-gray-400 font-mono">
                        ID: #{oc.id}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setSelectedWorkCard(oc)}
                          className="px-2 py-1 bg-[#005b2e] hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Abrir Card de Trabalho"
                        >
                          <FileText className="w-3 h-3" />
                          Card
                        </button>
                        {oc.status !== 'Resolvido' && (
                          <button
                            onClick={() => onUpdateStatus(oc.id, 'Resolvido')}
                            className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Resolver
                          </button>
                        )}
                        <button
                          onClick={() => setEditingOcorrencia(oc)}
                          className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(oc.id)}
                          title="Excluir Registro (Exige Senha)"
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL DO CARD DE TRABALHO E REGISTRO DE ANDAMENTO */}
      {selectedWorkCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 my-auto overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header do Card de Trabalho */}
            <div className="bg-[#005b2e] text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-800 rounded-xl border border-emerald-700 shadow-inner">
                  <FileText className="w-6 h-6 text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      Card de Trabalho - Acompanhamento do Registro
                    </h3>
                    <span className="text-xs font-mono bg-emerald-950/80 px-2 py-0.5 rounded text-emerald-300 border border-emerald-700">
                      #{selectedWorkCard.id}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                    Histórico cronológico de andamentos, diligências e acompanhamento de feedback
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkCard(null)}
                className="p-2 hover:bg-emerald-800 rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
                title="Fechar Card de Trabalho"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Central Scrollável */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 divide-y divide-gray-100 flex-1">
              
              {/* Informações Principais */}
              <div className="space-y-3 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Abertura:</span>
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5 text-primary-green" />
                      {formatBrazilianDate(selectedWorkCard.dataHora)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getImpactoBadge(selectedWorkCard.impacto)}
                    {getStatusBadge(selectedWorkCard.status)}
                  </div>
                </div>

                {/* Consultor / Supervisor */}
                {selectedWorkCard.consultor && (
                  <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-purple-700" />
                      Consultor Envolvido: {selectedWorkCard.consultor}
                    </span>
                    {selectedWorkCard.tipoFato && (
                      <span className="text-xs font-semibold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {selectedWorkCard.tipoFato}
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">Descrição / Fato:</span>
                  <div className="text-sm bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-gray-800 leading-relaxed font-medium">
                    {selectedWorkCard.descricao}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">Ação de Solução / Contingência:</span>
                  <div className="text-xs bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-gray-700 italic leading-relaxed">
                    {selectedWorkCard.acaoTomada}
                  </div>
                </div>
              </div>

              {/* Linha do Tempo de Andamentos */}
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-primary-green" />
                  Histórico de Diligências & Andamentos ({selectedWorkCard.historicoAtualizacoes?.length || 0})
                </h4>

                {(!selectedWorkCard.historicoAtualizacoes || selectedWorkCard.historicoAtualizacoes.length === 0) ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                    Nenhum andamento registrado até o momento. Adicione a primeira atualização abaixo.
                  </div>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l-2 border-emerald-200">
                    {selectedWorkCard.historicoAtualizacoes.map((item, idx) => (
                      <div key={item.id || idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1 relative">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                          <span className="flex items-center gap-1 text-primary-green">
                            <User className="w-3.5 h-3.5" />
                            {item.supervisor}
                          </span>
                          <span className="font-mono text-gray-400">
                            {formatBrazilianDate(item.dataHora)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 font-medium leading-relaxed">
                          {item.observacao}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulário para Adicionar Novo Andamento */}
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-primary-green" />
                  Registrar Novo Andamento no Card
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Supervisor / Líder</label>
                    <input
                      type="text"
                      value={supervisorNovoAndamento}
                      onChange={(e) => setSupervisorNovoAndamento(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Observação do Andamento</label>
                  <textarea
                    rows={2}
                    value={novaObservacaoAndamento}
                    onChange={(e) => setNovaObservacaoAndamento(e.target.value)}
                    placeholder="Descreva a ação de acompanhamento, contato com TI, retorno de consultor..."
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] text-gray-800"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddAndamento}
                    disabled={!novaObservacaoAndamento.trim()}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      novaObservacaoAndamento.trim()
                        ? 'bg-[#005b2e] hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Adicionar Andamento
                  </button>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Status atual: <strong className="text-gray-800">{selectedWorkCard.status}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedWorkCard(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Fechar Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE OCORRÊNCIA */}
      {editingOcorrencia && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-gray-200 overflow-hidden">
            <div className="bg-[#005b2e] text-white p-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-200" />
                Editar Registro #{editingOcorrencia.id}
              </h3>
              <button
                onClick={() => setEditingOcorrencia(null)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateOcorrencia(editingOcorrencia);
                setEditingOcorrencia(null);
              }}
              className="p-5 space-y-4"
            >
              {/* Consultor se for Fato */}
              {editingOcorrencia.consultor && (
                <div>
                  <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Consultor Envolvido</label>
                  <select
                    value={editingOcorrencia.consultor}
                    onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, consultor: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-purple-50 border border-purple-300 rounded-lg font-bold text-gray-800"
                  >
                    {consultoresDisponiveis.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={editingOcorrencia.descricao}
                  onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, descricao: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Impacto</label>
                  <select
                    value={editingOcorrencia.impacto}
                    onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, impacto: e.target.value as Impacto })}
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    <option value="Baixo">Baixo</option>
                    <option value="Médio">Médio</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={editingOcorrencia.status}
                    onChange={(e) => {
                      const newSt = e.target.value as Status;
                      const isRes = newSt === 'Resolvido';
                      setEditingOcorrencia({
                        ...editingOcorrencia,
                        status: newSt,
                        dataHoraConclusao: isRes ? (editingOcorrencia.dataHoraConclusao || new Date().toISOString()) : undefined
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border rounded-lg font-semibold"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Resolvido">Resolvido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ação Tomada / Direcionamento</label>
                <textarea
                  rows={2}
                  value={editingOcorrencia.acaoTomada}
                  onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, acaoTomada: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>

              {/* Status do Feedback se for Fato de Consultor */}
              {editingOcorrencia.consultor && (
                <div>
                  <label className="block text-xs font-bold text-purple-900 uppercase mb-1">Status Feedback 1-on-1</label>
                  <select
                    value={editingOcorrencia.statusFeedback || 'Não Aplicado'}
                    onChange={(e) => setEditingOcorrencia({
                      ...editingOcorrencia,
                      statusFeedback: e.target.value as StatusFeedback
                    })}
                    className="w-full px-3 py-2 text-xs border rounded-lg font-bold text-purple-900 bg-purple-50"
                  >
                    <option value="Não Aplicado">Não Aplicado</option>
                    <option value="Agendado">Agendado</option>
                    <option value="Aplicado / Concluído">Aplicado / Concluído</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingOcorrencia(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#005b2e] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
});
