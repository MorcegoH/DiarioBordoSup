/**
 * @file src/components/OccurrenceForm.tsx
 * @description Formulário para Registro de Ocorrências Operacionais e Fatos de Consultores para Feedback (SEÇÃO 2).
 * Permite alternar entre Ocorrência Operacional Geral e Registro Factual de Consultor.
 */

import React, { useState } from 'react';
import { Categoria, Impacto, Status, Ocorrencia, TipoRegistroOcorrencia, TipoFatoConsultor, StatusFeedback, AuthUser } from '../types';
import { 
  PlusCircle, 
  CheckCircle2, 
  User, 
  Tag, 
  FileText, 
  Activity, 
  Wrench, 
  ShieldAlert, 
  AlertTriangle, 
  Loader2, 
  UserCheck, 
  Building2, 
  Clock, 
  Award, 
  MessageSquareShare,
  ShieldCheck
} from 'lucide-react';
import { sanitizeTextInput } from '../utils/security';
import { DbOperationResult } from '../services/dbService';
import { HIERARQUIA_EQUIPES } from '../data/discountData';

interface OccurrenceFormProps {
  onAddOcorrencia: (ocorrencia: Ocorrencia) => Promise<DbOperationResult | void>;
  defaultSupervisor?: string;
  currentUser?: AuthUser | null;
  tipoRegistroAtivo?: TipoRegistroOcorrencia;
  onTipoRegistroChange?: (tipo: TipoRegistroOcorrencia) => void;
}

