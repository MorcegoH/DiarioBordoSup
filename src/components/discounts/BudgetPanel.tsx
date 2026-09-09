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
      
      {/* Cabeçalho Consolidado e Limpo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-1.5 bg-emerald-50 rounded-lg text-primary-green">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-gray-900">
              Orçamento Mensal de Descontos
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Teto Global: R$ {budget.tetoTotalDepartamento.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
              {ciclo.mesExtenso}
            </span>
          </div>
        </div>

        {/* Resumo do Saldo & Seletor de Ciclo */}
        <div className="flex items-center gap-3 flex-wrap">
          {mesesDisponiveis && mesesDisponiveis.length > 1 && onChangeMes && (
            <select
              value={mesSelecionado || ciclo.mesAno}
              onChange={(e) => onChangeMes(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
            >
              {mesesDisponiveis.map((m) => (
                <option key={m.mesAno} value={m.mesAno}>
                  {m.label} {m.mesAno === budget.ciclo.mesAno && budget.ciclo.isMesAtual ? '(Atual)' : ''}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-3 bg-gray-50 px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Saldo Global</span>
              <span className={`font-bold text-sm ${saldoTotalDepartamento > 100 ? 'text-[#005b2e]' : 'text-amber-700'}`}>
                R$ {saldoTotalDepartamento.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Utilizado</span>
              <span className="font-bold text-sm text-gray-800">
                R$ {totalGastoDepartamento.toFixed(2).replace('.', ',')} ({percentualTotalGasto.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cards: Débora Rodrigues (Supervisão Unificada) e Reserva do Gerente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Supervisão Unificada (Débora Rodrigues) */}
        <div className={`p-4 rounded-xl border transition-colors ${
          budget.debora.saldoDisponivel <= 0
            ? 'bg-red-50/50 border-red-200'
            : budget.debora.saldoDisponivel < 100
            ? 'bg-amber-50/40 border-amber-200'
            : 'bg-white border-gray-200 hover:border-emerald-300'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Débora Rodrigues</h3>
              <p className="text-xs text-gray-500">Supervisão — Inside Sales</p>
            </div>
            {budget.debora.saldoDisponivel <= 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded border border-red-200">
                Esgotado
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                Ativo
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-gray-600 font-medium">Saldo Disponível:</span>
              <span className={`font-extrabold text-base ${budget.debora.saldoDisponivel <= 0 ? 'text-red-700' : 'text-[#005b2e]'}`}>
                R$ {budget.debora.saldoDisponivel.toFixed(2).replace('.', ',')}
              </span>
            </div>
            
            {/* Barra de Progresso */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  deboraPerc >= 100 ? 'bg-red-600' : deboraPerc > 75 ? 'bg-amber-500' : 'bg-[#005b2e]'
                }`}
                style={{ width: `${deboraPerc}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-0.5">
              <span>Utilizado: <strong>R$ {budget.debora.totalUtilizado.toFixed(2).replace('.', ',')}</strong> ({deboraPerc.toFixed(0)}%)</span>
              <span>Teto: <strong>R$ {budget.debora.tetoMensal.toFixed(2).replace('.', ',')}</strong></span>
            </div>
          </div>

          {budget.debora.totalPendente > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-amber-800 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Em análise:
              </span>
              <span className="font-bold">R$ {budget.debora.totalPendente.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>

        {/* Card 2: Reserva Exclusiva do Gerente (Heder Santos) */}
        <div className={`p-4 rounded-xl border transition-colors ${
          budget.reservaGerente <= 0 
            ? 'border-red-200 bg-red-50/40' 
            : 'border-gray-200 bg-white hover:border-emerald-300'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Heder Santos</h3>
              <p className="text-xs text-gray-500">Gerência de Vendas (Reserva)</p>
            </div>
            {budget.reservaGerente <= 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded border border-red-200">
                Esgotado
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                Contingência
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-gray-600 font-medium">Saldo Disponível:</span>
              <span className={`font-extrabold text-base ${budget.reservaGerente <= 0 ? 'text-red-700' : 'text-[#005b2e]'}`}>
                R$ {budget.reservaGerente.toFixed(2).replace('.', ',')}
              </span>
            </div>
            
            {/* Barra de Progresso */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  budget.reservaGerente <= 0 
                    ? 'bg-red-600 w-full' 
                    : 'bg-[#005b2e]'
                }`}
                style={{ 
                  width: `${budget.gerente ? Math.min(100, (budget.gerente.totalUtilizado / budget.gerente.tetoMensal) * 100) : 0}%` 
                }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 pt-0.5">
              <span>Utilizado: <strong>R$ {(budget.gerente?.totalUtilizado || 0).toFixed(2).replace('.', ',')}</strong></span>
              <span>Teto: <strong>R$ {(budget.gerente?.tetoMensal || 200).toFixed(2).replace('.', ',')}</strong></span>
            </div>

            {onOpenManagerRelease && (
              <button
                type="button"
                onClick={onOpenManagerRelease}
                className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors bg-[#005b2e] hover:bg-emerald-800 text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Registrar Desconto da Gerência</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
});

