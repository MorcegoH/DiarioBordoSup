/**
 * @file src/components/discounts/RejectionModal.tsx
 * @description Modal de Reprovação de Desconto (Visão Gerente Heder Santos).
 * Exige Parecer do Gerente (obrigatório), não exige senha.
 */

import React, { useState } from 'react';
import { SolicitacaoDesconto } from '../../types';
import { sanitizeTextInput } from '../../utils/security';
import { XCircle, AlertCircle, X } from 'lucide-react';

interface RejectionModalProps {
  solicitacao: SolicitacaoDesconto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReprovacao: (id: string, parecer: string, aprovador: string) => void;
}

export const RejectionModal: React.FC<RejectionModalProps> = React.memo(({
  solicitacao,
  isOpen,
  onClose,
  onConfirmReprovacao
}) => {
  const [parecer, setParecer] = useState<string>('');

  if (!isOpen || !solicitacao) return null;

  const handleReprovar = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanParecer = sanitizeTextInput(parecer, 1500);
    if (!cleanParecer.trim()) {
      alert('Por favor, informe o motivo da recusa / parecer do Gerente.');
      return;
    }

    onConfirmReprovacao(solicitacao.id, cleanParecer, 'Heder Santos (Gerente)');
    setParecer('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-red-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              <XCircle className="w-6 h-6 text-red-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                Reprovar Solicitação de Desconto
              </h3>
              <p className="text-xs text-red-100/90 font-medium">
                Devolução com parecer obrigatório • Gerente: <strong>Heder Santos</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <form onSubmit={handleReprovar} className="p-5 sm:p-6 space-y-4">
          
          <div className="p-3.5 bg-red-50/60 rounded-lg border border-red-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Cliente:</span>
              <span className="font-bold text-gray-800">{solicitacao.cliente}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Placa:</span>
              <span className="font-mono font-bold text-gray-800">{solicitacao.placa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Supervisora:</span>
              <span className="font-semibold text-gray-800">{solicitacao.supervisora} ({solicitacao.consultor})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Desconto Solicitado:</span>
              <span className="font-bold text-red-700">
                R$ {solicitacao.valorDescontoCalculado.toFixed(2).replace('.', ',')} ({solicitacao.percentualDesconto.toFixed(1).replace('.', ',')}%)
              </span>
            </div>
          </div>

          {/* Parecer do Gerente Obrigatório */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              Parecer do Gerente / Motivo da Recusa *
            </label>
            <textarea
              required
              rows={3}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="Descreva o motivo da não aprovação (Ex: Desconto fora da política para pessoa física, margem insuficiente, ou negociar pacote com adesão padrão)..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 text-gray-800"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Este parecer ficará registrado no histórico da solicitação para feedback do consultor.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>Confirmar Reprovação</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
});
