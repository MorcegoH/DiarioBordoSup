/**
 * @file src/components/inspections/InspectionApprovalModal.tsx
 * @description Modal de Aprovação e Emissão de Parecer Técnico para Solicitações de Vistoria.
 */

import React, { useState } from 'react';
import { SolicitacaoVistoria } from '../../types';
import { sanitizeTextInput } from '../../utils/security';
import {
  CheckCircle2,
  X,
  Car,
  User,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface InspectionApprovalModalProps {
  vistoria: SolicitacaoVistoria | null;
  onClose: () => void;
  onConfirmAprovacao: (id: string, parecer: string, aprovador: string, adesaoRecebida: boolean) => Promise<void> | void;
  defaultAprovador?: string;
}

export const InspectionApprovalModal: React.FC<InspectionApprovalModalProps> = ({
  vistoria,
  onClose,
  onConfirmAprovacao,
  defaultAprovador = 'Vistoriador'
}) => {
  if (!vistoria) return null;

  const [parecer, setParecer] = useState<string>(
    'Vistoria presencial realizada com sucesso. Veículo em conformidade com as diretrizes de proteção veicular, sem avarias impeditivas e com numerações de chassi e motor devidamente conferidas.'
  );
  const [aprovador, setAprovador] = useState<string>(vistoria.vistoriador || defaultAprovador);
  const [adesaoRecebida, setAdesaoRecebida] = useState<boolean>(vistoria.adesaoPaga);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanParecer = sanitizeTextInput(parecer, 2000);
    const cleanAprovador = sanitizeTextInput(aprovador, 100);

    if (!cleanParecer.trim()) {
      setErro('Por favor, informe o parecer técnico ou observações da aprovação da vistoria.');
      return;
    }

    if (!cleanAprovador.trim()) {
      setErro('Por favor, identifique o responsável pela aprovação/vistoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmAprovacao(vistoria.id, cleanParecer, cleanAprovador, adesaoRecebida);
      onClose();
    } catch (err: any) {
      setErro('Erro ao aprovar vistoria: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-200">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Aprovar Vistoria Veicular</h3>
              <p className="text-xs text-emerald-100">Emissão de parecer e conclusão do laudo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Vistoria */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl space-y-2 text-xs text-emerald-950">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-emerald-900">{vistoria.nomeAssociado}</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                {vistoria.placa} ({vistoria.tipoPlaca || 'Placa'})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1 border-t border-emerald-200/60">
              <div>
                <strong className="text-emerald-900">Veículo:</strong> {vistoria.modeloCarro}
              </div>
              <div>
                <strong className="text-emerald-900">Vistoriador:</strong> {vistoria.vistoriador}
              </div>
              <div>
                <strong className="text-emerald-900">Agendado:</strong> {vistoria.dataVistoria} às {vistoria.horarioVistoria}
              </div>
              <div>
                <strong className="text-emerald-900">Adesão:</strong> R$ {vistoria.valorAdesao.toFixed(2)}
              </div>
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parecer Técnico */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Parecer Técnico do Vistoriador / Observações <span className="text-red-500">*</span>
              </label>
              <textarea
                value={parecer}
                onChange={(e) => {
                  setParecer(e.target.value);
                  if (erro) setErro(null);
                }}
                rows={4}
                className="w-full p-3 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 leading-relaxed text-gray-800"
                placeholder="Descreva o parecer de conformidade do veículo..."
              />
            </div>

            {/* Confirmação de Recebimento da Adesão */}
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
              <label className="text-xs font-bold text-gray-800 block">
                Status Financeiro da Taxa de Adesão (R$ {vistoria.valorAdesao.toFixed(2)})
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={adesaoRecebida}
                  onChange={(e) => setAdesaoRecebida(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span className={adesaoRecebida ? 'font-bold text-emerald-900' : 'text-gray-700'}>
                  {adesaoRecebida
                    ? 'Adesão confirmada e recebida com sucesso'
                    : 'Adesão permanece pendente de recebimento'}
                </span>
              </label>
            </div>

            {/* Identificação do Aprovador */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Responsável pelo Laudo / Aprovação <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={aprovador}
                onChange={(e) => setAprovador(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Aprovação</span>
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
