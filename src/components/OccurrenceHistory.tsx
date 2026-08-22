/**
 * @file src/components/OccurrenceHistory.tsx
 * @description SEÇÃO 3: Dashboard e Histórico de Ocorrências Registradas.
 * Apresenta tabela responsiva e cartões com badges coloridas, ações de edição, alteração de status e exclusão.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Ocorrencia, FiltrosOcorrencia, Status, Impacto, Categoria } from '../types';
import { formatBrazilianDate, exportToCSV } from '../utils/statisticalAnalysis';
import { 
  Search, Filter, Trash2, CheckCircle, Edit3, Clock, AlertTriangle, 
  CheckCircle2, AlertCircle, Calendar, User, Tag, ShieldAlert, FileText, 
  LayoutGrid, ListFilter, RotateCcw, X, Download, MessageSquare, PlusCircle,
  History, Send, Eye, ChevronRight
} from 'lucide-react';

import { verifyAdminAuthorization, sanitizeTextInput } from '../utils/security';

interface OccurrenceHistoryProps {
  ocorrencias: Ocorrencia[];
  onDeleteOcorrencia: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onUpdateOcorrencia: (updated: Ocorrencia) => void;
}

export const OccurrenceHistory: React.FC<OccurrenceHistoryProps> = React.memo(({
  ocorrencias,
  onDeleteOcorrencia,
  onUpdateStatus,
  onUpdateOcorrencia
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
  
  // Card de Trabalho & Acompanhamento
  const [selectedWorkCard, setSelectedWorkCard] = useState<Ocorrencia | null>(null);
  const [supervisorNovoAndamento, setSupervisorNovoAndamento] = useState<string>('Debora Rodrigues');
  const [novaObservacaoAndamento, setNovaObservacaoAndamento] = useState<string>('');

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
    setNovaObservacaoAndamento('');
  }, [selectedWorkCard, novaObservacaoAndamento, supervisorNovoAndamento]);
  
  // State de Filtros
  const [filtros, setFiltros] = useState<FiltrosOcorrencia>({
    busca: '',
    categoria: '',
    impacto: '',
    status: '',
    supervisor: ''
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
      supervisor: ''
    });
  }, []);
  const ocorrenciasFiltradas = useMemo(() => {
    const buscaLower = filtros.busca.trim().toLowerCase();

    return ocorrencias.filter((oc) => {
      const matchBusca = 
        !buscaLower ||
        oc.descricao.toLowerCase().includes(buscaLower) ||
        oc.acaoTomada.toLowerCase().includes(buscaLower) ||
        oc.supervisor.toLowerCase().includes(buscaLower);

      const matchCategoria = !filtros.categoria || oc.categoria === filtros.categoria;
      const matchImpacto = !filtros.impacto || oc.impacto === filtros.impacto;
      const matchStatus = !filtros.status || oc.status === filtros.status;
      const matchSupervisor = !filtros.supervisor || oc.supervisor === filtros.supervisor;

      return matchBusca && matchCategoria && matchImpacto && matchStatus && matchSupervisor;
    });
  }, [ocorrencias, filtros]);

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

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8">
      
      {/* Header do Histórico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-5 border-b border-gray-200 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-primary-green" />
            Histórico e Registros de Ocorrências
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Gestão centralizada dos incidentes do diário de bordo ({ocorrenciasFiltradas.length} de {ocorrencias.length} registros)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Botão de Exportar CSV */}
          <button
            onClick={() => exportToCSV(ocorrenciasFiltradas)}
            className="px-3 py-1.5 bg-[#005b2e] hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            title="Exportar registros visíveis para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white text-primary-green shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-white text-primary-green shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cartões
            </button>
          </div>
        </div>
      </div>

      {/* Painel de Filtros Compactos e Proporcionais */}
      <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 mb-6 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar ocorrência ou palavra-chave..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] focus:border-[#005b2e]"
            />
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
              className="w-full sm:w-48 px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
            >
              <option value="">Liderança</option>
              <option value="Heder Santos">Heder Santos (Gerente)</option>
              <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
            </select>
          </div>
        </div>

        {/* Limpar Filtros */}
        {(filtros.busca || filtros.categoria || filtros.impacto || filtros.status || filtros.supervisor) && (
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
          <h3 className="text-sm font-bold text-gray-700">Nenhuma ocorrência encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            Ajuste os filtros de pesquisa acima ou registre um novo incidente na Seção 2.
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
                <th scope="col" className="px-4 py-3">Supervisor</th>
                <th scope="col" className="px-4 py-3">Categoria</th>
                <th scope="col" className="px-4 py-3">Descrição da Ocorrência</th>
                <th scope="col" className="px-4 py-3">Impacto</th>
                <th scope="col" className="px-4 py-3">Ação Tomada</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 font-medium">
              {ocorrenciasFiltradas.map((oc) => (
                <tr key={oc.id} className="hover:bg-emerald-50/50 transition-colors">
                  
                  {/* Data / Hora */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-gray-600 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary-green" />
                      <span>{formatBrazilianDate(oc.dataHora)}</span>
                    </div>
                  </td>

                  {/* Supervisor */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-bold text-gray-800">{oc.supervisor}</div>
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-[11px] font-semibold border border-gray-200">
                      {oc.categoria}
                    </span>
                  </td>

                  {/* Descrição com Hover Box / Popover flutuante e Badge de Andamentos */}
                  <td className="px-4 py-3.5 text-gray-800 max-w-xs leading-relaxed relative group cursor-pointer" onClick={() => setSelectedWorkCard(oc)}>
                    <div>
                      <p className="line-clamp-3 font-medium text-gray-800 group-hover:text-emerald-900 transition-colors">{oc.descricao}</p>
                      
                      {/* Badge de andamentos cadastrados se existirem */}
                      {oc.historicoAtualizacoes && oc.historicoAtualizacoes.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 w-fit">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span>{oc.historicoAtualizacoes.length} andamento(s)</span>
                        </div>
                      )}
                    </div>

                    {/* CAIXA DE MENSAGEM / TOOLTIP FLUTUANTE AO PASSAR O MOUSE */}
                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-50 w-80 sm:w-96 p-4 bg-white rounded-xl shadow-2xl border border-emerald-300 text-xs text-gray-800 pointer-events-none animate-fadeIn transition-all">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 bg-[#005b2e] text-white p-2.5 -mx-4 -mt-4 rounded-t-xl">
                        <span className="font-bold flex items-center gap-1.5 text-xs text-white">
                          <MessageSquare className="w-4 h-4 text-emerald-300" />
                          Descrição Completa da Ocorrência
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded text-emerald-200 border border-emerald-700">
                          #{oc.id}
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                        <div>
                          <span className="font-bold text-gray-900 block mb-1">Descrição do Incidente:</span>
                          <p className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                            {oc.descricao}
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-gray-900 block mb-1">Ação de Solução Inicial:</span>
                          <p className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-gray-700 italic leading-relaxed">
                            {oc.acaoTomada || 'Nenhuma ação de contingência registrada.'}
                          </p>
                        </div>

                        {/* Exibir o último andamento de progresso se houver */}
                        {oc.historicoAtualizacoes && oc.historicoAtualizacoes.length > 0 && (
                          <div className="bg-blue-50/90 p-2.5 rounded-lg border border-blue-200 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-blue-700" />
                                Último Andamento
                              </span>
                              <span className="text-blue-800 font-semibold">{oc.historicoAtualizacoes[oc.historicoAtualizacoes.length - 1].supervisor}</span>
                            </div>
                            <p className="text-blue-950 font-medium leading-relaxed">
                              "{oc.historicoAtualizacoes[oc.historicoAtualizacoes.length - 1].observacao}"
                            </p>
                            <span className="text-[10px] font-mono text-blue-700 block text-right">
                              {formatBrazilianDate(oc.historicoAtualizacoes[oc.historicoAtualizacoes.length - 1].dataHora)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                        <span>💡 Clique para abrir o Card de Trabalho</span>
                        <span className="text-gray-400">Clique na linha</span>
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
                      {oc.duracaoMinutos && oc.duracaoMinutos > 0 ? (
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Tempo: {oc.duracaoMinutos >= 60 ? `${(oc.duracaoMinutos / 60).toFixed(1)}h` : `${oc.duracaoMinutos} min`}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      
                      {/* Botão Card de Trabalho e Acompanhamento */}
                      <button
                        onClick={() => setSelectedWorkCard(oc)}
                        title="Abrir Card de Trabalho e Registrar Andamento"
                        className="px-2.5 py-1 bg-[#005b2e] hover:bg-emerald-800 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Card de Trabalho</span>
                      </button>

                      {/* Botão de Resolução Rápida */}
                      {oc.status !== 'Resolvido' && (
                        <button
                          onClick={() => onUpdateStatus(oc.id, 'Resolvido')}
                          title="Marcar como Resolvido"
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Botão Editar */}
                      <button
                        onClick={() => setEditingOcorrencia(oc)}
                        title="Editar Ocorrência"
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Botão Excluir */}
                      <button
                        onClick={() => handleConfirmDelete(oc.id)}
                        title="Excluir Ocorrência (Exige Senha)"
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exibição em Cartões (Cards Grid) */}
      {viewMode === 'cards' && ocorrenciasFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ocorrenciasFiltradas.map((oc) => (
            <div 
              key={oc.id} 
              className={`p-4 rounded-lg border transition-all hover:shadow-md flex flex-col justify-between ${
                oc.impacto === 'Crítico'
                  ? 'bg-red-50/30 border-red-200'
                  : oc.impacto === 'Médio'
                  ? 'bg-amber-50/20 border-amber-200'
                  : 'bg-white border-gray-200'
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
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    {oc.supervisor}
                  </span>
                  <div className="text-right">
                    {getStatusBadge(oc.status)}
                    {oc.status === 'Resolvido' && oc.dataHoraConclusao && (
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        Resolvido: {formatBrazilianDate(oc.dataHoraConclusao)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 rounded mb-1">
                    {oc.categoria}
                  </span>
                  <p className="text-xs text-gray-800 font-medium leading-relaxed">
                    {oc.descricao}
                  </p>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100 mb-3 text-xs">
                  <span className="font-bold text-gray-700 block mb-0.5">Ação Tomada:</span>
                  <span className="text-gray-600 italic leading-relaxed">{oc.acaoTomada}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="text-[11px] text-gray-400 font-mono">
                  ID: #{oc.id}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setSelectedWorkCard(oc)}
                    className="px-2 py-1 bg-[#005b2e] hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                    title="Abrir Card de Trabalho"
                  >
                    <FileText className="w-3 h-3" />
                    Card
                  </button>
                  {oc.status !== 'Resolvido' && (
                    <button
                      onClick={() => onUpdateStatus(oc.id, 'Resolvido')}
                      className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Resolver
                    </button>
                  )}
                  <button
                    onClick={() => setEditingOcorrencia(oc)}
                    className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(oc.id)}
                    title="Excluir Ocorrência (Exige Senha)"
                    className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
                      Card de Trabalho - Acompanhamento do Incidente
                    </h3>
                    <span className="text-xs bg-emerald-950/80 text-emerald-200 font-mono px-2 py-0.5 rounded border border-emerald-700">
                      #{selectedWorkCard.id}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/90 font-medium mt-0.5">
                    Abertura: {formatBrazilianDate(selectedWorkCard.dataHora)} por {selectedWorkCard.supervisor}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedWorkCard(null)}
                className="p-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body do Card de Trabalho */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              
              {/* Banner de Categoria, Impacto e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 items-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Categoria:</span>
                  <span className="font-bold text-gray-800 bg-white px-2.5 py-1 rounded border border-gray-200 inline-block">
                    {selectedWorkCard.categoria}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Atualizar Impacto:</span>
                  <select
                    value={selectedWorkCard.impacto}
                    onChange={(e) => setSelectedWorkCard({
                      ...selectedWorkCard,
                      impacto: e.target.value as Impacto
                    })}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-xs w-full focus:ring-1 focus:ring-[#005b2e]"
                  >
                    <option value="Baixo">🟢 Baixo</option>
                    <option value="Médio">🟡 Médio</option>
                    <option value="Crítico">🔴 Crítico</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Atualizar Status:</span>
                  <select
                    value={selectedWorkCard.status}
                    onChange={(e) => {
                      const newSt = e.target.value as Status;
                      const isRes = newSt === 'Resolvido';
                      setSelectedWorkCard({
                        ...selectedWorkCard,
                        status: newSt,
                        dataHoraConclusao: isRes ? (selectedWorkCard.dataHoraConclusao || new Date().toISOString()) : undefined
                      });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-xs w-full focus:ring-1 focus:ring-[#005b2e]"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Resolvido">Resolvido</option>
                  </select>
                </div>
              </div>

              {/* Descrição Completa e Ação de Solução */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-gray-800 text-xs block mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-primary-green" />
                    Descrição Completa da Ocorrência:
                  </label>
                  <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                    {selectedWorkCard.descricao}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-800 text-xs block mb-1 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                    Ação de Solução / Contingência Cadastrada:
                  </label>
                  <textarea
                    rows={2}
                    value={selectedWorkCard.acaoTomada}
                    onChange={(e) => setSelectedWorkCard({
                      ...selectedWorkCard,
                      acaoTomada: e.target.value
                    })}
                    placeholder="Digite a ação de contorno ou solução adotada..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-[#005b2e] focus:border-[#005b2e] bg-white"
                  />
                </div>
              </div>

              {/* Formulário: Novo Registro de Andamento (com Data e Hora exatas) */}
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-blue-700" />
                    Registrar Novo Andamento de Trabalho
                  </h4>
                  <span className="text-[11px] text-blue-800 font-mono font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                    Registra Data & Horário Automaticamente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">Supervisor que Registra:</label>
                    <select
                      value={supervisorNovoAndamento}
                      onChange={(e) => setSupervisorNovoAndamento(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="Heder Santos">Heder Santos (Gerente)</option>
                      <option value="Debora Rodrigues">Debora Rodrigues</option>
                      <option value="Marilia Farias">Marilia Farias</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-blue-900 mb-1">Observações de Progresso / Acompanhamento:</label>
                    <textarea
                      rows={2}
                      value={novaObservacaoAndamento}
                      onChange={(e) => setNovaObservacaoAndamento(e.target.value)}
                      placeholder="Ex: Entrei em contato com a equipe técnica do CRM e o chamado #10293 foi aberto com prioridade alta..."
                      className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs text-gray-800 focus:ring-1 focus:ring-blue-600 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddAndamento}
                    disabled={!novaObservacaoAndamento.trim()}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Registrar e Adicionar Andamento
                  </button>
                </div>
              </div>

              {/* Linha do Tempo / Histórico de Andamentos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <History className="w-4 h-4 text-primary-green" />
                    Histórico de Andamentos Registrados ({selectedWorkCard.historicoAtualizacoes?.length || 0})
                  </h4>
                  <span className="text-[10px] text-gray-500 italic">Cronologia de observações com registro temporal</span>
                </div>

                {(!selectedWorkCard.historicoAtualizacoes || selectedWorkCard.historicoAtualizacoes.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    Nenhum andamento registrado até o momento. Utilize o campo acima para adicionar a primeira atualização.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {[...selectedWorkCard.historicoAtualizacoes].reverse().map((att, idx) => (
                      <div key={att.id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-gray-800 text-xs flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-emerald-700" />
                            {att.supervisor}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-primary-green" />
                            {formatBrazilianDate(att.dataHora)}
                          </span>
                        </div>
                        <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-blue-600 font-medium">
                          {att.observacao}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer do Card de Trabalho */}
            <div className="bg-gray-100 p-4 border-t border-gray-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedWorkCard(null)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-xs transition-colors"
              >
                Cancelar / Fechar
              </button>

              <button
                type="button"
                onClick={() => {
                  const sanitized: Ocorrencia = {
                    ...selectedWorkCard,
                    supervisor: sanitizeTextInput(selectedWorkCard.supervisor, 100),
                    descricao: sanitizeTextInput(selectedWorkCard.descricao, 2000),
                    acaoTomada: sanitizeTextInput(selectedWorkCard.acaoTomada, 2000),
                    duracaoMinutos: Math.max(0, Number(selectedWorkCard.duracaoMinutos || 0))
                  };
                  onUpdateOcorrencia(sanitized);
                  setSelectedWorkCard(null);
                }}
                className="px-5 py-2.5 bg-[#005b2e] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Salvar Card de Trabalho
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Edição de Ocorrência */}
      {editingOcorrencia && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary-green" />
                Editar Ocorrência #{editingOcorrencia.id}
              </h3>
              <button
                onClick={() => setEditingOcorrencia(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const sanitizedItem: Ocorrencia = {
                  ...editingOcorrencia,
                  supervisor: sanitizeTextInput(editingOcorrencia.supervisor, 100),
                  descricao: sanitizeTextInput(editingOcorrencia.descricao, 2000),
                  acaoTomada: sanitizeTextInput(editingOcorrencia.acaoTomada, 2000),
                  duracaoMinutos: Math.max(0, Number(editingOcorrencia.duracaoMinutos || 0))
                };
                onUpdateOcorrencia(sanitizedItem);
                setEditingOcorrencia(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 mb-1">Supervisor Responsável</label>
                <select
                  value={editingOcorrencia.supervisor}
                  onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, supervisor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="Heder Santos">Heder Santos (Gerente)</option>
                  <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Categoria</label>
                <select
                  value={editingOcorrencia.categoria}
                  onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, categoria: e.target.value as Categoria })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="Sistemas & Ferramentas">Sistemas & Ferramentas</option>
                  <option value="Qualidade de Leads & Mídia">Qualidade de Leads & Mídia</option>
                  <option value="Processos & SLA">Processos & SLA</option>
                  <option value="Pessoas & Performance">Pessoas & Performance</option>
                  <option value="Comercial & Objeções">Comercial & Objeções</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={editingOcorrencia.descricao}
                  onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, descricao: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Impacto</label>
                  <select
                    value={editingOcorrencia.impacto}
                    onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, impacto: e.target.value as Impacto })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Baixo">Baixo</option>
                    <option value="Médio">Médio</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
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
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Resolvido">Resolvido</option>
                  </select>
                </div>
              </div>

              {editingOcorrencia.status === 'Resolvido' && (
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Data / Hora Conclusão</label>
                    <input
                      type="datetime-local"
                      value={editingOcorrencia.dataHoraConclusao ? new Date(editingOcorrencia.dataHoraConclusao).toISOString().slice(0, 16) : ''}
                      onChange={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                        setEditingOcorrencia({ ...editingOcorrencia, dataHoraConclusao: val });
                      }}
                      className="w-full px-3 py-1.5 border rounded-md bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Duração Impacto (minutos)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingOcorrencia.duracaoMinutos ?? 0}
                      onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, duracaoMinutos: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border rounded-md bg-white text-gray-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Ação Tomada</label>
                <textarea
                  rows={2}
                  value={editingOcorrencia.acaoTomada}
                  onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, acaoTomada: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingOcorrencia(null)}
                  className="px-4 py-2 border rounded-md font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-green text-white rounded-md font-semibold hover:bg-primary-dark"
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
