/**
 * @file src/components/AnalyticsDashboard.tsx
 * @description Dashboard BI de Alta Performance com Análise Estatística para Detecção de Anomalias.
 * Utiliza Recharts para gráficos de gestão à vista e relatórios executivos para Sales Ops.
 */

import React from 'react';
import { Ocorrencia } from '../types';
import { detectCategoryAnomalies } from '../utils/statisticalAnalysis';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, AlertOctagon, TrendingUp, CheckCircle, ShieldAlert, Cpu, 
  Layers, Users, HelpCircle, Activity, Sparkles, AlertTriangle, ArrowUpRight
} from 'lucide-react';

interface AnalyticsDashboardProps {
  ocorrencias: Ocorrencia[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ ocorrencias }) => {
  // Análise Z-Score
  const anomalias = detectCategoryAnomalies(ocorrencias);
  const anomaliasCriticas = anomalias.filter(a => a.isOutlier);

  // Métrica KPIs
  const total = ocorrencias.length;
  const criticos = ocorrencias.filter(o => o.impacto === 'Crítico').length;
  const resolvidos = ocorrencias.filter(o => o.status === 'Resolvido').length;
  const taxaResolução = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

  // Distribuição por Categoria para gráfico de barras
  const categoriasCount: Record<string, number> = {};
  ocorrencias.forEach(o => {
    categoriasCount[o.categoria] = (categoriasCount[o.categoria] || 0) + 1;
  });

  const chartDataCategoria = Object.entries(categoriasCount).map(([categoria, total]) => ({
    categoria,
    total
  }));

  // Distribuição por Impacto para gráfico de pizza (Donut)
  const impactosCount: Record<string, number> = { Baixo: 0, Médio: 0, Crítico: 0 };
  ocorrencias.forEach(o => {
    if (impactosCount[o.impacto] !== undefined) {
      impactosCount[o.impacto]++;
    }
  });

  const chartDataImpacto = [
    { name: 'Baixo', value: impactosCount['Baixo'], color: '#10b981' },
    { name: 'Médio', value: impactosCount['Médio'], color: '#f59e0b' },
    { name: 'Crítico', value: impactosCount['Crítico'], color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      
      {/* SEÇÃO KPI Cards Executivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detecção de Anomalias</p>
            <h3 className="text-2xl font-extrabold text-sky-800 mt-1">{anomaliasCriticas.length}</h3>
            <span className="text-[11px] text-sky-600 font-medium">Gargalos Preditivos</span>
          </div>
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <TrendingUp className="w-6 h-6" />
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
  );
};
