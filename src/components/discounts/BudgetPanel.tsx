/**
 * @file src/components/discounts/BudgetPanel.tsx
 * @description Card e Painel de Orçamento Mensal (Budget) com divisão por Supervisora e Reserva do Gerente.
 */

import React from 'react';
import { BudgetState } from '../../types';
import { 
  Wallet, 
  Shield, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  Clock, 
  Calendar, 
  RotateCw, 
  Info,
  CalendarDays
} from 'lucide-react';

interface BudgetPanelProps {
  budget: BudgetState;
  onOpenManagerRelease?: () => void;
  mesesDisponiveis?: { mesAno: string; label: string; count: number }[];
  mesSelecionado?: string;
  onChangeMes?: (mes: string) => void;
}

export const BudgetPanel: React.FC<BudgetPanelProps> = React.memo(({ 
  budget, 
  onOpenManagerRelease,
  mesesDisponiveis,
  mesSelecionado,
  onChangeMes
}) => {
  const { ciclo } = budget;

  // Saldo Total consolidado = saldo Débora (unificado R$ 700) + Reserva Gerente (R$ 200)
  const saldoTotalDepartamento = 
    budget.debora.saldoDisponivel + 
    (budget.marilia?.saldoDisponivel || 0) + 
    budget.reservaGerente;

  const totalGastoDepartamento = 
    budget.debora.totalUtilizado + 
    (budget.marilia?.totalUtilizado || 0) +
    (budget.gerente?.totalUtilizado || 0);

  const percentualTotalGasto = Math.min(100, (totalGastoDepartamento / budget.tetoTotalDepartamento) * 100);

  const getPercentualUtilizado = (utilizado: number, teto: number) => {
    if (!teto || teto <= 0) return 0;
    return Math.min(100, (utilizado / teto) * 100);
  };

  const deboraPerc = getPercentualUtilizado(budget.debora.totalUtilizado, budget.debora.tetoMensal);

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8 relative border-l-4 border-l-[#005b2e] bg-white shadow-xs">
      
      {/* 1. Barra Informativa de Período e Renovação Mensal */}
      <div className="mb-4 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-2.5 text-emerald-950">
          <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 bg-[#005b2e] text-white rounded-lg shadow-xs">
            <CalendarDays className="w-3.5 h-3.5" />
            {ciclo.mesExtenso}
          </span>
        </div>

        {/* Seletor de Mês e Alerta de Renovação */}
        <div className="flex items-center gap-3">
          {mesesDisponiveis && mesesDisponiveis.length > 0 && onChangeMes && (
            <div className="flex items-center gap-1.5">
              <label className="text-gray-600 font-semibold text-[11px] whitespace-nowrap">
                Filtrar Ciclo:
              </label>
              <select
                value={mesSelecionado || ciclo.mesAno}
                onChange={(e) => onChangeMes(e.target.value)}
                className="bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-900 focus:ring-2 focus:ring-[#005b2e] cursor-pointer"
              >
                {mesesDisponiveis.map((m) => (
                  <option key={m.mesAno} value={m.mesAno}>
                    {m.label} {m.mesAno === budget.ciclo.mesAno && budget.ciclo.isMesAtual ? '(Atual)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-900 shadow-2xs">
            <RotateCw className="w-3 h-3 text-[#005b2e] shrink-0" />
            <span>
              Liberação em: <strong>{ciclo.dataProximaRenovacao}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Cabeçalho do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 rounded-lg text-primary-green">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800">
                Painel de Orçamento Mensal de Descontos
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                Teto Mensal: R$ {budget.tetoTotalDepartamento.toFixed(2).replace('.', ',')}
              </span>
              {ciclo.isMesAtual ? (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  ● Ciclo Vigente
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                  Histórico do Ciclo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Valores estritamente mensais (renovados todo dia 01) com apuração em tempo real por supervisão.
            </p>
          </div>
        </div>

        {/* Resumo do Saldo Global */}
        <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block">
              Saldo Restante do Mês
            </span>
            <span className={`text-lg font-bold ${saldoTotalDepartamento > 200 ? 'text-[#005b2e]' : 'text-amber-700'}`}>
              R$ {saldoTotalDepartamento.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block">
              Concedido no Mês
            </span>
            <span className="text-sm font-bold text-gray-700">
              R$ {totalGastoDepartamento.toFixed(2).replace('.', ',')} ({percentualTotalGasto.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Cards de Orçamento: Débora Rodrigues (Supervisão Unificada) e Reserva Gerente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card Supervisora Débora Rodrigues (Supervisão Unificada) */}
        <div className={`p-4 sm:p-5 rounded-xl border transition-all ${
          budget.debora.saldoDisponivel <= 0
            ? 'bg-red-50/70 border-red-300'
            : budget.debora.saldoDisponivel < 100
            ? 'bg-amber-50/60 border-amber-300'
            : 'bg-white border-gray-200 hover:border-emerald-300 shadow-2xs'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#005b2e] font-extrabold flex items-center justify-center text-sm shadow-2xs">
                DR
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Débora Rodrigues</h3>
                <span className="text-xs text-emerald-800 font-semibold">Supervisora Geral — Inside Sales</span>
              </div>
            </div>
            {budget.debora.saldoDisponivel <= 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-red-100 text-red-800 rounded-md border border-red-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Teto Esgotado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-emerald-50 text-[#005b2e] rounded-md border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" /> Ativo ({ciclo.mesCurto})
              </span>
            )}
          </div>

          <div className="space-y-2 my-4">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-gray-600 font-semibold">Saldo Mensal Disponível:</span>
              <span className={`font-extrabold text-lg ${budget.debora.saldoDisponivel <= 0 ? 'text-red-700' : 'text-[#005b2e]'}`}>
                R$ {budget.debora.saldoDisponivel.toFixed(2).replace('.', ',')}
              </span>
            </div>
            
            {/* Barra de Progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  deboraPerc >= 100 ? 'bg-red-600' : deboraPerc > 75 ? 'bg-amber-500' : 'bg-primary-green'
                }`}
                style={{ width: `${deboraPerc}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Utilizado: <strong>R$ {budget.debora.totalUtilizado.toFixed(2).replace('.', ',')}</strong> ({deboraPerc.toFixed(0)}%)</span>
              <span>Teto da Supervisão: <strong>R$ {budget.debora.tetoMensal.toFixed(2).replace('.', ',')}/mês</strong></span>
            </div>
          </div>

          {budget.debora.totalPendente > 0 && (
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-amber-700 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Solicitações em análise:
              </span>
              <span className="font-bold">R$ {budget.debora.totalPendente.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>

        {/* Card Reserva Exclusiva do Gerente Heder Santos */}
        <div className={`p-4 sm:p-5 rounded-xl border relative overflow-hidden transition-all ${
          budget.reservaGerente <= 0 
            ? 'border-red-300 bg-red-50/40' 
            : 'border-gray-200 bg-gray-50 shadow-2xs'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-full font-extrabold flex items-center justify-center text-sm shadow-2xs ${
                budget.reservaGerente <= 0 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-emerald-100 text-[#005b2e]'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Heder Santos</h3>
                <span className="text-xs text-emerald-800 font-semibold">Gerente de Vendas (Aprovador)</span>
              </div>
            </div>
            {budget.reservaGerente <= 0 ? (
              <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 bg-red-100 text-red-800 rounded-md border border-red-300">
                Teto Esgotado ({ciclo.mesCurto})
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-300">
                Reserva de Contingência
              </span>
            )}
          </div>

          <div className="space-y-2 my-4">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-gray-600 font-semibold">Saldo Restante ({ciclo.mesCurto}):</span>
              <span className={`font-extrabold text-lg ${budget.reservaGerente <= 0 ? 'text-red-700' : 'text-[#005b2e]'}`}>
                R$ {budget.reservaGerente.toFixed(2).replace('.', ',')}
              </span>
            </div>
            
            {/* Barra de progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  budget.reservaGerente <= 0 
                    ? 'bg-red-600 w-full' 
                    : 'bg-primary-green'
                }`}
                style={{ 
                  width: `${budget.gerente ? Math.min(100, (budget.gerente.totalUtilizado / budget.gerente.tetoMensal) * 100) : 0}%` 
                }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>Utilizado: <strong>R$ {(budget.gerente?.totalUtilizado || 0).toFixed(2).replace('.', ',')}</strong></span>
              <span>Teto Gerencial: <strong>R$ {(budget.gerente?.tetoMensal || 200).toFixed(2).replace('.', ',')}/mês</strong></span>
            </div>

            {budget.reservaGerente <= 0 ? (
              <div className="p-2.5 bg-red-100/70 border border-red-300 rounded text-xs text-red-900 mt-2 flex items-start gap-1.5 font-medium">
                <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <span>O teto mensal do Gerente (R$ 200,00) em {ciclo.mesCurto} foi atingido. Próxima liberação em {ciclo.dataProximaRenovacao}.</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 pt-1 leading-snug">
                Reserva estratégica mensal para exceções comerciais autorizadas diretamente pela gerência.
              </p>
            )}

            {onOpenManagerRelease && (
              <button
                type="button"
                onClick={onOpenManagerRelease}
                className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  budget.reservaGerente <= 0
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                    : 'bg-[#005b2e] hover:bg-emerald-800 text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-200" />
                <span>{budget.reservaGerente <= 0 ? 'Consultar / Registrar Liberação' : 'Registrar Desconto do Gerente'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
});

