/**
 * @file src/components/inspections/InspectionDetailsModal.tsx
 * @description Modal para visualização completa de detalhes, laudos, hiperlinks externos,
 * localização e status financeiro de uma solicitação de vistoria.
 * Totalmente otimizado para mobile e com segurança de links externos.
 */

import React from 'react';
import { SolicitacaoVistoria } from '../../types';
import { sanitizeSafeUrl, getSafeWhatsAppUrl, getSafePhoneCallUrl } from '../../utils/security';
import {
  X,
  Car,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  FileCheck,
  MessageCircle,
  ShieldCheck,
  Navigation
} from 'lucide-react';

interface InspectionDetailsModalProps {
  vistoria: SolicitacaoVistoria | null;
  onClose: () => void;
  onOpenAprovar?: (item: SolicitacaoVistoria) => void;
  onOpenReprovar?: (item: SolicitacaoVistoria) => void;
}

export const InspectionDetailsModal: React.FC<InspectionDetailsModalProps> = ({
  vistoria,
  onClose,
  onOpenAprovar,
  onOpenReprovar
}) => {
  if (!vistoria) return null;

  const mapsUrl = sanitizeSafeUrl(vistoria.localizacaoMaps);
  const laudoUrl = sanitizeSafeUrl(vistoria.linkVistoria);
  const faturaUrl = sanitizeSafeUrl(vistoria.linkPagamento);
  const whatsAppUrl = getSafeWhatsAppUrl(
    vistoria.contato,
    `Olá ${vistoria.nomeAssociado}, sou da equipe de vistorias sobre o veículo ${vistoria.modeloCarro} (${vistoria.placa}).`
  );
  const phoneCallUrl = getSafePhoneCallUrl(vistoria.contato);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 max-h-[92vh] flex flex-col my-auto">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-[#005b2e] to-[#007a3d] px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Car className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Ficha Completa de Vistoria</h3>
              <p className="text-xs text-emerald-100">ID: {vistoria.id}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem suave */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Status Badge & Destaque */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Status da Vistoria
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    vistoria.status === 'Aprovado'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : vistoria.status === 'Reprovado'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {vistoria.status === 'Aprovado' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {vistoria.status === 'Reprovado' && <XCircle className="w-3.5 h-3.5" />}
                  {vistoria.status === 'Aguardando Vistoria' && <Clock className="w-3.5 h-3.5" />}
                  <span>{vistoria.status}</span>
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Taxa de Adesão
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-gray-900">
                  R$ {Number(vistoria.valorAdesao || 0).toFixed(2).replace('.', ',')}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    vistoria.adesaoPaga
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {vistoria.adesaoPaga ? 'Paga' : 'A receber pelo vistoriador'}
                </span>
              </div>
            </div>
          </div>

          {/* Dados do Associado e Veículo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Associado */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Dados do Associado</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Nome:</span>
                  <strong className="text-gray-900 text-sm">{vistoria.nomeAssociado}</strong>
                </div>

                <div>
                  <span className="text-gray-500 block">Contato / Telefone:</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <strong className="text-gray-900 font-mono text-xs">{vistoria.contato}</strong>
                    {whatsAppUrl && (
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {phoneCallUrl && (
                      <a
                        href={phoneCallUrl}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        <span>Ligar</span>
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block">Solicitante no Inside Sales:</span>
                  <span className="text-gray-800 font-medium">{vistoria.solicitante || '—'}</span>
                </div>
              </div>
            </div>

            {/* Veículo */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Car className="w-4 h-4 text-emerald-700" />
                <span>Dados do Veículo</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-500 block">Modelo do Carro:</span>
                  <strong className="text-gray-900 text-sm">{vistoria.modeloCarro}</strong>
                </div>

                <div>
                  <span className="text-gray-500 block">Placa do Veículo:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong className="text-gray-900 font-mono text-sm bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300">
                      {vistoria.placa}
                    </strong>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {vistoria.tipoPlaca || 'Padrão'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block">Vistoriador Designado:</span>
                  <span className="text-gray-900 font-bold">{vistoria.vistoriador}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Agendamento e Localização */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Agendamento & Localização</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Data e Horário:</span>
                <strong className="text-gray-900 text-sm">
                  {vistoria.dataVistoria} às {vistoria.horarioVistoria}
                </strong>
              </div>

              <div>
                <span className="text-gray-500 block">Data de Registro:</span>
                <span className="text-gray-700">
                  {new Date(vistoria.dataHoraSolicitacao).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Link Google Maps */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-gray-500 text-xs block mb-1">Localização (Google Maps):</span>
              <div className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[11px] font-mono text-gray-700 truncate flex-1">
                  {vistoria.localizacaoMaps || 'Não informado'}
                </span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Abrir GPS / Maps</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Hiperlinks de Outros Sistemas */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <LinkIcon className="w-4 h-4 text-emerald-700" />
              <span>Hiperlinks de Integração Externa</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* LINK VISTORIA */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-900 block">LINK VISTORIA:</span>
                {laudoUrl ? (
                  <a
                    href={laudoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline break-all min-h-[36px]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Acessar Laudo de Vistoria Externa</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">Nenhum hiperlink informado</span>
                )}
              </div>

              {/* LINK PAGAMENTO */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-900 block">LINK PAGAMENTO:</span>
                {faturaUrl ? (
                  <a
                    href={faturaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline break-all min-h-[36px]"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>Acessar Link de Pagamento / Fatura</span>
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">Nenhum hiperlink informado</span>
                )}
              </div>
            </div>
          </div>

          {/* Parecer Técnico ou Motivo da Reprovação se houver */}
          {(vistoria.parecer || vistoria.motivoReprovacao) && (
            <div
              className={`p-4 rounded-xl border ${
                vistoria.status === 'Aprovado'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                {vistoria.status === 'Aprovado' ? (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-700" />
                    <span>Parecer Técnico do Vistoriador / Conclusão</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-700" />
                    <span>Motivo da Reprovação / Não Conformidade</span>
                  </>
                )}
              </h4>

              <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                {vistoria.status === 'Aprovado' ? vistoria.parecer : vistoria.motivoReprovacao}
              </p>

              <div className="mt-3 pt-2 border-t border-black/10 flex flex-wrap justify-between items-center text-[11px] text-gray-600">
                <span>Responsável: <strong>{vistoria.aprovador || vistoria.vistoriador}</strong></span>
                {vistoria.dataHoraAprovacao && (
                  <span>Registrado em: {new Date(vistoria.dataHoraAprovacao).toLocaleString('pt-BR')}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botões de ação e touch-target 44px+ */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fechar Detalhes
          </button>

          {vistoria.status === 'Aguardando Vistoria' && (
            <div className="flex items-center gap-2">
              {onOpenReprovar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReprovar(vistoria);
                  }}
                  className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reprovar</span>
                </button>
              )}

              {onOpenAprovar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAprovar(vistoria);
                  }}
                  className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprovar Vistoria</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
