/**
 * @file src/components/inspections/InspectionDeleteModal.tsx
 * @description Modal seguro de confirmação para exclusão de solicitação de vistoria com validação criptográfica SHA-256.
 * Requer a mesma Senha de Segurança Administrativa (a mesma utilizada na exclusão de descontos e manutenção do banco).
 */

import React, { useState, useEffect } from 'react';
import { SolicitacaoVistoria } from '../../types';
import { verifyAdminAuthorization } from '../../utils/security';
import { formatarMoedaBRL } from '../../utils/finance';
import {
  Trash2,
  X,
  AlertTriangle,
  Car,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  User,
  Calendar
} from 'lucide-react';

interface InspectionDeleteModalProps {
  vistoria: SolicitacaoVistoria | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void> | void;
}

export const InspectionDeleteModal: React.FC<InspectionDeleteModalProps> = ({
  vistoria,
  onClose,
  onConfirmDelete
}) => {
  const [senhaInput, setSenhaInput] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Limpa estados ao abrir/fechar
  useEffect(() => {
    if (vistoria) {
      setSenhaInput('');
      setMostrarSenha(false);
      setErro(null);
      setIsDeleting(false);
    }
  }, [vistoria]);

  if (!vistoria) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!senhaInput.trim()) {
      setErro('Digite a Senha de Segurança para autorizar a exclusão.');
      return;
    }

    // Validação criptográfica com a mesma senha de segurança administrativa da exclusão de desconto
    const senhaCorreta = verifyAdminAuthorization(senhaInput);
    if (!senhaCorreta) {
      setErro('Senha de Segurança incorreta. Acesso não autorizado.');
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirmDelete(vistoria.id);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir registro de vistoria:', err);
      setErro('Ocorreu um erro ao processar a exclusão: ' + (err?.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      id="delete-inspection-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div 
        id="delete-inspection-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-200 relative"
      >
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-red-700 to-red-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Excluir Solicitação de Vistoria</h3>
              <p className="text-xs text-red-100">Confirmação com Senha de Segurança</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-3.5 rounded-xl text-red-950 text-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Atenção: Ação irreversível!</span>
              <p className="text-red-900 leading-relaxed">
                Você está prestes a remover o registro de vistoria do associado <strong>{vistoria.nomeAssociado}</strong> ({vistoria.modeloCarro} - Placa <strong>{vistoria.placa}</strong>).
              </p>
            </div>
          </div>

          {/* Resumo do Item */}
          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-200 text-xs space-y-2 text-gray-700">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-500" />
                {vistoria.nomeAssociado}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-800">
                <Car className="w-3 h-3 text-gray-500" /> {vistoria.placa}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 block">Vistoriador:</span>
                <span className="font-semibold text-gray-800">{vistoria.vistoriador}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Agendamento:</span>
                <span className="font-semibold text-gray-800">{vistoria.dataVistoria} às {vistoria.horarioVistoria}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
              <div>
                <span className="text-[10px] text-gray-500 block">Status Atual:</span>
                <span className="font-semibold text-gray-800">{vistoria.status}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block">Taxa de Adesão:</span>
                <span className="font-bold text-gray-900">
                  {formatarMoedaBRL(vistoria.valorAdesao)} ({vistoria.adesaoPaga ? 'Paga' : 'A receber'})
                </span>
              </div>
            </div>
          </div>

          {/* Formulário com Validação por Senha */}
          <form onSubmit={handleDelete} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-red-600" />
                  Senha de Segurança (Exclusão & Auditoria):
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
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 min-h-[40px]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isDeleting || !senhaInput.trim()}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 min-h-[40px]"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

