/**
 * @file src/components/discounts/ApprovalModal.tsx
 * @description Modal de Aprovação de Desconto (Visão Gerente Heder Santos).
 * Exige Senha de Segurança do Sistema e Parecer / Autorização escrito.
 */

import React, { useState } from 'react';
import { SolicitacaoDesconto } from '../../types';
import { verifyApprovalAuthorization, sanitizeTextInput } from '../../utils/security';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';

interface ApprovalModalProps {
  solicitacao: SolicitacaoDesconto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAprovacao: (id: string, parecer: string, aprovador: string) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = React.memo(({
  solicitacao,
  isOpen,
  onClose,
  onConfirmAprovacao
}) => {
  const [senhaInput, setSenhaInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [parecer, setParecer] = useState<string>('Autorizado conforme política comercial.');
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  if (!isOpen || !solicitacao) return null;

  const handleAprovar = (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha(null);

    const trimmedPass = senhaInput.trim();
    // Valida a senha específica e exclusiva de aprovação de descontos (via Hash SHA-256 seguro)
    const isSenhaValida = verifyApprovalAuthorization(trimmedPass);

    if (!isSenhaValida) {
      setErroSenha('Senha de Segurança incorreta! Insira a senha autorizada para aprovação de descontos.');
      return;
    }

    const cleanParecer = sanitizeTextInput(parecer, 1500);
    if (!cleanParecer.trim()) {
      alert('Por favor, informe o Parecer / Autorização escrito.');
      return;
    }

    onConfirmAprovacao(solicitacao.id, cleanParecer, 'Heder Santos (Gerente)');
    setSenhaInput('');
    setErroSenha(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-[#005b2e] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                Aprovação de Desconto
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium">
                Workflow Gerencial • Aprovador: <strong>Heder Santos</strong>
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

        {/* Corpo do Modal */}
        <form onSubmit={handleAprovar} className="p-5 sm:p-6 space-y-4">
          
          {/* Card Resumo da Solicitação */}
          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
            <div className="flex justify-between border-b border-gray-200 pb-1.5">
              <span className="text-gray-500 font-medium">Cliente:</span>
              <span className="font-bold text-gray-800">{solicitacao.cliente}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Veículo / Placa:</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                {solicitacao.placa}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Supervisora / Consultor:</span>
              <span className="font-semibold text-gray-800">
                {solicitacao.supervisora} • {solicitacao.consultor}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-gray-200">
              <span className="text-gray-500 font-medium">Tipo / Valor Cheio:</span>
              <span className="font-semibold text-gray-800">
                {solicitacao.tipoDesconto} • R$ {solicitacao.valorCheio.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <span className="text-emerald-900 font-bold">Desconto Concedido:</span>
              <span className="font-bold text-sm text-[#005b2e]">
                R$ {solicitacao.valorDescontoCalculado.toFixed(2).replace('.', ',')} ({solicitacao.percentualDesconto.toFixed(1).replace('.', ',')}%)
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Valor Final Cliente:</span>
              <span className="font-bold text-gray-900">
                R$ {solicitacao.valorFinal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Justificativa Original */}
          <div className="text-xs">
            <span className="text-gray-500 font-medium block mb-0.5">Justificativa da Supervisão:</span>
            <p className="text-gray-700 bg-amber-50 p-2 rounded-lg border border-amber-200 italic">
              "{solicitacao.justificativa}"
            </p>
          </div>

          {/* Campo de Senha de Segurança */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-900">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                Senha de Segurança do Sistema *
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Exigida para homologação financeira</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={senhaInput}
                onChange={(e) => {
                  setSenhaInput(e.target.value);
                  setErroSenha(null);
                }}
                placeholder="Informe a senha gerencial..."
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] text-gray-800 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroSenha && (
              <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {erroSenha}
              </p>
            )}
          </div>

          {/* Campo de Parecer / Autorização */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Parecer / Autorização do Gerente *
            </label>
            <textarea
              required
              rows={2}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="Descreva a autorização formal ou condição comercial..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] text-gray-800"
            />
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
              className="px-5 py-2 text-sm font-bold text-white bg-primary-green hover:bg-emerald-800 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Aprovar Desconto</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
});
