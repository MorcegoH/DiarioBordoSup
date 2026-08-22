/**
 * @file src/components/OccurrenceForm.tsx
 * @description Formulário para Registro de Ocorrências Operacionais (SEÇÃO 2).
 * Contém todos os campos especificados nas diretrizes, estilizado com #005b2e e validações.
 */

import React, { useState } from 'react';
import { Categoria, Impacto, Status, Ocorrencia } from '../types';
import { PlusCircle, CheckCircle2, User, Tag, FileText, Activity, Wrench, ShieldAlert, AlertTriangle } from 'lucide-react';
import { sanitizeTextInput } from '../utils/security';
import { DbOperationResult } from '../services/dbService';

interface OccurrenceFormProps {
  onAddOcorrencia: (ocorrencia: Ocorrencia) => Promise<DbOperationResult | void>;
  defaultSupervisor?: string;
}

export const OccurrenceForm: React.FC<OccurrenceFormProps> = React.memo(({
  onAddOcorrencia,
  defaultSupervisor = 'Debora Rodrigues'
}) => {
  const [supervisor, setSupervisor] = useState<string>(defaultSupervisor);
  const [categoria, setCategoria] = useState<Categoria>('Sistemas & Ferramentas');
  const [descricao, setDescricao] = useState<string>('');
  const [impacto, setImpacto] = useState<Impacto>('Baixo');
  const [acaoTomada, setAcaoTomada] = useState<string>('');
  const [status, setStatus] = useState<Status>('Pendente');
  const [saveStatus, setSaveStatus] = useState<{
    type: 'supabase' | 'local' | 'error' | null;
    message: string;
    errorDetail?: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSupervisor = sanitizeTextInput(supervisor, 100);
    const cleanDescricao = sanitizeTextInput(descricao, 2000);
    const cleanAcaoTomada = sanitizeTextInput(acaoTomada, 2000);

    if (!cleanSupervisor) {
      alert('Por favor, informe o Supervisor Responsável.');
      return;
    }

    if (!cleanDescricao) {
      alert('Por favor, preencha a Descrição da Ocorrência.');
      return;
    }

    if (!cleanAcaoTomada) {
      alert('Por favor, informe a Ação Tomada.');
      return;
    }

    const agora = new Date().toISOString();
    const isResolvido = status === 'Resolvido';

    const novaOcorrencia: Ocorrencia = {
      id: 'oc-' + Date.now().toString(36),
      dataHora: agora,
      dataHoraConclusao: isResolvido ? agora : undefined,
      supervisor: cleanSupervisor,
      categoria,
      descricao: cleanDescricao,
      impacto,
      acaoTomada: cleanAcaoTomada,
      status,
      duracaoMinutos: isResolvido ? 15 : 0
    };

    const result = await onAddOcorrencia(novaOcorrencia);

    if (result && result.storage === 'supabase' && result.success) {
      setSaveStatus({
        type: 'supabase',
        message: 'Ocorrência salva com sucesso no Supabase (Nuvem)!'
      });
    } else if (result && result.error) {
      setSaveStatus({
        type: 'error',
        message: 'Salvo apenas no navegador. Erro na gravação do Supabase:',
        errorDetail: result.error
      });
    } else {
      setSaveStatus({
        type: 'local',
        message: 'Salvo localmente no navegador! (Supabase não configurado)'
      });
    }

    // Reset form fields except supervisor
    setDescricao('');
    setAcaoTomada('');
    setImpacto('Baixo');
    setStatus('Pendente');

    setTimeout(() => {
      setSaveStatus({ type: null, message: '' });
    }, 7000);
  };

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8 relative border-l-4 border-l-[#005b2e]">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 rounded-lg text-primary-green">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Registrar Nova Ocorrência Operacional
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Registro de incidentes, problemas e gargalos da operação de Inside Sales
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

        {saveStatus.type === 'error' && (
          <div className="flex flex-col gap-1 bg-red-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-red-200 shrink-0" />
              <span>{saveStatus.message}</span>
            </div>
            {saveStatus.errorDetail && (
              <p className="text-[11px] font-mono bg-red-900/80 p-1.5 rounded text-red-100 border border-red-500/50">
                {saveStatus.errorDetail}
              </p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Supervisor Responsável */}
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
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800 font-medium"
            >
              <option value="Heder Santos">Heder Santos (Gerente de Vendas)</option>
              <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
            </select>
          </div>

          {/* Categoria da Ocorrência */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-700" />
              Categoria de Problema *
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800 font-medium"
            >
              <option value="Sistemas & Ferramentas">Sistemas & Ferramentas (Discador, CRM, VoIP, WhatsApp)</option>
              <option value="Qualidade de Leads & Mídia">Qualidade de Leads & Mídia (Inbound, DDDs, Higienização)</option>
              <option value="Processos & SLA">Processos & SLA (Passagem AE/Closer, BANT, Agendamentos)</option>
              <option value="Pessoas & Performance">Pessoas & Performance (Absenteísmo, Metas, Treinamento)</option>
              <option value="Comercial & Objeções">Comercial & Objeções (Preço, Concorrentes, Reajuste)</option>
            </select>
          </div>
        </div>

        {/* Descrição da Ocorrência */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            Descrição da Ocorrência *
          </label>
          <textarea
            required
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva detalhadamente o evento, instabilidade ou oportunidade reportada pelos Inside Sales..."
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Impacto na Operação */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
              Impacto na Operação *
            </label>
            <div className="flex items-center gap-2">
              <select
                value={impacto}
                onChange={(e) => setImpacto(e.target.value as Impacto)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[#005b2e] font-bold transition-all ${
                  impacto === 'Baixo'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : impacto === 'Médio'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                <option value="Baixo">Baixo (Instabilidade pontual sem parada)</option>
                <option value="Médio">Médio (Lentidão ou afeta parcela da equipe)</option>
                <option value="Crítico">Crítico (Parada total de vendas/ligações)</option>
              </select>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Indicador visual de severidade operacional para a liderança de Sales Ops.
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              Status Inicial *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800 font-medium"
            >
              <option value="Pendente">Pendente (Aguardando atitude/suporte)</option>
              <option value="Em Análise">Em Análise (Equipe técnica tratada)</option>
              <option value="Resolvido">Resolvido (Contorno ou solução aplicada)</option>
            </select>
          </div>
        </div>

        {/* Ação Tomada */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-emerald-700" />
            Ação Tomada (Solução / Contingência) *
          </label>
          <textarea
            required
            rows={2}
            value={acaoTomada}
            onChange={(e) => setAcaoTomada(e.target.value)}
            placeholder="Informe a providência executada ou chamado aberto (ex: Abrir chamado #TI-123 e chavear contingência)..."
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800"
          />
        </div>

        {/* Botão de Envio */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-green hover:bg-primary-dark text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Ocorrência</span>
          </button>
        </div>
      </form>
    </div>
  );
});
