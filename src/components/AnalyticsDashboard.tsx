/**
 * @file src/components/AnalyticsDashboard.tsx
 * @description Dashboard BI de Alta Performance com Análise Estatística para Detecção de Anomalias.
 * Utiliza Recharts para gráficos de gestão à vista e relatórios executivos para Sales Ops.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Ocorrencia, SolicitacaoDesconto } from '../types';
import { detectCategoryAnomalies } from '../utils/statisticalAnalysis';
import { DiscountBIDashboard } from './discounts/DiscountBIDashboard';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  BarChart3, AlertOctagon, CheckCircle, AlertTriangle,
  ShieldAlert, Activity, Sparkles, TrendingUp, Clock, Timer, Hourglass,
  Layers, Flame, Calendar, ChevronDown, Filter, RotateCcw, Check, CalendarDays,
  X
} from 'lucide-react';

export type TipoPeriodoDashboard = 
  | 'mes_atual' 
  | 'mes_anterior' 
  | 'ultimos_7_dias' 
  | 'ultimos_30_dias' 
  | 'personalizado' 
  | 'todos';

interface AnalyticsDashboardProps {
  ocorrencias: Ocorrencia[];
  solicitacoes?: SolicitacaoDesconto[];
}

/**
 * Retorna as datas de início e fim no formato YYYY-MM-DD para cada preset
 */
