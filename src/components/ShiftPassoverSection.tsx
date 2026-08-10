/**
 * @file src/components/ShiftPassoverSection.tsx
 * @description SEÇÃO 4: Fechamento de Turno e Gerador de Relatório Diário.
 * Consolida as ocorrências do dia e os comentários do supervisor em texto formatado para WhatsApp/Slack.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Ocorrencia, ResumoPassagem } from '../types';
import { formatBrazilianDate } from '../utils/statisticalAnalysis';
import { sanitizeTextInput } from '../utils/security';
import { DbOperationResult } from '../services/dbService';
import { 
  Sparkles, Copy, Check, FileText, CheckCircle2, AlertTriangle, 
  MessageSquare, User, Calendar
} from 'lucide-react';

interface ShiftPassoverSectionProps {
  ocorrencias: Ocorrencia[];
  passagens: ResumoPassagem[];
  onSavePassagem: (passagem: ResumoPassagem) => Promise<DbOperationResult | void>;
  defaultSupervisor?: string;
}

export const ShiftPassoverSection: React.FC<ShiftPassoverSectionProps> = React.memo(({
  ocorrencias,
  passagens,
  onSavePassagem,
  defaultSupervisor = 'Debora Rodrigues'
}) => {
  const [supervisor, setSupervisor] = useState<string>(defaultSupervisor);
  const [oQueFuncionou, setOQueFuncionou] = useState<string>('');
  const [oQueFicaPendente, setOQueFicaPendente] = useState<string>('');
  const [relatorioGeradoText, setRelatorioGeradoText] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'supabase' | 'local' | null; message: string }>({ type: null, message: '' });

  // Filtrar ocorrências do dia de hoje com useMemo
  const dataHojeISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const ocorrenciasHoje = useMemo(() => {
    return ocorrencias.filter((oc) => oc.dataHora.startsWith(dataHojeISO));
  }, [ocorrencias, dataHojeISO]);

  const generateReportText = useCallback((
    sup: string,
    funcionou: string,
    pendente: string,
    listOcorrencias: Ocorrencia[]
  ): string => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const criticos = listOcorrencias.filter(o => o.impacto === 'Crítico');
    const resolvidos = listOcorrencias.filter(o => o.status === 'Resolvido');
    const emAberto = listOcorrencias.filter(o => o.status !== 'Resolvido');

    let text = `📋 *DIÁRIO DE BORDO - FECHAMENTO DE TURNO INSIDE SALES*\n`;
    text += `🗓️ *Data:* ${dataFormatada}\n`;
    text += `👤 *Supervisor Responsável:* ${sup}\n`;
    text += `👔 *Gerente de Vendas:* Heder Santos\n`;
    text += `-----------------------------------------------\n\n`;

    text += `📊 *RESUMO DA OPERAÇÃO DO DIA:*\n`;
    text += `• Total de Ocorrências: ${listOcorrencias.length}\n`;
    text += `• Incidentes Críticos: ${criticos.length}\n`;
    text += `• Resolvidos: ${resolvidos.length}\n`;
    text += `• Pendentes/Em Análise: ${emAberto.length}\n\n`;

    text += `✅ *O QUE FUNCIONOU BEM HOJE:*\n`;
    text += `${funcionou.trim() || 'Operação fluindo dentro das metas estabelecidas sem desvios significativos.'}\n\n`;

    text += `⏳ *O QUE FICA PENDENTE / ATENÇÃO:*\n`;
    text += `${pendente.trim() || 'Nenhuma pendência crítica acumulada.'}\n\n`;

    text += `🚨 *DETALHAMENTO DAS OCORRÊNCIAS DO DIA:*\n`;
    if (listOcorrencias.length === 0) {
      text += `• Sem ocorrências registradas hoje.\n`;
    } else {
      listOcorrencias.forEach((oc, idx) => {
        const iconImpacto = oc.impacto === 'Crítico' ? '🔴' : oc.impacto === 'Médio' ? '🟡' : '🟢';
        text += `${idx + 1}. ${iconImpacto} *[${oc.categoria}]* ${oc.descricao}\n`;
        text += `   ↳ *Status:* ${oc.status} | *Ação:* ${oc.acaoTomada}\n`;
      });
    }

    text += `\n-----------------------------------------------\n`;
    text += `_Relatório gerado via Sistema de Supervisão Sales Ops_`;

    return text;
  }, []);

  const handleGerarRelatorio = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFuncionou = sanitizeTextInput(oQueFuncionou, 2500);
    const cleanPendente = sanitizeTextInput(oQueFicaPendente, 2500);
    const cleanSupervisor = sanitizeTextInput(supervisor, 100);

    if (!cleanFuncionou && !cleanPendente) {
      alert('Por favor, informe ao menos um resumo do que funcionou ou do que fica pendente.');
      return;
    }

    const report = generateReportText(cleanSupervisor, cleanFuncionou, cleanPendente, ocorrenciasHoje);
    setRelatorioGeradoText(report);

    // Salvar registro de passagem
    const novaPassagem: ResumoPassagem = {
      id: 'pass-' + Date.now().toString(36),
      data: dataHojeISO,
      supervisor: cleanSupervisor,
      oQueFuncionou: cleanFuncionou,
      oQueFicaPendente: cleanPendente,
      dataHoraCriacao: new Date().toISOString()
    };

    const result = await onSavePassagem(novaPassagem);

    if (result && result.storage === 'supabase') {
      setSaveStatus({
        type: 'supabase',
        message: 'Fechamento de turno salvo no Supabase (Nuvem)!'
      });
    } else {
      setSaveStatus({
        type: 'local',
        message: 'Fechamento de turno salvo no navegador! (Aguardando sincronização com Supabase)'
      });
    }

    setTimeout(() => {
      setSaveStatus({ type: null, message: '' });
    }, 4500);
  };

  const handleCopyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedToClipboard(true);
    setTimeout(() => {
      setCopiedToClipboard(false);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      
      {/* SEÇÃO 4 Form & Generator */}
      <div className="corporate-card p-5 sm:p-6 border-l-4 border-l-[#005b2e]">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-primary-green">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Fechamento de Turno & Relatório Diário
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Consolidação do dia para envio imediato nos canais da equipe (WhatsApp / Slack)
              </p>
            </div>
          </div>

          {saveStatus.type === 'supabase' && (
            <div className="flex items-center gap-2 bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{saveStatus.message}</span>
            </div>
          )}

          {saveStatus.type === 'local' && (
            <div className="flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <span>{saveStatus.message}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleGerarRelatorio} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            
            {/* Supervisor */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  Supervisor Responsável *
                </span>
                <span className="text-[10px] text-gray-400 font-normal">Gerente: Heder Santos</span>
              </label>
              <select
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] font-medium"
              >
                <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
                <option value="Marilia Farias">Marilia Farias (Supervisora)</option>
              </select>
            </div>
          </div>

          {/* O que funcionou bem hoje */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              O que funcionou bem hoje? *
            </label>
            <textarea
              required
              rows={3}
              value={oQueFuncionou}
              onChange={(e) => setOQueFuncionou(e.target.value)}
              placeholder="Descreva vitórias do turno, metas alcançadas, conversões em alta ou boa qualidade de leads..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e]"
            />
          </div>

          {/* O que fica pendente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              O que fica pendente para o próximo turno / amanhã? *
            </label>
            <textarea
              required
              rows={3}
              value={oQueFicaPendente}
              onChange={(e) => setOQueFicaPendente(e.target.value)}
              placeholder="Relate pendências técnicas, chamados em aberto, leads prioritários para recontato ou alertas operacionais..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e]"
            />
          </div>

          {/* Preview das ocorrências que serão anexadas */}
          <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200 text-xs">
            <span className="font-bold text-emerald-900 block mb-1">
              Ocorrências vinculadas a esta passagem ({ocorrenciasHoje.length} encontradas no dia de hoje):
            </span>
            {ocorrenciasHoje.length === 0 ? (
              <p className="text-gray-600 italic">
                Nenhuma ocorrência registrada no sistema na data de hoje.
              </p>
            ) : (
              <ul className="space-y-1 text-emerald-950 font-medium">
                {ocorrenciasHoje.map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${o.impacto === 'Crítico' ? 'bg-red-500' : 'bg-emerald-600'}`} />
                    <span className="font-bold">[{o.categoria}]</span> {o.descricao.substring(0, 70)}...
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botão de Geração */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary-green hover:bg-primary-dark text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Gerar Relatório Diário</span>
            </button>
          </div>
        </form>

        {/* Relatório Gerado Box */}
        {relatorioGeradoText && (
          <div className="mt-8 pt-6 border-t border-gray-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary-green" />
                Relatório Pronto para Copiar (WhatsApp / Slack)
              </h3>
              
              <button
                onClick={() => handleCopyToClipboard(relatorioGeradoText)}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  copiedToClipboard
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                }`}
              >
                {copiedToClipboard ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToClipboard ? 'Copiado para a Área de Transferência!' : 'Copiar para WhatsApp/Slack'}</span>
              </button>
            </div>

            <div className="bg-gray-900 text-emerald-300 font-mono text-xs p-4 rounded-lg overflow-x-auto border border-gray-800 whitespace-pre-wrap leading-relaxed shadow-inner">
              {relatorioGeradoText}
            </div>
          </div>
        )}
      </div>

      {/* Histórico de Fechamentos Anteriores */}
      {passagens.length > 0 && (
        <div className="corporate-card p-5 sm:p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-200">
            <Calendar className="w-4 h-4 text-primary-green" />
            Histórico de Fechamentos de Turno Salvos
          </h3>

          <div className="space-y-4">
            {passagens.map((p) => (
              <div key={p.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
                  <span className="font-bold text-gray-800 text-sm">
                    {p.supervisor}
                  </span>
                  <span className="text-gray-500">
                    {formatBrazilianDate(p.dataHoraCriacao)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="bg-emerald-50 p-2.5 rounded border border-emerald-100">
                    <span className="font-bold text-emerald-900 block mb-1">✅ O que funcionou bem:</span>
                    <p className="text-emerald-950">{p.oQueFuncionou}</p>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded border border-amber-100">
                    <span className="font-bold text-amber-900 block mb-1">⏳ Pendente / Atenção:</span>
                    <p className="text-amber-950">{p.oQueFicaPendente}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const rep = generateReportText(p.supervisor, p.oQueFuncionou, p.oQueFicaPendente, ocorrencias);
                      handleCopyToClipboard(rep);
                    }}
                    className="text-xs text-primary-green hover:underline font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Re-copiar Relatório
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
});
