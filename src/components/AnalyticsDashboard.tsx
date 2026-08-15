/**
 * @file src/components/AnalyticsDashboard.tsx
 * @description Dashboard BI de Alta Performance com Análise Estatística para Detecção de Anomalias.
 * Utiliza Recharts para gráficos de gestão à vista e relatórios executivos para Sales Ops.
 */

import React, { useState, useMemo } from 'react';
import { Ocorrencia, SolicitacaoDesconto } from '../types';
import { detectCategoryAnomalies } from '../utils/statisticalAnalysis';
import { DiscountBIDashboard } from './discounts/DiscountBIDashboard';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  BarChart3, AlertOctagon, CheckCircle, 
  ShieldAlert, Activity, Sparkles, TrendingUp, Clock, Timer, Hourglass,
  Layers, Flame
} from 'lucide-react';

interface AnalyticsDashboardProps {
  ocorrencias: Ocorrencia[];
  solicitacoes?: SolicitacaoDesconto[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = React.memo(({ 
  ocorrencias,
  solicitacoes 
}) => {
  const [subAbaAtiva, setSubAbaAtiva] = useState<'todos' | 'ocorrencias' | 'descontos'>('todos');
  // Análise de Anomalias Memoizada
  const anomalias = useMemo(() => detectCategoryAnomalies(ocorrencias), [ocorrencias]);
  const anomaliasCriticas = useMemo(() => anomalias.filter(a => a.isOutlier), [anomalias]);

  // Métrica KPIs Memoizada
  const { total, criticos, resolvidos, taxaResolução, totalTempoMinutos, mttrMinutos } = useMemo(() => {
    const tot = ocorrencias.length;
    let crit = 0;
    let res = 0;
    let somaMinutos = 0;

    for (let i = 0; i < tot; i++) {
      const oc = ocorrencias[i];
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
  }, [ocorrencias]);

  // Distribuição por Categoria para gráfico de barras Memoizada
  const chartDataCategoria = useMemo(() => {
    const categoriasCount: Record<string, number> = {};
    for (let i = 0; i < ocorrencias.length; i++) {
      const cat = ocorrencias[i].categoria;
      categoriasCount[cat] = (categoriasCount[cat] || 0) + 1;
    }

    return Object.entries(categoriasCount).map(([categoria, totalCount]) => ({
      categoria,
      total: totalCount
    }));
  }, [ocorrencias]);

  // Análise de Tempo de Impacto por Categoria Memoizada
  const chartDataTempoImpacto = useMemo(() => {
    const tempoPorCategoria: Record<string, { totalMinutos: number; count: number; criticosMin: number }> = {};

    for (let i = 0; i < ocorrencias.length; i++) {
      const oc = ocorrencias[i];
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
  }, [ocorrencias]);

  // Distribuição por Impacto para gráfico de pizza (Donut) Memoizada
  const chartDataImpacto = useMemo(() => {
    const impactosCount: Record<string, number> = { Baixo: 0, Médio: 0, Crítico: 0 };
    for (let i = 0; i < ocorrencias.length; i++) {
      const imp = ocorrencias[i].impacto;
      if (impactosCount[imp] !== undefined) {
        impactosCount[imp]++;
      }
    }

    return [
      { name: 'Baixo', value: impactosCount['Baixo'], color: '#10b981' },
      { name: 'Médio', value: impactosCount['Médio'], color: '#f59e0b' },
      { name: 'Crítico', value: impactosCount['Crítico'], color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [ocorrencias]);

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
            Visão Geral Completa (Todos os Painéis)
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
            Ocorrências & Anomalias Z-Score
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
            Dashboard - Descontos
          </button>
        </div>

        <span className="text-[11px] text-gray-500 font-medium px-2">
          {subAbaAtiva === 'todos' ? 'Exibindo Ocorrências + BI Descontos' : subAbaAtiva === 'descontos' ? 'Foco em Burn Rate, SLA & Recorrência' : 'Foco em Incidentes Operacionais'}
        </span>
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
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
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
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataCategoria} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis 
                      dataKey="categoria" 
                      tick={{ fontSize: 10 }} 
                      interval={0} 
                      angle={-15} 
                      textAnchor="end" 
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
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

            {/* Gráfico 2: Severidade de Impacto na Operação */}
            <div className="corporate-card p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary-green" />
                Nível de Severidade de Impacto Operacional
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataImpacto}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {chartDataImpacto.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SEÇÃO 2: DASHBOARD BI - DESCONTOS & ANÁLISE PREDITIVA (HEDER SANTOS) */}
      {(subAbaAtiva === 'todos' || subAbaAtiva === 'descontos') && (
        <DiscountBIDashboard solicitacoesProp={solicitacoes} />
      )}

    </div>
  );
});
