/**
 * @file src/components/inspections/InspectionRejectionModal.tsx
 * @description Modal de Reprovação de Vistoria com registro de motivo da não conformidade.
 */

import React, { useState } from 'react';
import { SolicitacaoVistoria } from '../../types';
import { sanitizeTextInput } from '../../utils/security';
import {
  XCircle,
  X,
  AlertTriangle,
  Car,
  User,
  ShieldAlert,
  AlertOctagon
} from 'lucide-react';

interface InspectionRejectionModalProps {
  vistoria: SolicitacaoVistoria | null;
  onClose: () => void;
  onConfirmReprovacao: (id: string, motivo: string, aprovador: string) => Promise<void> | void;
  defaultAprovador?: string;
}

export const InspectionRejectionModal: React.FC<InspectionRejectionModalProps> = ({
  vistoria,
  onClose,
  onConfirmReprovacao,
  defaultAprovador = 'Vistoriador'
}) => {
  if (!vistoria) return null;

  const [motivo, setMotivo] = useState<string>('');
  const [aprovador, setAprovador] = useState<string>(vistoria.vistoriador || defaultAprovador);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const motivosPredefinidos = [
    'Avarias estruturais graves não aceitas na proteção',
    'Chassi ou numeração de motor com sinais de adulteração/ilegível',
    'Veículo com sinistro/leilão não aceito nas regras',
    'Associado não compareceu / Não localizado no endereço',
    'Documentação divergente com os dados cadastrais'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMotivo = sanitizeTextInput(motivo, 2000);
    const cleanAprovador = sanitizeTextInput(aprovador, 100);

    if (!cleanMotivo.trim()) {
      setErro('Por favor, informe a justificativa detalhada da reprovação.');
      return;
    }

    if (!cleanAprovador.trim()) {
      setErro('Por favor, identifique o responsável pela decisão.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmReprovacao(vistoria.id, cleanMotivo, cleanAprovador);
      onClose();
    } catch (err: any) {
      setErro('Erro ao reprovar vistoria: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-200">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-red-800 to-red-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <XCircle className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Reprovar Vistoria Veicular</h3>
              <p className="text-xs text-red-100">Registro de não conformidade e cancelamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Vistoria */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-red-50/70 border border-red-200 p-3.5 rounded-xl space-y-2 text-xs text-red-950">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-red-900">{vistoria.nomeAssociado}</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-red-300">
                {vistoria.placa}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1 border-t border-red-200/60">
              <div>
                <strong className="text-red-900">Veículo:</strong> {vistoria.modeloCarro}
              </div>
              <div>
                <strong className="text-red-900">Vistoriador:</strong> {vistoria.vistoriador}
              </div>
            </div>
          </div>

          {/* Atalhos de motivos rápidos */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Motivos Frequentes de Não Conformidade:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {motivosPredefinidos.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMotivo(m);
                    if (erro) setErro(null);
                  }}
                  className="text-[10px] px-2.5 py-1 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-800 rounded-md border border-gray-200 transition-colors text-left"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Motivo da Reprovação */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Justificativa / Motivo Detalhado da Reprovação <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (erro) setErro(null);
                }}
                rows={4}
                className="w-full p-3 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 leading-relaxed text-gray-800"
                placeholder="Descreva detalhadamente o motivo que inviabilizou a aprovação da vistoria..."
              />
            </div>

            {/* Identificação do Responsável */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Responsável pelo Apontamento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={aprovador}
                onChange={(e) => setAprovador(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Nome do Vistoriador ou Líder"
              />
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirmar Reprovação</span>
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
