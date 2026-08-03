/**
 * @file src/components/OccurrenceHistory.tsx
 * @description SEÇÃO 3: Dashboard e Histórico de Ocorrências Registradas.
 * Apresenta tabela responsiva e cartões com badges coloridas, ações de edição, alteração de status e exclusão.
 */

import React, { useState } from 'react';
import { Ocorrencia, FiltrosOcorrencia, Status, Impacto, Categoria } from '../types';
import { formatBrazilianDate, exportToCSV } from '../utils/statisticalAnalysis';
import { 
  Search, Filter, Trash2, CheckCircle, Edit3, Clock, AlertTriangle, 
  CheckCircle2, AlertCircle, Calendar, User, Tag, ShieldAlert, FileText, 
  LayoutGrid, ListFilter, RotateCcw, X, Download
} from 'lucide-react';

interface OccurrenceHistoryProps {
  ocorrencias: Ocorrencia[];
  onDeleteOcorrencia: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onUpdateOcorrencia: (updated: Ocorrencia) => void;
}

export const OccurrenceHistory: React.FC<OccurrenceHistoryProps> = ({
  ocorrencias,
  onDeleteOcorrencia,
  onUpdateStatus,
  onUpdateOcorrencia
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
  
  // State de Filtros
  const [filtros, setFiltros] = useState<FiltrosOcorrencia>({
    busca: '',
    categoria: '',
    impacto: '',
    status: '',
    supervisor: ''
  });

  const handleResetFiltros = () => {
    setFiltros({
      busca: '',
      categoria: '',
      impacto: '',
      status: '',
      supervisor: ''
    });
  };

  // Filtragem de dados
  const ocorrenciasFiltradas = ocorrencias.filter((oc) => {
    const matchBusca = 
      !filtros.busca ||
      oc.descricao.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      oc.acaoTomada.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      oc.supervisor.toLowerCase().includes(filtros.busca.toLowerCase());

    const matchCategoria = !filtros.categoria || oc.categoria === filtros.categoria;
    const matchImpacto = !filtros.impacto || oc.impacto === filtros.impacto;
    const matchStatus = !filtros.status || oc.status === filtros.status;
    const matchSupervisor = !filtros.supervisor || oc.supervisor === filtros.supervisor;

    return matchBusca && matchCategoria && matchImpacto && matchStatus && matchSupervisor;
  });

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

      {/* Painel de Filtros Avançados */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Busca por texto */}
          <div className="sm:col-span-2 relative">
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
          <div>
            <select
              value={filtros.impacto}
              onChange={(e) => setFiltros({ ...filtros, impacto: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
            >
              <option value="">Todos Impactos</option>
              <option value="Baixo">Baixo</option>
              <option value="Médio">Médio</option>
              <option value="Crítico">Crítico</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
            >
              <option value="">Todos Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Resolvido">Resolvido</option>
            </select>
          </div>
        </div>

        {/* Limpar Filtros */}
        {(filtros.busca || filtros.categoria || filtros.impacto || filtros.status || filtros.supervisor) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleResetFiltros}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 transition-colors"
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

                  {/* Descrição */}
                  <td className="px-4 py-3.5 text-gray-800 max-w-xs leading-relaxed">
                    <p className="line-clamp-3">{oc.descricao}</p>
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
                    {getStatusBadge(oc.status)}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      
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
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir esta ocorrência do diário de bordo?')) {
                            onDeleteOcorrencia(oc.id);
                          }
                        }}
                        title="Excluir Ocorrência"
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
                  {getStatusBadge(oc.status)}
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
                  {oc.status !== 'Resolvido' && (
                    <button
                      onClick={() => onUpdateStatus(oc.id, 'Resolvido')}
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-emerald-700"
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
                    onClick={() => {
                      if (window.confirm('Excluir esta ocorrência?')) {
                        onDeleteOcorrencia(oc.id);
                      }
                    }}
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
                onUpdateOcorrencia(editingOcorrencia);
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
                  <option value="Debora Rodrigues">Debora Rodrigues</option>
                  <option value="Marilia Farias">Marilia Farias</option>
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
                    onChange={(e) => setEditingOcorrencia({ ...editingOcorrencia, status: e.target.value as Status })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Resolvido">Resolvido</option>
                  </select>
                </div>
              </div>

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
};
