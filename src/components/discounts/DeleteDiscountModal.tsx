/**
 * @file src/components/discounts/DeleteDiscountModal.tsx
 * @description Modal seguro de exclusão de solicitações de desconto com validação criptográfica SHA-256.
 * Requer a Senha de Segurança Administrativa (a mesma de backup e apagamento do banco).
 * Ao excluir, o valor do desconto é deduzido dos cálculos de orçamento (Budget) e removido do banco.
 */

import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  X,
  Car,
  DollarSign
} from 'lucide-react';
import { SolicitacaoDesconto } from '../../types';
import { verifyAdminAuthorization } from '../../utils/security';
import { formatarMoedaBRL, formatarPercentual } from '../../utils/finance';

interface DeleteDiscountModalProps {
  solicitacao: SolicitacaoDesconto | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void>;
}

export const DeleteDiscountModal: React.FC<DeleteDiscountModalProps> = ({
  solicitacao,
  isOpen,
  onClose,
  onConfirmDelete
}) => {
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Limpa estados ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setSenhaInput('');
      setMostrarSenha(false);
      setErro(null);
      setIsDeleting(false);
    }
  }, [isOpen, solicitacao]);

  if (!isOpen || !solicitacao) return null;

  const handleExcluir = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!senhaInput.trim()) {
      setErro('Digite a Senha de Segurança para autorizar a exclusão.');
      return;
    }

    // Validação criptográfica com a mesma senha de segurança administrativa
    const senhaCorreta = verifyAdminAuthorization(senhaInput);
    if (!senhaCorreta) {
      setErro('Senha de Segurança incorreta. Acesso não autorizado.');
      return;
    }

    try {
      setIsDeleting(true);
      await onConfirmDelete(solicitacao.id);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir solicitação de desconto:', err);
      setErro('Ocorreu um erro ao processar a exclusão. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      id="delete-discount-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div 
        id="delete-discount-modal-card"
        className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-red-200 space-y-4 relative"
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="p-3 bg-red-100 text-red-700 rounded-xl border border-red-200 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight flex items-center gap-1.5">
              Excluir Solicitação de Desconto
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Esta ação removerá o registro e recalculará a soma do orçamento mensal.
            </p>
          </div>
        </div>

        {/* Resumo do Item a ser Excluído */}
        <div className="bg-red-50/60 rounded-xl p-3.5 border border-red-100 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-red-200/60">
            <span className="font-bold text-gray-900 text-sm truncate max-w-[220px]" title={solicitacao.cliente}>
              {solicitacao.cliente}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-800">
              <Car className="w-3 h-3 text-gray-500" /> {solicitacao.placa}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-gray-700">
            <div>
              <span className="text-[10px] text-gray-500 block">Supervisora:</span>
              <span className="font-semibold">{solicitacao.supervisora}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 block">Consultor:</span>
              <span className="font-semibold">{solicitacao.consultor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-red-200/60">
            <div>
              <span className="text-[10px] text-gray-500 block">Modalidade:</span>
              <span className="font-semibold text-gray-800">{solicitacao.tipoDesconto}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 block">Desconto a sair da soma:</span>
              <span className="text-sm font-extrabold text-red-700">
                - {formatarMoedaBRL(solicitacao.valorDescontoCalculado)}
              </span>
            </div>
          </div>
        </div>

        {/* Aviso sobre recálculo do orçamento */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Impacto no Budget:</strong> O valor de <strong>{formatarMoedaBRL(solicitacao.valorDescontoCalculado)}</strong> será estornado e o saldo disponível da liderança será liberado imediatamente.
          </p>
        </div>

        {/* Formulário com Senha de Segurança */}
        <form onSubmit={handleExcluir} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-600" />
                Senha de Segurança (Backup / Apagamento):
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Autenticação obrigatória</span>
            </label>

            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senhaInput}
                onChange={(e) => {
                  setSenhaInput(e.target.value);
                  if (erro) setErro(null);
                }}
                placeholder="Digite a Senha de Segurança..."
                disabled={isDeleting}
                autoFocus
                className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {erro && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg text-xs font-semibold text-red-800 flex items-center gap-1.5 animate-shake">
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isDeleting || !senhaInput.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 min-h-[40px]"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Definitivamente</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