export const OccurrenceForm: React.FC<OccurrenceFormProps> = React.memo(({
  onAddOcorrencia,
  defaultSupervisor = 'Débora Rodrigues',
  currentUser,
  tipoRegistroAtivo,
  onTipoRegistroChange
}) => {
  const [supervisor, setSupervisor] = useState<string>(currentUser?.name || defaultSupervisor);

  // Sincroniza o supervisor padrão quando a prop muda
  React.useEffect(() => {
    if (currentUser?.name) {
      setSupervisor(currentUser.name);
    } else if (defaultSupervisor) {
      setSupervisor(defaultSupervisor);
    }
  }, [defaultSupervisor, currentUser]);

  // Modo de registro: 'operacional' ou 'fato_consultor' (sincronizado com prop externa se informada)
  const [internalTipoRegistro, setInternalTipoRegistro] = useState<TipoRegistroOcorrencia>(tipoRegistroAtivo || 'operacional');

  React.useEffect(() => {
    if (tipoRegistroAtivo) {
      setInternalTipoRegistro(tipoRegistroAtivo);
    }
  }, [tipoRegistroAtivo]);

  const tipoRegistro = tipoRegistroAtivo || internalTipoRegistro;

  const handleSelectTipoRegistro = (tipo: TipoRegistroOcorrencia) => {
    setInternalTipoRegistro(tipo);
    if (onTipoRegistroChange) {
      onTipoRegistroChange(tipo);
    }
  };

  // Campos gerais
  const [categoria, setCategoria] = useState<Categoria>('Sistemas & Ferramentas');
  const [descricao, setDescricao] = useState<string>('');
  const [impacto, setImpacto] = useState<Impacto>('Baixo');
  const [acaoTomada, setAcaoTomada] = useState<string>('');
  const [status, setStatus] = useState<Status>('Pendente');

  // Campos específicos de Consultor / Fato
  const consultoresDisponiveis = HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'] || [];
  const [consultor, setConsultor] = useState<string>(consultoresDisponiveis[0] || 'Kelvyn');
  const [tipoFato, setTipoFato] = useState<TipoFatoConsultor>('Processo');
  const [dataHoraFato, setDataHoraFato] = useState<string>(() => {
    const now = new Date();
    // Formato local YYYY-MM-DDTHH:mm
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [statusFeedback, setStatusFeedback] = useState<StatusFeedback>('Não Aplicado');
  const [observacoesFeedback, setObservacoesFeedback] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'supabase' | 'local' | 'error' | null;
    message: string;
    errorDetail?: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanSupervisor = sanitizeTextInput(supervisor, 100);
    const cleanDescricao = sanitizeTextInput(descricao, 2000);
    const cleanAcaoTomada = sanitizeTextInput(acaoTomada, 2000);
    const cleanObsFeedback = sanitizeTextInput(observacoesFeedback, 2000);

    if (!cleanSupervisor) {
      alert('Por favor, informe o Supervisor Responsável.');
      return;
    }

    if (tipoRegistro === 'fato_consultor') {
      if (!consultor) {
        alert('Por favor, selecione o consultor envolvido.');
        return;
      }
      if (!cleanDescricao) {
        alert('Por favor, descreva o fato ocorrido com o consultor de forma clara e factual.');
        return;
      }
      if (!cleanAcaoTomada) {
        alert('Por favor, descreva a ação imediata ou plano de feedback previsto.');
        return;
      }
    } else {
      if (!cleanDescricao) {
        alert('Por favor, preencha a Descrição da Ocorrência.');
        return;
      }
      if (!cleanAcaoTomada) {
        alert('Por favor, informe a Ação Tomada.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const agoraIso = new Date().toISOString();
      const isResolvido = status === 'Resolvido';

      // Usar a dataHora escolhida pelo usuário para o fato, ou o agora para operacional
      let dataHoraRegistro = agoraIso;
      if (tipoRegistro === 'fato_consultor' && dataHoraFato) {
        const dt = new Date(dataHoraFato);
        if (!isNaN(dt.getTime())) {
          dataHoraRegistro = dt.toISOString();
        }
      }

      // Se for registro factual, categoria padrão sugerida ou correspondente
      const categoriaFinal: Categoria = tipoRegistro === 'fato_consultor' 
        ? (tipoFato === 'Processo' ? 'Processos & SLA' : tipoFato === 'Elogio' || tipoFato === 'Desempenho' || tipoFato === 'Pontualidade' || tipoFato === 'Postura' ? 'Pessoas & Performance' : categoria)
        : categoria;

      const gestorLogado = currentUser?.name || cleanSupervisor;

      const novaOcorrencia: Ocorrencia = {
        id: 'oc-' + Date.now().toString(36),
        dataHora: dataHoraRegistro,
        dataHoraCriacao: agoraIso,
        dataHoraConclusao: isResolvido ? agoraIso : undefined,
        supervisor: gestorLogado,
        gestorRegistro: gestorLogado,
        categoria: categoriaFinal,
        descricao: cleanDescricao,
        impacto,
        acaoTomada: cleanAcaoTomada,
        status,
        duracaoMinutos: isResolvido ? 15 : 0,
        tipoRegistro,
        consultor: tipoRegistro === 'fato_consultor' ? consultor : undefined,
        tipoFato: tipoRegistro === 'fato_consultor' ? tipoFato : undefined,
        statusFeedback: tipoRegistro === 'fato_consultor' ? statusFeedback : undefined,
        dataFeedback: tipoRegistro === 'fato_consultor' && statusFeedback !== 'Não Aplicado' ? agoraIso : undefined,
        dataHoraFeedback: tipoRegistro === 'fato_consultor' && statusFeedback !== 'Não Aplicado' ? agoraIso : undefined,
        gestorFeedback: tipoRegistro === 'fato_consultor' && statusFeedback !== 'Não Aplicado' ? gestorLogado : undefined,
        observacoesFeedback: tipoRegistro === 'fato_consultor' && cleanObsFeedback ? cleanObsFeedback : undefined
      };

      const result = await onAddOcorrencia(novaOcorrencia);

      if (result && result.storage === 'supabase' && result.success) {
        setSaveStatus({
          type: 'supabase',
          message: tipoRegistro === 'fato_consultor' 
            ? `Fato registrado com sucesso para ${consultor} no Supabase!` 
            : 'Ocorrência operacional salva com sucesso no Supabase!'
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
          message: 'Salvo localmente no navegador! (Supabase em modo offline)'
        });
      }

      // Reset form fields
      setDescricao('');
      setAcaoTomada('');
      setObservacoesFeedback('');
      setImpacto('Baixo');
      setStatus('Pendente');
      if (tipoRegistro === 'fato_consultor') {
        setStatusFeedback('Não Aplicado');
      }

      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 7000);
    } catch (err) {
      console.error('[OccurrenceForm] Erro ao submeter ocorrência:', err);
      setSaveStatus({
        type: 'error',
        message: 'Falha inesperada ao salvar ocorrência.',
        errorDetail: String(err)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8 relative border-l-4 border-l-[#005b2e]">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 rounded-lg text-primary-green">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {tipoRegistro === 'fato_consultor' 
                ? 'Registrar Fato de Consultor (Dossiê de Feedback)' 
                : 'Registrar Ocorrência Operacional'}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {tipoRegistro === 'fato_consultor'
                ? 'Registro de evidências factuais (positivas ou alinhamentos) para basear feedbacks 1-on-1'
                : 'Registro de incidentes técnicos, telefonia, CRM ou processos gerais da operação'}
            </p>
          </div>
        </div>

        {/* Notificação de Status de Salvamento */}
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

      {/* Seletor do Tipo de Registro: Ocorrência Operacional x Registro Factual de Consultor */}
      <div className="mb-6 p-2 bg-gray-100 rounded-xl flex flex-col sm:flex-row gap-2 border border-gray-200">
        <button
          type="button"
          onClick={() => handleSelectTipoRegistro('operacional')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer ${
            tipoRegistro === 'operacional'
              ? 'bg-[#005b2e] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ocorrência Operacional Geral</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            tipoRegistro === 'operacional' ? 'bg-emerald-900/40 text-emerald-100' : 'bg-gray-200 text-gray-700'
          }`}>
            Sistemas / Leads / SLAs
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTipoRegistro('fato_consultor')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer ${
            tipoRegistro === 'fato_consultor'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
          }`}
        >
          <UserCheck className="w-4 h-4 text-purple-200" />
          <span>Registro Factual de Consultor</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            tipoRegistro === 'fato_consultor' ? 'bg-purple-900/50 text-purple-100' : 'bg-gray-200 text-gray-700'
          }`}>
            Feedback 1-on-1 & Evidências
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Supervisor / Gestor Autenticado via Login */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                Gestor Responsável (Login)
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Autenticado
              </span>
            </label>
            <div className="w-full px-3 py-2 text-sm bg-gray-50 border border-emerald-300 rounded-lg text-gray-900 font-bold shadow-2xs flex items-center justify-between">
              <span>{supervisor || defaultSupervisor}</span>
              {currentUser?.cargo && (
                <span className="text-[11px] font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {currentUser.cargo}
                </span>
              )}
            </div>
          </div>

          {/* Se for FATO DE CONSULTOR: Mostra Consultor e Tipo de Fato */}
          {tipoRegistro === 'fato_consultor' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                  Consultor Envolvido *
                </label>
                <select
                  value={consultor}
                  onChange={(e) => setConsultor(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-purple-50/60 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 focus:bg-white transition-all text-gray-800 font-bold"
                >
                  {consultoresDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-700 mt-1 font-medium">
                  Integrado à equipe oficial de Débora Rodrigues (com Kelvyn).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-700" />
                  Tipo do Fato Factual *
                </label>
                <select
                  value={tipoFato}
                  onChange={(e) => setTipoFato(e.target.value as TipoFatoConsultor)}
                  className="w-full px-3 py-2 text-sm bg-purple-50/60 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 focus:bg-white transition-all text-gray-800 font-medium"
                >
                  <option value="Pontualidade">Pontualidade (Atraso, saída precoce, pausas)</option>
                  <option value="Postura">Postura (Conduta, ética, clima, respeito)</option>
                  <option value="Processo">Processo (Preenchimento CRM, SLA de ligação, BANT)</option>
                  <option value="Elogio">Elogio / Reconhecimento (Destaque, superação, técnica)</option>
                  <option value="Desempenho">Desempenho (Taxa de conversão, aderência à meta)</option>
                  <option value="Comunicação">Comunicação (Pitch comercial, clareza com cliente)</option>
                  <option value="Outro">Outro Registro Específico</option>
                </select>
              </div>
            </>
          ) : (
            /* Se for OPERACIONAL: Mostra Categoria de Problema */
            <div className="md:col-span-1 lg:col-span-2">
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
                <option value="Pessoas & Performance">Pessoas & Performance (Absenteísmo, Metas, Treinamento Geral)</option>
                <option value="Comercial & Objeções">Comercial & Objeções (Preço, Concorrentes, Reajuste)</option>
              </select>
            </div>
          )}
        </div>

        {/* Data/Hora do Fato (para quando o registro ocorreu antes ou no momento) */}
        {tipoRegistro === 'fato_consultor' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-purple-50/40 rounded-xl border border-purple-200">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-700" />
                Data & Hora do Fato Ocorrido *
              </label>
              <input
                type="datetime-local"
                value={dataHoraFato}
                onChange={(e) => setDataHoraFato(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 text-gray-800 font-medium"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Permite registrar fatos retroativos ocorridos durante o turno.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MessageSquareShare className="w-3.5 h-3.5 text-purple-700" />
                Status do Feedback 1-on-1 *
              </label>
              <select
                value={statusFeedback}
                onChange={(e) => setStatusFeedback(e.target.value as StatusFeedback)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 font-bold ${
                  statusFeedback === 'Aplicado / Concluído'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : statusFeedback === 'Agendado'
                    ? 'bg-sky-50 text-sky-800 border-sky-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                <option value="Não Aplicado">Não Aplicado (Fato registrado para próxima reunião)</option>
                <option value="Agendado">Agendado (Data marcada com o consultor)</option>
                <option value="Aplicado / Concluído">Aplicado / Concluído (Conversa realizada)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                Impacto ou Gravidade *
              </label>
              <select
                value={impacto}
                onChange={(e) => setImpacto(e.target.value as Impacto)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 font-bold ${
                  impacto === 'Baixo'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : impacto === 'Médio'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                <option value="Baixo">Baixo (Alinhamento leve / Elogio)</option>
                <option value="Médio">Médio (Atenção / Reincidência leve)</option>
                <option value="Crítico">Crítico (Grave quebra de conduta / Processo)</option>
              </select>
            </div>
          </div>
        )}

        {/* Descrição do Fato ou Ocorrência */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <FileText className={`w-3.5 h-3.5 ${tipoRegistro === 'fato_consultor' ? 'text-purple-700' : 'text-emerald-700'}`} />
            {tipoRegistro === 'fato_consultor' 
              ? 'Descrição Factual do Ocorrido (O que, como e quando aconteceu) *' 
              : 'Descrição da Ocorrência Operacional *'}
          </label>
          <textarea
            required
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={
              tipoRegistro === 'fato_consultor'
                ? "Ex: Às 14h20, no lead #98234, o consultor não preencheu o campo BANT e desligou a ligação sem registrar objeção. (Registros objetivos, sem julgamentos pessoais)."
                : "Descreva detalhadamente o evento, instabilidade ou oportunidade reportada pelos Inside Sales..."
            }
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800"
          />
        </div>

        {tipoRegistro === 'operacional' && (
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

            {/* Status Inicial */}
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
        )}

        {/* Ação Tomada / Plano de Feedback */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Wrench className={`w-3.5 h-3.5 ${tipoRegistro === 'fato_consultor' ? 'text-purple-700' : 'text-emerald-700'}`} />
            {tipoRegistro === 'fato_consultor' 
              ? 'Ação Imediata ou Direcionamento Planejado para o Feedback *' 
              : 'Ação Tomada (Solução / Contingência) *'}
          </label>
          <textarea
            required
            rows={2}
            value={acaoTomada}
            onChange={(e) => setAcaoTomada(e.target.value)}
            placeholder={
              tipoRegistro === 'fato_consultor'
                ? "Ex: Pontuar na reunião 1-on-1 de sexta-feira; reforçar importância do script de contorno de preço; enviar treinamento rápido."
                : "Informe a providência executada ou chamado aberto (ex: Abrir chamado #TI-123 e chavear contingência)..."
            }
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white transition-all text-gray-800"
          />
        </div>

        {/* Observações / Notas do Feedback (se aplicável ao Fato) */}
        {tipoRegistro === 'fato_consultor' && statusFeedback !== 'Não Aplicado' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MessageSquareShare className="w-3.5 h-3.5 text-purple-700" />
              Notas de Alinhamento do Feedback (Compromissos firmados com {consultor})
            </label>
            <textarea
              rows={2}
              value={observacoesFeedback}
              onChange={(e) => setObservacoesFeedback(e.target.value)}
              placeholder="Descreva o retorno do consultor e os combinados acertados durante a conversa..."
              className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all text-gray-800"
            />
          </div>
        )}

        {/* Botão de Envio */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-6 py-2.5 font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 ${
              tipoRegistro === 'fato_consultor'
                ? 'bg-purple-700 hover:bg-purple-800 text-white'
                : 'bg-primary-green hover:bg-primary-dark text-white'
            } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando Registro...</span>
              </>
            ) : tipoRegistro === 'fato_consultor' ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Salvar Fato no Dossiê de {consultor}</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Ocorrência Operacional</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
});
