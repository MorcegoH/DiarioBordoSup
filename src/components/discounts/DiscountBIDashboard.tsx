/**
 * @file src/components/discounts/DiscountBIDashboard.tsx
 * @description Sub-seção analítica "Dashboard BI - Descontos" com visão preditiva e gerencial para o Gerente Heder Santos.
 * Contempla Métricas de Ciência de Dados: Taxa de Queima de Orçamento (Burn Rate), Matriz de Recorrência,
 * Indicador de Risco de SLA e Conversão/Impacto por Tipo de Desconto.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { SolicitacaoDesconto } from '../../types';
import { discountService } from '../../services/discountService';
import { 
  calcularBurnRate, 
  calcularMatrizRecorrencia, 
  calcularRiscoSLA, 
  calcularConversaoTipoDesconto,
  gerarDadosSimuladosDesconto,
  ConsultorRecorrencia
} from '../../utils/discountAnalytics';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  PieChart, 
  Pie, 
  Cell, 
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Flame, 
  Clock, 
  Users, 
  PieChart as PieIcon, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  Sparkles, 
  GraduationCap, 
  ArrowUpRight, 
  Activity, 
  Calendar,
  Layers,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';

interface DiscountBIDashboardProps {
  solicitacoesProp?: SolicitacaoDesconto[];
  mesSelecionado?: string;
}

export const DiscountBIDashboard: React.FC<DiscountBIDashboardProps> = React.memo(({ 
  solicitacoesProp,
  mesSelecionado 
}) => {
  const [solicitacoesLocais, setSolicitacoesLocais] = useState<SolicitacaoDesconto[]>([]);
  const [usarSimulacaoPreditiva, setUsarSimulacaoPreditiva] = useState<boolean>(false);
  const [filtroSupervisora, setFiltroSupervisora] = useState<string>('Todas');
  const [buscaConsultor, setBuscaConsultor] = useState<string>('');

  // Carrega solicitações reais do banco/service
  useEffect(() => {
    if (solicitacoesProp !== undefined) {
      setSolicitacoesLocais(solicitacoesProp);
    } else {
      discountService.getSolicitacoesAsync().then((dados) => {
        setSolicitacoesLocais(dados);
      });
    }
  }, [solicitacoesProp]);

  // Define a base de dados ativa (Simulação com Inteligência Estatística ou Dados Reais)
  const dadosAtivos = useMemo(() => {
    if (usarSimulacaoPreditiva) {
      return gerarDadosSimuladosDesconto();
    }
    return solicitacoesLocais;
  }, [usarSimulacaoPreditiva, solicitacoesLocais]);

  // 1. Taxa de Queima de Orçamento (Burn Rate)
  const analiseBurnRate = useMemo(() => {
    return calcularBurnRate(dadosAtivos, mesSelecionado);
  }, [dadosAtivos, mesSelecionado]);

  // 2. Matriz de Recorrência (Consultor x Frequência x Dependência)
  const matrizRecorrencia = useMemo(() => {
    return calcularMatrizRecorrencia(dadosAtivos);
  }, [dadosAtivos]);

  // Filtro de Consultores na Matriz de Recorrência
  const consultoresFiltrados = useMemo(() => {
    return matrizRecorrencia.filter((c) => {
      const matchSup = filtroSupervisora === 'Todas' || c.supervisora === filtroSupervisora;
      const matchNome = buscaConsultor === '' || c.nome.toLowerCase().includes(buscaConsultor.toLowerCase());
      return matchSup && matchNome;
    });
  }, [matrizRecorrencia, filtroSupervisora, buscaConsultor]);

  // Consultores em risco crítico que necessitam de treinamento em contorno de objeções
  const consultoresTreinamento = useMemo(() => {
    return matrizRecorrencia.filter(c => c.indiceDependencia === 'Crítico (Dependente)' || c.indiceDependencia === 'Alto (Risco)');
  }, [matrizRecorrencia]);

  // 3. Indicador de Risco de SLA (Tempo Médio de Aprovação)
  const analiseSLA = useMemo(() => {
    return calcularRiscoSLA(dadosAtivos);
  }, [dadosAtivos]);

  // 4. Conversão e Impacto por Tipo de Desconto (Adesão vs Plano)
  const analiseConversao = useMemo(() => {
    return calcularConversaoTipoDesconto(dadosAtivos);
  }, [dadosAtivos]);

  return (
    <div className="space-y-6 pt-4 border-t-2 border-emerald-100 mt-8">
      
      {/* Banner de Cabeçalho da Seção BI - Descontos */}
      <div className="corporate-card p-5 bg-linear-to-r from-[#005b2e] via-emerald-900 to-[#004222] text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-emerald-700/80 rounded-lg text-emerald-100 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight">
              Dashboard - Descontos
            </h2>
          </div>

          {/* Seletor de Modo de Dados: Preditivo vs Tempo Real */}
          <div className="flex items-center gap-3 bg-black/25 backdrop-blur-xs p-2 rounded-xl border border-white/10 shrink-0">
            <span className="text-xs font-semibold text-emerald-100">
              Cenários:
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-black/30 border border-white/10 text-xs font-medium">
              <button
                type="button"
                onClick={() => setUsarSimulacaoPreditiva(true)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  usarSimulacaoPreditiva 
                    ? 'bg-emerald-500 text-white font-bold shadow-xs' 
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Preditivo
              </button>
              <button
                type="button"
                onClick={() => setUsarSimulacaoPreditiva(false)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  !usarSimulacaoPreditiva 
                    ? 'bg-emerald-500 text-white font-bold shadow-xs' 
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Tempo Real
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 4 KPIs Executivos do BI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Burn Rate Atual */}
        <div className="corporate-card p-4 border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Burn Rate Diário
              </span>
              <h3 className="text-2xl font-extrabold text-amber-700 mt-1">
                R$ {analiseBurnRate.burnRateDiario.toFixed(2).replace('.', ',')}
                <span className="text-xs font-normal text-gray-500">/dia</span>
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Meta sustentável: R$ {analiseBurnRate.burnRateIdeal.toFixed(2).replace('.', ',')}/dia
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Flame className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 2: Projeção de Esgotamento de Caixa */}
        <div className={`corporate-card p-4 border-l-4 bg-white ${
          analiseBurnRate.diaEstimadoEsgotamento && analiseBurnRate.diaEstimadoEsgotamento <= 25
            ? 'border-l-red-600'
            : 'border-l-emerald-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Dia Estimado Esgotamento
              </span>
              <h3 className={`text-2xl font-extrabold mt-1 ${
                analiseBurnRate.diaEstimadoEsgotamento && analiseBurnRate.diaEstimadoEsgotamento <= 25
                  ? 'text-red-700'
                  : 'text-[#005b2e]'
              }`}>
                {analiseBurnRate.diaEstimadoEsgotamento ? `Dia ${analiseBurnRate.diaEstimadoEsgotamento}` : 'Fim do Mês'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {analiseBurnRate.diaEstimadoEsgotamento 
                  ? `Saldo de R$ 900 acabará antes do dia 30` 
                  : 'Orçamento cobrirá todo o ciclo'}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              analiseBurnRate.diaEstimadoEsgotamento && analiseBurnRate.diaEstimadoEsgotamento <= 25
                ? 'bg-red-50 text-red-600'
                : 'bg-emerald-50 text-[#005b2e]'
            }`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 3: Tempo Médio de Aprovação (SLA) */}
        <div className={`corporate-card p-4 border-l-4 bg-white ${
          analiseSLA.corAlerta === 'vermelho'
            ? 'border-l-red-600'
            : analiseSLA.corAlerta === 'amarelo'
            ? 'border-l-amber-500'
            : 'border-l-emerald-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Tempo Médio Aprovação
              </span>
              <h3 className={`text-2xl font-extrabold mt-1 ${
                analiseSLA.corAlerta === 'vermelho'
                  ? 'text-red-700'
                  : analiseSLA.corAlerta === 'amarelo'
                  ? 'text-amber-700'
                  : 'text-[#005b2e]'
              }`}>
                {analiseSLA.tempoMedioFormatado}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Meta SLA: &lt; 4h00m ({analiseSLA.percentualNoPrazo}% no prazo)
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              analiseSLA.corAlerta === 'vermelho'
                ? 'bg-red-50 text-red-600'
                : analiseSLA.corAlerta === 'amarelo'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-[#005b2e]'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 4: Consultores em Risco de Dependência */}
        <div className="corporate-card p-4 border-l-4 border-l-purple-600 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Foco de Capacitação
              </span>
              <h3 className="text-2xl font-extrabold text-purple-900 mt-1">
                {consultoresTreinamento.length} consultores
              </h3>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                Requerem treino em contorno de objeções
              </p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* 1. SEÇÃO: Taxa de Queima de Orçamento */}
      <div className="corporate-card p-5 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                Taxa de Queima de Orçamento
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  analiseBurnRate.statusQueima === 'Crítico (Esgotamento Precoce)'
                    ? 'bg-red-100 text-red-900'
                    : analiseBurnRate.statusQueima === 'Atenção'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-emerald-100 text-[#005b2e]'
                }`}>
                  {analiseBurnRate.statusQueima}
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Taxa de consumo do orçamento de descontos do departamento.
              </p>
            </div>
          </div>

          <div className="text-right text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="text-gray-500">Consumo Atual: </span>
            <span className="font-bold text-gray-800">R$ {analiseBurnRate.consumoAtual.toFixed(2).replace('.', ',')}</span>
            <span className="text-gray-400"> / </span>
            <span className="font-bold text-[#005b2e]">R$ 900,00</span>
          </div>
        </div>

        {/* Alerta Executivo Preditivo */}
        <div className={`p-3.5 rounded-xl border mb-5 flex items-start gap-3 text-xs leading-relaxed ${
          analiseBurnRate.statusQueima === 'Crítico (Esgotamento Precoce)'
            ? 'bg-red-50/90 border-red-200 text-red-900'
            : analiseBurnRate.statusQueima === 'Atenção'
            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
        }`}>
          {analiseBurnRate.statusQueima === 'Crítico (Esgotamento Precoce)' ? (
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <Activity className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <strong className="block text-sm font-extrabold mb-0.5">
              Diagnóstico Preditivo:
            </strong>
            <p>{analiseBurnRate.mensagemExecutiva}</p>
          </div>
        </div>

        {/* Gráfico Recharts de Linha com Projeção Pontilhada */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={analiseBurnRate.pontos} 
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <XAxis 
                dataKey="diaLabel" 
                tick={{ fontSize: 10 }}
                interval={2}
              />
              <YAxis 
                domain={[0, 1050]} 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (value === undefined || value === null) return ['—', name];
                  const labelNome = 
                    name === 'consumoReal' ? 'Consumo Real Acumulado' :
                    name === 'consumoProjetado' ? 'Projeção Preditiva Pontilhada' :
                    name === 'ritmoIdeal' ? 'Ritmo Sustentável Ideal' : name;
                  return [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, labelNome];
                }}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
              />
              
              {/* Linha de Teto Máximo R$ 900 */}
              <ReferenceLine 
                y={900} 
                stroke="#dc2626" 
                strokeWidth={2}
                label={{ value: 'TETO MÁXIMO R$ 900,00', position: 'insideTopRight', fill: '#dc2626', fontSize: 11, fontWeight: 'bold' }} 
              />

              {/* Linha de Ritmo Ideal Planejado */}
              <Line 
                type="monotone" 
                dataKey="ritmoIdeal" 
                name="ritmoIdeal"
                stroke="#94a3b8" 
                strokeDasharray="3 3" 
                strokeWidth={1.5}
                dot={false}
              />

              {/* Linha Sólida de Consumo Real */}
              <Line 
                type="monotone" 
                dataKey="consumoReal" 
                name="consumoReal"
                stroke="#005b2e" 
                strokeWidth={3}
                dot={{ r: 3, fill: '#005b2e' }}
                activeDot={{ r: 6 }}
              />

              {/* Linha Pontilhada de Projeção Preditiva */}
              <Line 
                type="monotone" 
                dataKey="consumoProjetado" 
                name="consumoProjetado"
                stroke="#f59e0b" 
                strokeWidth={3}
                strokeDasharray="6 6"
                dot={{ r: 3, fill: '#f59e0b' }}
              />

              <Legend 
                verticalAlign="bottom" 
                height={36} 
                formatter={(val) => {
                  if (val === 'consumoReal') return <span className="text-xs font-semibold text-emerald-900">Consumo Real (Até Hoje)</span>;
                  if (val === 'consumoProjetado') return <span className="text-xs font-semibold text-amber-700">Projeção Preditiva de Esgotamento</span>;
                  if (val === 'ritmoIdeal') return <span className="text-xs text-gray-500">Ritmo Linear Ideal (R$ 30/dia)</span>;
                  return val;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Duplo: 2. Matriz de Recorrência & 3. Indicador de Risco de SLA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 2. SEÇÃO: Matriz de Recorrência (Consultor x Frequência) */}
        <div className="lg:col-span-7 corporate-card p-5 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-800">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    2. Matriz de Recorrência (Consultor x Frequência)
                    <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-900 rounded">
                      Heatmap
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Ranking de dependência de desconto para direcionar treinamentos de contorno de objeção.
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros da Matriz */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-grow">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar consultor..."
                  value={buscaConsultor}
                  onChange={(e) => setBuscaConsultor(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#005b2e]"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={filtroSupervisora}
                  onChange={(e) => setFiltroSupervisora(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#005b2e]"
                >
                  <option value="Todas">Todos os Consultores</option>
                  <option value="Débora Rodrigues">Equipe Débora Rodrigues</option>
                </select>
              </div>
            </div>

            {/* Tabela de Calor / Heatmap de Consultores */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="p-2.5">Consultor</th>
                    <th className="p-2.5">Supervisão</th>
                    <th className="p-2.5 text-center">Qtd. Solicitada</th>
                    <th className="p-2.5 text-right">Volume (R$)</th>
                    <th className="p-2.5">Dependência / Ação Gerencial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                        Nenhum consultor encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    consultoresFiltrados.map((c, idx) => (
                      <tr 
                        key={c.nome}
                        className={`transition-colors ${
                          c.corNivel === 'vermelho' 
                            ? 'bg-red-50/50 hover:bg-red-50' 
                            : c.corNivel === 'laranja' 
                            ? 'bg-amber-50/40 hover:bg-amber-50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="w-4 text-[10px] text-gray-400 font-mono">{idx + 1}.</span>
                          {c.nome}
                        </td>
                        <td className="p-2.5 text-gray-600">
                          <span className="text-[11px] font-medium">{c.supervisora.split(' ')[0]}</span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-gray-800">
                          {c.totalSolicitacoes}
                        </td>
                        <td className="p-2.5 text-right font-bold text-gray-900">
                          R$ {c.volumeTotalReais.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-2.5">
                          <div className="space-y-0.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.corNivel === 'vermelho'
                                ? 'bg-red-200 text-red-900 border border-red-300'
                                : c.corNivel === 'laranja'
                                ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                : c.corNivel === 'amarelo'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {c.indiceDependencia}
                            </span>
                            <p className="text-[10px] text-gray-600 leading-tight">
                              {c.acaoRecomendada}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-purple-700" />
              Insight: Priorize 1-on-1s com consultores de nível <strong>Alto/Crítico</strong>.
            </span>
            <span className="font-semibold text-purple-900">
              Total Analisado: {consultoresFiltrados.length} consultores
            </span>
          </div>
        </div>

        {/* 3. SEÇÃO: Indicador de Risco de SLA */}
        <div className="lg:col-span-5 corporate-card p-5 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${
                  analiseSLA.corAlerta === 'vermelho'
                    ? 'bg-red-100 text-red-800'
                    : analiseSLA.corAlerta === 'amarelo'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-[#005b2e]'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    3. Indicador de Risco de SLA
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      analiseSLA.corAlerta === 'vermelho'
                        ? 'bg-red-100 text-red-900'
                        : analiseSLA.corAlerta === 'amarelo'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-[#005b2e]'
                    }`}>
                      Teto: 4 Horas
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Velocidade de tomada de decisão e resposta ao consultor.
                  </p>
                </div>
              </div>
            </div>

            {/* Destaque Principal do Tempo Médio com Cor Dinâmica */}
            <div className={`p-4 rounded-xl border mb-4 text-center ${
              analiseSLA.corAlerta === 'vermelho'
                ? 'bg-red-50 border-red-300 text-red-950'
                : analiseSLA.corAlerta === 'amarelo'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider block opacity-75">
                Tempo Médio de Decisão / Aprovação
              </span>
              <h4 className="text-4xl font-extrabold my-1">
                {analiseSLA.tempoMedioFormatado}
              </h4>
              <div className="flex items-center justify-center gap-1 text-xs font-bold">
                {analiseSLA.corAlerta === 'vermelho' ? (
                  <span className="text-red-700 flex items-center gap-1">
                    <AlertOctagon className="w-4 h-4" /> Risco Crítico de Atraso na Venda
                  </span>
                ) : analiseSLA.corAlerta === 'amarelo' ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Atenção: Próximo ao Limite de 4h
                  </span>
                ) : (
                  <span className="text-[#005b2e] flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Operação Rápida & Eficiente
                  </span>
                )}
              </div>
            </div>

            {/* Barra Visual de Proximidade ao SLA de 4h */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs font-semibold text-gray-700">
                <span>0h</span>
                <span>Meta: 2h</span>
                <span className="text-red-600 font-bold">Limite: 4h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden relative">
                <div 
                  className={`h-3 rounded-full transition-all duration-700 ${
                    analiseSLA.tempoMedioMinutos >= 240
                      ? 'bg-red-600'
                      : analiseSLA.tempoMedioMinutos >= 180
                      ? 'bg-amber-500'
                      : 'bg-[#005b2e]'
                  }`}
                  style={{ width: `${Math.min(100, (analiseSLA.tempoMedioMinutos / 240) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Distribuição por Faixas de Tempo */}
            <div className="space-y-2 text-xs">
              <h5 className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                Distribuição das Solicitações por Tempo:
              </h5>
              {analiseSLA.distribuicaoTempo.map((d) => (
                <div key={d.faixa} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                  <span className="font-medium text-gray-800">{d.faixa}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{d.quantidade} un.</span>
                    <span className="text-[10px] text-gray-500">({d.percentual}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-600">
            <strong>Impacto no Fechamento:</strong> Respostas em menos de 2h aumentam a taxa de conversão do lead em até 40%.
          </div>
        </div>

      </div>

      {/* 4. SEÇÃO: Conversão por Tipo de Desconto & Impacto Financeiro (Plano vs Adesão) */}
      <div className="corporate-card p-5 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-sky-100 rounded-lg text-sky-800">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                4. Conversão por Tipo de Desconto & Impacto Financeiro no Caixa
                <span className="text-xs font-semibold px-2 py-0.5 bg-sky-100 text-sky-900 rounded">
                  LTV vs Caixa de Entrada
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Cruzamento entre Desconto de Adesão (impacto no caixa pontual) vs Desconto no Plano Mensal (impacto no faturamento recorrente).
              </p>
            </div>
          </div>
        </div>

        {/* Diagnóstico Executivo de Impacto Financeiro */}
        <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl mb-6 text-xs text-sky-950 leading-relaxed flex items-start gap-2.5">
          <DollarSign className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-extrabold mb-0.5">
              Análise de Sangria de Receita:
            </strong>
            <p>{analiseConversao.diagnosticoImpacto}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Gráfico de Pizza 1: Volume de Solicitações */}
          <div className="lg:col-span-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 text-center mb-2">
              Volume de Solicitações (Unidades)
            </h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analiseConversao.dadosPizzaVolume}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {analiseConversao.dadosPizzaVolume.map((entry, index) => (
                      <Cell key={`cell-vol-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: string) => [`${val} solicitações`, name]}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} 
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-gray-200 text-gray-600">
              <span>Adesão: <strong>{analiseConversao.qtdAdesao} un.</strong></span>
              <span>Plano: <strong>{analiseConversao.qtdPlano} un.</strong></span>
            </div>
          </div>

          {/* Gráfico de Pizza 2: Impacto Financeiro Real em R$ */}
          <div className="lg:col-span-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 text-center mb-2">
              Impacto Financeiro Real (R$)
            </h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analiseConversao.dadosPizzaFinanceiro}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {analiseConversao.dadosPizzaFinanceiro.map((entry, index) => (
                       <Cell key={`cell-fin-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: string) => [`R$ ${Number(val).toFixed(2).replace('.', ',')}`, name || 'Renúncia']}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} 
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-gray-200 text-gray-600">
              <span>Adesão: <strong>R$ {analiseConversao.totalGastoAdesao.toFixed(2).replace('.', ',')}</strong></span>
              <span>Plano: <strong>R$ {analiseConversao.totalGastoPlano.toFixed(2).replace('.', ',')}</strong></span>
            </div>
          </div>

          {/* Painel Resumo Comparativo Estratégico */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-bold text-gray-700">Desconto em Adesão</span>
                <span className="text-xs font-extrabold text-[#005b2e]">
                  {analiseConversao.percentualAdesao}% do Total
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">
                Impacta a entrada imediata (máx R$ 200/veículo). Ticket Médio: <strong>R$ {analiseConversao.ticketMedioAdesao.toFixed(2).replace('.', ',')}</strong>.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-sky-200 shadow-2xs">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-bold text-gray-700">Desconto em Plano</span>
                <span className="text-xs font-extrabold text-sky-700">
                  {analiseConversao.percentualPlano}% do Total
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">
                Impacta a receita recorrente (MRR contratual). Ticket Médio: <strong>R$ {analiseConversao.ticketMedioPlano.toFixed(2).replace('.', ',')}</strong>.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-950 text-xs">
              <strong className="block font-bold mb-0.5">Recomendação Comercial:</strong>
              <p className="text-[11px] leading-snug">
                Priorizar desconto pontual na Adesão em detrimento do desconto no Plano mensal, preservando a margem de contribuição de longo prazo da carteira.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
});
