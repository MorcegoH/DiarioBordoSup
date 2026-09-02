/**
 * @file src/components/inspections/InspectionDeleteModal.tsx
 * @description Modal de confirmação segura para exclusão de solicitação de vistoria.
 */

import React, { useState } from 'react';
import { SolicitacaoVistoria } from '../../types';
import {
  Trash2,
  X,
  AlertTriangle,
  Car,
  User,
  ShieldAlert
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
  if (!vistoria) return null;

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(vistoria.id);
      onClose();
    } catch (err: any) {
      alert('Erro ao excluir registro de vistoria: ' + (err?.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-200">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-red-700 to-red-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Excluir Solicitação de Vistoria</h3>
              <p className="text-xs text-red-100">Confirmação de exclusão permanente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-white/10 transition-colors"
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
                Você está prestes a remover o registro de vistoria de <strong>{vistoria.nomeAssociado}</strong> ({vistoria.modeloCarro} - Placa <strong>{vistoria.placa}</strong>).
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1.5 text-gray-700">
            <div><strong>Vistoriador:</strong> {vistoria.vistoriador}</div>
            <div><strong>Data:</strong> {vistoria.dataVistoria} às {vistoria.horarioVistoria}</div>
            <div><strong>Status Atual:</strong> {vistoria.status}</div>
            <div><strong>Taxa de Adesão:</strong> R$ {vistoria.valorAdesao.toFixed(2)} ({vistoria.adesaoPaga ? 'Paga' : 'A receber'})</div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        </div>
      </div>
    </div>
  );
};