function calcularDatasPreset(tipo: TipoPeriodoDashboard): { inicio: string; fim: string; label: string; mesAnoIso?: string } {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth(); // 0 a 11

  if (tipo === 'mes_atual') {
    const dataFim = new Date(ano, mes + 1, 0);
    const mesFormatado = String(mes + 1).padStart(2, '0');
    const nomeMes = agora.toLocaleString('pt-BR', { month: 'long' });
    const nomeCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    return {
      inicio: `${ano}-${mesFormatado}-01`,
      fim: `${ano}-${mesFormatado}-${String(dataFim.getDate()).padStart(2, '0')}`,
      label: `Mês Vigente (${nomeCapitalizado}/${ano})`,
      mesAnoIso: `${ano}-${mesFormatado}`
    };
  }

  if (tipo === 'mes_anterior') {
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0);
    const anoAnt = dataInicio.getFullYear();
    const mesAntFormatado = String(dataInicio.getMonth() + 1).padStart(2, '0');
    const nomeMes = dataInicio.toLocaleString('pt-BR', { month: 'long' });
    const nomeCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    return {
      inicio: `${anoAnt}-${mesAntFormatado}-01`,
      fim: `${anoAnt}-${mesAntFormatado}-${String(dataFim.getDate()).padStart(2, '0')}`,
      label: `Mês Anterior (${nomeCapitalizado}/${anoAnt})`,
      mesAnoIso: `${anoAnt}-${mesAntFormatado}`
    };
  }

  if (tipo === 'ultimos_7_dias') {
    const dInicio = new Date(agora);
    dInicio.setDate(dInicio.getDate() - 6);
    return {
      inicio: dInicio.toISOString().slice(0, 10),
      fim: agora.toISOString().slice(0, 10),
      label: 'Últimos 7 dias'
    };
  }

  if (tipo === 'ultimos_30_dias') {
    const dInicio = new Date(agora);
    dInicio.setDate(dInicio.getDate() - 29);
    return {
      inicio: dInicio.toISOString().slice(0, 10),
      fim: agora.toISOString().slice(0, 10),
      label: 'Últimos 30 dias'
    };
  }

  if (tipo === 'todos') {
    return {
      inicio: '',
      fim: '',
      label: 'Todo o Histórico'
    };
  }

  return {
    inicio: '',
    fim: '',
    label: 'Personalizado'
  };
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = React.memo(({ 
  ocorrencias,
  solicitacoes 
}) => {
  const [subAbaAtiva, setSubAbaAtiva] = useState<'todos' | 'ocorrencias' | 'descontos'>('todos');
  
  // FILTRO GERAL DE DATA: Por padrão sempre carrega no MÊS EM VIGOR
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoDashboard>('mes_atual');
  const presetAtual = useMemo(() => calcularDatasPreset('mes_atual'), []);
  const [dataInicioCustom, setDataInicioCustom] = useState<string>(presetAtual.inicio);
  const [dataFimCustom, setDataFimCustom] = useState<string>(presetAtual.fim);
  const [isMenuFiltroAberto, setIsMenuFiltroAberto] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuFiltroAberto(false);
      }
    }
    if (isMenuFiltroAberto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuFiltroAberto]);

  // Filtragem de Ocorrências e Definição do Período Ativo
  const { ocorrenciasFiltradas, labelPeriodoAtivo, mesAnoAtivo, dataInicioAtiva, dataFimAtiva } = useMemo(() => {
    let inicio = '';
    let fim = '';
    let label = '';
    let mesAnoIso: string | undefined = undefined;

    if (tipoPeriodo === 'personalizado') {
      inicio = dataInicioCustom;
      fim = dataFimCustom;
      if (inicio && fim) {
        const dIniFmt = inicio.split('-').reverse().join('/');
        const dFimFmt = fim.split('-').reverse().join('/');
        label = `${dIniFmt} a ${dFimFmt}`;
      } else {
        label = 'Personalizado';
      }
    } else {
      const preset = calcularDatasPreset(tipoPeriodo);
      inicio = preset.inicio;
      fim = preset.fim;
      label = preset.label;
      mesAnoIso = preset.mesAnoIso;
    }

    if (!inicio && !fim) {
      return {
        ocorrenciasFiltradas: ocorrencias,
        labelPeriodoAtivo: label || 'Todo o Histórico',
        mesAnoAtivo: undefined,
        dataInicioAtiva: '',
        dataFimAtiva: ''
      };
    }

    const startMs = inicio ? new Date(`${inicio}T00:00:00`).getTime() : -Infinity;
    const endMs = fim ? new Date(`${fim}T23:59:59.999`).getTime() : Infinity;

    const filtradas = ocorrencias.filter((oc) => {
      if (!oc.dataHora) return false;
      const ocMs = new Date(oc.dataHora).getTime();
      if (isNaN(ocMs)) return true;
      return ocMs >= startMs && ocMs <= endMs;
    });

    return {
      ocorrenciasFiltradas: filtradas,
      labelPeriodoAtivo: label,
      mesAnoAtivo: mesAnoIso,
      dataInicioAtiva: inicio,
      dataFimAtiva: fim
    };
  }, [ocorrencias, tipoPeriodo, dataInicioCustom, dataFimCustom]);

  // Análise de Anomalias Memoizada sobre os dados filtrados
  const anomalias = useMemo(() => detectCategoryAnomalies(ocorrenciasFiltradas), [ocorrenciasFiltradas]);
  const anomaliasCriticas = useMemo(() => anomalias.filter(a => a.isOutlier), [anomalias]);

  // Métrica KPIs Memoizada sobre os dados filtrados
  const { total, criticos, resolvidos, taxaResolução, totalTempoMinutos, mttrMinutos } = useMemo(() => {
    const tot = ocorrenciasFiltradas.length;
    let crit = 0;
    let res = 0;
    let somaMinutos = 0;

    for (let i = 0; i < tot; i++) {
      const oc = ocorrenciasFiltradas[i];
      if (oc.impacto === 'Crítico') crit++;
      if (oc.status === 'Resolvido') res++;

      let min = oc.duracaoMinutos || 0;
      if (!min && oc.dataHoraConclusao && oc.dataHora) {
        min = Math.max(0, Math.round((new Date(oc.dataHoraConclusao).getTime() - new Date(oc.dataHora).getTime()) / 60000));
      } else if (!min && oc.status !== 'Resolvido' && oc.dataHora) {
        min = Math.max(0, Math.round((Date.now() - new Date(oc.dataHora).getTime()) / 60000));
      }
      somaMinutos += min;
    }

    const taxa = tot > 0 ? Math.round((res / tot) * 100) : 0;
    const mttr = res > 0 ? Math.round(somaMinutos / res) : 0;

    return { 
      total: tot, 
      criticos: crit, 
      resolvidos: res, 
      taxaResolução: taxa,
      totalTempoMinutos: somaMinutos,
      mttrMinutos: mttr
    };
  }, [ocorrenciasFiltradas]);

  // Distribuição por Categoria para gráfico de barras Memoizada
  const chartDataCategoria = useMemo(() => {
    const categoriasCount: Record<string, number> = {};
    for (let i = 0; i < ocorrenciasFiltradas.length; i++) {
      const cat = ocorrenciasFiltradas[i].categoria;
      categoriasCount[cat] = (categoriasCount[cat] || 0) + 1;
    }

    return Object.entries(categoriasCount).map(([categoria, totalCount]) => ({
      categoria,
      total: totalCount
    }));
  }, [ocorrenciasFiltradas]);

  // Análise de Tempo de Impacto por Categoria Memoizada
  const chartDataTempoImpacto = useMemo(() => {
    const tempoPorCategoria: Record<string, { totalMinutos: number; count: number; criticosMin: number }> = {};

    for (let i = 0; i < ocorrenciasFiltradas.length; i++) {
      const oc = ocorrenciasFiltradas[i];
      const cat = oc.categoria;

      let min = oc.duracaoMinutos || 0;
      if (!min && oc.dataHoraConclusao && oc.dataHora) {
        min = Math.max(0, Math.round((new Date(oc.dataHoraConclusao).getTime() - new Date(oc.dataHora).getTime()) / 60000));
      } else if (!min && oc.status !== 'Resolvido' && oc.dataHora) {
        min = Math.max(0, Math.round((Date.now() - new Date(oc.dataHora).getTime()) / 60000));
      }

      if (!tempoPorCategoria[cat]) {
        tempoPorCategoria[cat] = { totalMinutos: 0, count: 0, criticosMin: 0 };
      }

      tempoPorCategoria[cat].totalMinutos += min;
      tempoPorCategoria[cat].count += 1;
      if (oc.impacto === 'Crítico') {
        tempoPorCategoria[cat].criticosMin += min;
      }
    }

    return Object.entries(tempoPorCategoria).map(([categoria, data]) => {
      const horas = Number((data.totalMinutos / 60).toFixed(1));
      const mediaMinutos = data.count > 0 ? Math.round(data.totalMinutos / data.count) : 0;
      return {
        categoria,
        horasImpacto: horas,
        totalMinutos: data.totalMinutos,
        mediaMinutos,
        quantidade: data.count
      };
    }).sort((a, b) => b.horasImpacto - a.horasImpacto);
  }, [ocorrenciasFiltradas]);

  // Distribuição por Impacto para gráfico de pizza (Donut) & Resumo Executivo Memoizada
  const { chartDataImpacto, resumoSeveridade } = useMemo(() => {
    const impactosCount: Record<string, number> = { Baixo: 0, Médio: 0, Crítico: 0 };
    for (let i = 0; i < ocorrenciasFiltradas.length; i++) {
      const imp = ocorrenciasFiltradas[i].impacto;
      if (impactosCount[imp] !== undefined) {
        impactosCount[imp]++;
      }
    }

    const totalImpactos = ocorrenciasFiltradas.length;
    const qtdCritico = impactosCount['Crítico'] || 0;
    const qtdMedio = impactosCount['Médio'] || 0;
    const qtdBaixo = impactosCount['Baixo'] || 0;

    const pctCritico = totalImpactos > 0 ? Math.round((qtdCritico / totalImpactos) * 100) : 0;
    const pctMedio = totalImpactos > 0 ? Math.round((qtdMedio / totalImpactos) * 100) : 0;
    const pctBaixo = totalImpactos > 0 ? Math.round((qtdBaixo / totalImpactos) * 100) : 0;
    const pctImpactoRelevante = totalImpactos > 0 ? Math.round(((qtdCritico + qtdMedio) / totalImpactos) * 100) : 0;

    const chartData = [
      { name: 'Baixo', value: qtdBaixo, color: '#10b981', percentualCalculado: pctBaixo },
      { name: 'Médio', value: qtdMedio, color: '#f59e0b', percentualCalculado: pctMedio },
      { name: 'Crítico', value: qtdCritico, color: '#ef4444', percentualCalculado: pctCritico }
    ].filter(d => d.value > 0);

    return {
      chartDataImpacto: chartData,
      resumoSeveridade: {
        total: totalImpactos,
        qtdCritico,
        qtdMedio,
        qtdBaixo,
        pctCritico,
        pctMedio,
        pctBaixo,
        pctImpactoRelevante
      }
    };
  }, [ocorrenciasFiltradas]);

  return (
    <div className="space-y-6">
      
      {/* Sub-Abas do Dashboard de BI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSubAbaAtiva('todos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subAbaAtiva === 'todos'
                ? 'bg-[#005b2e] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Visão Geral Completa
          </button>

          <button
            type="button"
            onClick={() => setSubAbaAtiva('ocorrencias')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subAbaAtiva === 'ocorrencias'
                ? 'bg-[#005b2e] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Ocorrências
          </button>

          <button
            type="button"
            onClick={() => setSubAbaAtiva('descontos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subAbaAtiva === 'descontos'
                ? 'bg-[#005b2e] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Descontos
          </button>
        </div>

        {/* FILTRO GERAL DE DATAS & PERÍODO */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsMenuFiltroAberto(!isMenuFiltroAberto)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition-all cursor-pointer shadow-2xs"
            title="Clique para filtrar o período de visualização do Dashboard"
          >
            <Calendar className="w-3.5 h-3.5 text-primary-green shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-[240px]">
              {labelPeriodoAtivo}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[#005b2e] font-bold text-[10px] shrink-0">
              {total} {total === 1 ? 'reg.' : 'regs.'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isMenuFiltroAberto ? 'rotate-180 text-primary-green' : ''}`} />
          </button>

          {/* Menu Dropdown Suspenso do Filtro de Período */}
          {isMenuFiltroAberto && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-3.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <Filter className="w-3.5 h-3.5 text-primary-green" />
                  Filtrar Período de Análise
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTipoPeriodo('mes_atual');
                    const preset = calcularDatasPreset('mes_atual');
                    setDataInicioCustom(preset.inicio);
                    setDataFimCustom(preset.fim);
                    setIsMenuFiltroAberto(false);
                  }}
                  className="text-[10px] text-gray-500 hover:text-primary-green font-medium flex items-center gap-1 cursor-pointer"
                  title="Redefinir para o mês em vigor"
                >
                  <RotateCcw className="w-3 h-3" />
                  Mês Atual
                </button>
              </div>

              {/* Opções Rápidas Pré-definidas */}
              <div className="space-y-1 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setTipoPeriodo('mes_atual');
                    const preset = calcularDatasPreset('mes_atual');
                    setDataInicioCustom(preset.inicio);
                    setDataFimCustom(preset.fim);
                    setIsMenuFiltroAberto(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    tipoPeriodo === 'mes_atual'
                      ? 'bg-emerald-50 text-[#005b2e] font-bold border border-emerald-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {calcularDatasPreset('mes_atual').label}
                  </span>
                  {tipoPeriodo === 'mes_atual' && <Check className="w-3.5 h-3.5 text-[#005b2e]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoPeriodo('mes_anterior');
                    const preset = calcularDatasPreset('mes_anterior');
                    setDataInicioCustom(preset.inicio);
                    setDataFimCustom(preset.fim);
                    setIsMenuFiltroAberto(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    tipoPeriodo === 'mes_anterior'
                      ? 'bg-emerald-50 text-[#005b2e] font-bold border border-emerald-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    {calcularDatasPreset('mes_anterior').label}
                  </span>
                  {tipoPeriodo === 'mes_anterior' && <Check className="w-3.5 h-3.5 text-[#005b2e]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoPeriodo('ultimos_7_dias');
                    const preset = calcularDatasPreset('ultimos_7_dias');
                    setDataInicioCustom(preset.inicio);
                    setDataFimCustom(preset.fim);
                    setIsMenuFiltroAberto(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    tipoPeriodo === 'ultimos_7_dias'
                      ? 'bg-emerald-50 text-[#005b2e] font-bold border border-emerald-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Últimos 7 dias
                  </span>
                  {tipoPeriodo === 'ultimos_7_dias' && <Check className="w-3.5 h-3.5 text-[#005b2e]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoPeriodo('ultimos_30_dias');
                    const preset = calcularDatasPreset('ultimos_30_dias');
                    setDataInicioCustom(preset.inicio);
                    setDataFimCustom(preset.fim);
                    setIsMenuFiltroAberto(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    tipoPeriodo === 'ultimos_30_dias'
                      ? 'bg-emerald-50 text-[#005b2e] font-bold border border-emerald-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Últimos 30 dias
                  </span>
                  {tipoPeriodo === 'ultimos_30_dias' && <Check className="w-3.5 h-3.5 text-[#005b2e]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoPeriodo('todos');
                    setIsMenuFiltroAberto(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    tipoPeriodo === 'todos'
                      ? 'bg-emerald-50 text-[#005b2e] font-bold border border-emerald-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Todo o Histórico (Sem filtro de data)
                  </span>
                  {tipoPeriodo === 'todos' && <Check className="w-3.5 h-3.5 text-[#005b2e]" />}
                </button>
              </div>

              {/* Seção Intervalo Customizado */}
              <div className="pt-2.5 border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-700 mb-2 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-gray-500" />
                  Intervalo Customizado (De / Até)
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Início</label>
                    <input
                      type="date"
                      value={dataInicioCustom}
                      onChange={(e) => setDataInicioCustom(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-green focus:border-primary-green bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Fim</label>
                    <input
                      type="date"
                      value={dataFimCustom}
                      onChange={(e) => setDataFimCustom(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-green focus:border-primary-green bg-white text-gray-800"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (dataInicioCustom && dataFimCustom) {
                      setTipoPeriodo('personalizado');
                      setIsMenuFiltroAberto(false);
                    }
                  }}
                  disabled={!dataInicioCustom || !dataFimCustom}
                  className="w-full py-1.5 bg-[#005b2e] hover:bg-[#004a25] disabled:bg-gray-300 text-white rounded-md text-xs font-bold transition-colors cursor-pointer"
                >
                  Aplicar Período
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: OCORRÊNCIAS OPERACIONAIS */}
      {(subAbaAtiva === 'todos' || subAbaAtiva === 'ocorrencias') && (
        <div className="space-y-6">
          {/* SEÇÃO KPI Cards Executivos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="corporate-card p-4 flex items-center justify-between border-l-4 border-l-emerald-700">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Ocorrências</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{total}</h3>
                <span className="text-[11px] text-gray-500 font-medium">Registradas no Diário</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-primary-green">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="corporate-card p-4 flex items-center justify-between border-l-4 border-l-amber-600">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tempo Total Impacto</p>
                <h3 className="text-2xl font-extrabold text-amber-700 mt-1">
                  {totalTempoMinutos >= 60 ? `${(totalTempoMinutos / 60).toFixed(1)}h` : `${totalTempoMinutos} min`}
                </h3>
                <span className="text-[11px] text-amber-600 font-medium">Operação Paralisada/Afetada</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="corporate-card p-4 flex items-center justify-between border-l-4 border-l-red-600">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Incidentes Críticos</p>
                <h3 className="text-2xl font-extrabold text-red-600 mt-1">{criticos}</h3>
                <span className="text-[11px] text-red-500 font-medium">Prioridade Alta de Solução</span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-red-600">
                <AlertOctagon className="w-6 h-6" />
              </div>
            </div>

            <div className="corporate-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Taxa de Resolução</p>
                <h3 className="text-2xl font-extrabold text-emerald-800 mt-1">{taxaResolução}%</h3>
                <span className="text-[11px] text-emerald-600 font-medium">{resolvidos} de {total} solucionados</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="corporate-card p-4 flex items-center justify-between border-l-4 border-l-sky-600">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Anomalias (Outliers)</p>
                <h3 className="text-2xl font-extrabold text-sky-800 mt-1">{anomaliasCriticas.length}</h3>
                <span className="text-[11px] text-sky-600 font-medium">Gargalos Preditivos</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* SEÇÃO ANALÍTICA: Impacto de Tempo Operacional por Categoria/Departamento */}
          <div className="corporate-card p-5 border-l-4 border-l-amber-500 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    Impacto Operacional: Tempo Total de Interrupção por Categoria (Horas)
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                      Tempo Operacional Perdido
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Mede a duração total em horas que o departamento ficou parado ou impactado até a conclusão do problema.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico de Barras do Tempo de Impacto */}
              <div className="lg:col-span-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataTempoImpacto} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <XAxis 
                      dataKey="categoria" 
                      tick={{ fontSize: 10 }} 
                      interval={0} 
                      angle={-15} 
                      textAnchor="end" 
                    />
                    <YAxis allowDecimals={true} tick={{ fontSize: 11 }} label={{ value: 'Horas', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value} horas (${Math.round(Number(value) * 60)} min)`,
                        'Impacto de Tempo'
                      ]}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="horasImpacto" name="Horas de Impacto" fill="#d97706" radius={[4, 4, 0, 0]}>
                      {chartDataTempoImpacto.map((entry, index) => (
                        <Cell key={`cell-tempo-${index}`} fill={index === 0 ? '#b45309' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela Resumo Analítica por Departamento */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-700 tracking-wider mb-3 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-amber-700" />
                    Resumo de Duração por Categoria
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {chartDataTempoImpacto.length === 0 ? (
                      <p className="text-gray-500 italic text-center py-4">Nenhum registro com tempo capturado.</p>
                    ) : (
                      chartDataTempoImpacto.map((item) => (
                        <div key={item.categoria} className="p-2 bg-white rounded border border-gray-200 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-gray-800 block">{item.categoria}</span>
                            <span className="text-[10px] text-gray-500">{item.quantidade} ocorrência(s) • Média: {item.mediaMinutos} min</span>
                          </div>
                          <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 text-xs">
                            {item.horasImpacto}h
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-200 text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-800">Tempo Médio de Solução (MTTR):</span>{' '}
                  <span className="font-bold text-emerald-800">{mttrMinutos} minutos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Painel Anomaly Detection Engine */}
          <div className="corporate-card p-5 border border-sky-200 bg-linear-to-r from-sky-50/40 via-white to-emerald-50/30">
            <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-gray-200">
              <div className="p-2 bg-sky-100 rounded-lg text-sky-800">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  Análise Estatística de Anomalias
                  <span className="text-xs font-semibold px-2 py-0.5 bg-sky-100 text-sky-800 rounded">
                    Data Science Engine
                  </span>
                </h3>
                <p className="text-xs text-gray-500">
                  Identificação automática de outliers estatísticos e picos de ocorrências acima da curva de desvio padrão (σ)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {anomalias.map((anom) => (
                <div 
                  key={anom.categoria} 
                  className={`p-3.5 rounded-lg border text-xs transition-all ${
                    anom.zScore >= 2.0
                      ? 'bg-red-50 border-red-300 shadow-xs'
                      : anom.zScore >= 1.2
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-gray-800 mb-1">
                    <span>{anom.categoria}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      anom.zScore >= 2.0
                        ? 'bg-red-200 text-red-900'
                        : anom.zScore >= 1.2
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Z: {anom.zScore}
                    </span>
                  </div>

                  <div className="text-gray-600 space-y-0.5 my-2">
                    <div className="flex justify-between">
                      <span>Volume Registrado:</span>
                      <span className="font-bold text-gray-800">{anom.quantidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Média Esperada (μ):</span>
                      <span className="font-semibold">{anom.mediaEsperada}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Desvio Padrão (σ):</span>
                      <span className="font-semibold">{anom.desvioPadrao}</span>
                    </div>
                  </div>

                  <p className={`text-[11px] leading-relaxed mt-2 pt-2 border-t ${
                    anom.zScore >= 2.0 ? 'text-red-800 font-medium' : 'text-gray-600'
                  }`}>
                    {anom.mensagem}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Gráficos Recharts de Gestão à Vista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Ocorrências por Categoria */}
            <div className="corporate-card p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-green" />
                Distribuição de Incidentes por Categoria
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataCategoria} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis 
                      dataKey="categoria" 
                      tick={{ fontSize: 10 }} 
                      interval={0} 
                      angle={-15} 
                      textAnchor="end" 
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: any) => [
                        `${value} ${Number(value) === 1 ? 'ocorrência' : 'ocorrências'}`,
                        'Total'
                      ]}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                      itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="total" fill="#005b2e" radius={[4, 4, 0, 0]}>
                      {chartDataCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#005b2e' : '#047857'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Severidade de Impacto na Operação (Redesenhado - Visão Executiva) */}
            <div className="corporate-card p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary-green" />
                  Nível de Severidade de Impacto Operacional
                </h3>
              </div>

              {/* Área do Gráfico Donut Centralizado com KPI central */}
              <div className="relative h-56 flex items-center justify-center my-1">
                {resumoSeveridade.total === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-400 font-medium">Nenhuma ocorrência para análise de impacto</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 12, right: 30, bottom: 12, left: 30 }}>
                        <Pie
                          data={chartDataImpacto}
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={84}
                          paddingAngle={4}
                          dataKey="value"
                          labelLine={{ stroke: '#94a3b8', strokeWidth: 1.2 }}
                          label={({ value }) => {
                            if (!resumoSeveridade.total || value <= 0) return '';
                            const pct = Math.round((value / resumoSeveridade.total) * 100);
                            return `${pct}%`;
                          }}
                        >
                          {chartDataImpacto.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              stroke="#ffffff" 
                              strokeWidth={3} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            `${value} ${Number(value) === 1 ? 'ocorrência' : 'ocorrências'} (${resumoSeveridade.total > 0 ? Math.round((Number(value) / resumoSeveridade.total) * 100) : 0}%)`,
                            `Severidade: ${name}`
                          ]}
                          contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} 
                          labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                          itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* KPI Centralizador: Total de Ocorrências */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
                        {resumoSeveridade.total}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
                        {resumoSeveridade.total === 1 ? 'Ocorrência' : 'Ocorrências'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Legenda Estruturada & Ordenada por Severidade (Crítico -> Médio -> Baixo) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 pb-3 border-t border-gray-100">
                {/* 1. Crítico */}
                <div className="bg-red-50/40 rounded-lg p-2 text-center border border-red-100/60">
                  <div className="inline-flex items-center gap-1.5 justify-center mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0" />
                    <span className="text-xs font-bold text-gray-900">Crítico</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">
                    {resumoSeveridade.qtdCritico} {resumoSeveridade.qtdCritico === 1 ? 'ocorrência' : 'ocorrências'} · <span className="font-semibold text-red-600">{resumoSeveridade.pctCritico}%</span>
                  </p>
                </div>

                {/* 2. Médio */}
                <div className="bg-amber-50/40 rounded-lg p-2 text-center border border-amber-100/60">
                  <div className="inline-flex items-center gap-1.5 justify-center mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
                    <span className="text-xs font-bold text-gray-900">Médio</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">
                    {resumoSeveridade.qtdMedio} {resumoSeveridade.qtdMedio === 1 ? 'ocorrência' : 'ocorrências'} · <span className="font-semibold text-amber-600">{resumoSeveridade.pctMedio}%</span>
                  </p>
                </div>

                {/* 3. Baixo */}
                <div className="bg-emerald-50/40 rounded-lg p-2 text-center border border-emerald-100/60">
                  <div className="inline-flex items-center gap-1.5 justify-center mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                    <span className="text-xs font-bold text-gray-900">Baixo</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium">
                    {resumoSeveridade.qtdBaixo} {resumoSeveridade.qtdBaixo === 1 ? 'ocorrência' : 'ocorrências'} · <span className="font-semibold text-emerald-700">{resumoSeveridade.pctBaixo}%</span>
                  </p>
                </div>
              </div>

              {/* Insight Executivo Dinâmico */}
              <div className={`mt-1 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                resumoSeveridade.total === 0 
                  ? 'bg-gray-50 border-gray-200 text-gray-600'
                  : resumoSeveridade.pctImpactoRelevante > 0
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              }`}>
                {resumoSeveridade.total === 0 ? (
                  <span>Nenhuma ocorrência registrada no período selecionado.</span>
                ) : resumoSeveridade.pctImpactoRelevante > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong className="font-bold text-amber-900">Atenção:</strong> {resumoSeveridade.pctImpactoRelevante}% das ocorrências apresentam impacto Médio ou Crítico.
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="font-bold text-emerald-900">Estável:</strong> 100% das ocorrências apresentam impacto Baixo sem risco crítico ou moderado.
                    </span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SEÇÃO 2: DASHBOARD BI - DESCONTOS & ANÁLISE PREDITIVA (HEDER SANTOS) */}
      {(subAbaAtiva === 'todos' || subAbaAtiva === 'descontos') && (
        <DiscountBIDashboard 
          solicitacoesProp={solicitacoes} 
          mesSelecionado={mesAnoAtivo}
        />
      )}

    </div>
  );
});
