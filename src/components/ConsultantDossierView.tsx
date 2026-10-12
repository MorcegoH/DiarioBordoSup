/**
 * @file src/components/ConsultantDossierView.tsx
 * @description Componente da Ficha Individual / Dossiê de Feedback de Consultores (1-on-1).
 * Exibe histórico de fatos ocorridos, métricas de feedback, timeline cronológica e
 * exportação estruturada do dossiê com data, horário e gestor autenticado via login.
 */

import React, { useState, useMemo } from 'react';
import { Ocorrencia, StatusFeedback, TipoFatoConsultor, Impacto, AuthUser } from '../types';
import { HIERARQUIA_EQUIPES } from '../data/discountData';
import { formatBrazilianDate } from '../utils/statisticalAnalysis';
import { 
  User, 
  Calendar, 
  Award, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquareShare, 
  Copy, 
  Check, 
  FileText, 
  Filter, 
  ChevronRight, 
  AlertTriangle,
  UserCheck,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';

interface ConsultantDossierViewProps {
  ocorrencias: Ocorrencia[];
  onUpdateOcorrencia: (updated: Ocorrencia) => void;
  currentUser?: AuthUser | null;
}

export const ConsultantDossierView: React.FC<ConsultantDossierViewProps> = React.memo(({
  ocorrencias,
  onUpdateOcorrencia,
  currentUser
}) => {
  const consultoresDisponiveis = HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'] || [];
  
  // Consultor selecionado para a Ficha
  const [selectedConsultant, setSelectedConsultant] = useState<string>(consultoresDisponiveis[0] || 'Kelvyn');
  
  // Filtros internos do dossiê
  const [filtroTipoFato, setFiltroTipoFato] = useState<string>('todos');
  const [filtroStatusFeedback, setFiltroStatusFeedback] = useState<string>('todos');
  
  // Estado para modal de gerenciamento do feedback
  const [editingFato, setEditingFato] = useState<Ocorrencia | null>(null);
  const [modalDataHoraFeedback, setModalDataHoraFeedback] = useState<string>('');
  const [modalFeedbackFeedbackToast, setModalFeedbackFeedbackToast] = useState<string | null>(null);
  
  // Estados para botões de exportação
  const [copiedPauta, setCopiedPauta] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Nome e identificação do gestor logado
  const gestorLogadoNome = currentUser?.name || 'Débora Rodrigues';
  const gestorLogadoCargo = currentUser?.cargo || 'Supervisora de Inside Sales';
  const gestorLogadoLogin = currentUser?.username || currentUser?.email || 'debora.rodrigues';

  // Filtrar ocorrências pertencentes ao consultor selecionado
  const fatosConsultor = useMemo(() => {
    return ocorrencias
      .filter((oc) => {
        const consultorNormalizado = (oc.consultor || '').trim().toLowerCase();
        const selNorm = selectedConsultant.trim().toLowerCase();
        
        // Compatibiliza Kelvin legado com Kelvyn
        if (selNorm === 'kelvyn' && consultorNormalizado === 'kelvin') return true;
        
        return consultorNormalizado === selNorm;
      })
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ocorrencias, selectedConsultant]);

  // Aplicar filtros internos
  const fatosFiltrados = useMemo(() => {
    return fatosConsultor.filter((fato) => {
      const matchTipo = filtroTipoFato === 'todos' || fato.tipoFato === filtroTipoFato;
      const statusEfetivo = fato.statusFeedback || 'Não Aplicado';
      const matchStatus = filtroStatusFeedback === 'todos' || statusEfetivo === filtroStatusFeedback;
      return matchTipo && matchStatus;
    });
  }, [fatosConsultor, filtroTipoFato, filtroStatusFeedback]);

  // Métricas do consultor
  const stats = useMemo(() => {
    const total = fatosConsultor.length;
    const elogios = fatosConsultor.filter(f => f.tipoFato === 'Elogio').length;
    const processos = fatosConsultor.filter(f => f.tipoFato === 'Processo').length;
    const pontualidade = fatosConsultor.filter(f => f.tipoFato === 'Pontualidade').length;
    const postura = fatosConsultor.filter(f => f.tipoFato === 'Postura').length;
    const desempenho = fatosConsultor.filter(f => f.tipoFato === 'Desempenho').length;

    const naoAplicados = fatosConsultor.filter(f => !f.statusFeedback || f.statusFeedback === 'Não Aplicado').length;
    const agendados = fatosConsultor.filter(f => f.statusFeedback === 'Agendado').length;
    const concluidos = fatosConsultor.filter(f => f.statusFeedback === 'Aplicado / Concluído').length;

    return {
      total,
      elogios,
      processos,
      pontualidade,
      postura,
      desempenho,
      naoAplicados,
      agendados,
      concluidos
    };
  }, [fatosConsultor]);

  // Abre modal de edição carregando a data e horário atual do feedback
  const handleOpenEditFeedback = (fato: Ocorrencia) => {
    setEditingFato({ ...fato });
    // Se o fato já tem dataHoraFeedback salva, usa ela no input local YYYY-MM-DDTHH:mm
    if (fato.dataHoraFeedback || fato.dataFeedback) {
      try {
        const d = new Date(fato.dataHoraFeedback || fato.dataFeedback || '');
        if (!isNaN(d.getTime())) {
          const tzOffset = d.getTimezoneOffset() * 60000;
          setModalDataHoraFeedback(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
          return;
        }
      } catch {}
    }
    
    // Caso contrário, usa momento atual
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setModalDataHoraFeedback(new Date(now.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  // Salvar atualização de feedback com carimbo de login, data e horário
  const handleSalvarAtualizacaoFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFato) return;

    let isoFeedback = new Date().toISOString();
    if (modalDataHoraFeedback) {
      const dt = new Date(modalDataHoraFeedback);
      if (!isNaN(dt.getTime())) {
        isoFeedback = dt.toISOString();
      }
    }

    const novoStatus = editingFato.statusFeedback || 'Não Aplicado';
    const isFeedbackEfetivo = novoStatus !== 'Não Aplicado';

    const fatoAtualizado: Ocorrencia = {
      ...editingFato,
      statusFeedback: novoStatus,
      observacoesFeedback: editingFato.observacoesFeedback || '',
      // Carimbo auditável do gestor que conduziu e salvou o feedback via login
      gestorFeedback: isFeedbackEfetivo ? gestorLogadoNome : undefined,
      dataHoraFeedback: isFeedbackEfetivo ? isoFeedback : undefined,
      dataFeedback: isFeedbackEfetivo ? isoFeedback : undefined
    };

    onUpdateOcorrencia(fatoAtualizado);
    setEditingFato(null);

    setModalFeedbackFeedbackToast(
      `Dossiê atualizado com sucesso! Registrado por ${gestorLogadoNome} em ${formatBrazilianDate(isoFeedback)}.`
    );
    setTimeout(() => {
      setModalFeedbackFeedbackToast(null);
    }, 5000);
  };

  // Gerar Pauta Oficial Completa do Dossiê para Impressão, Cópia ou Arquivo
  const gerarTextoDossieCompleto = () => {
    const agoraLocal = new Date().toLocaleString('pt-BR');
    
    let texto = `================================================================================\n`;
    texto += `DOSSIÊ OFICIAL DE FEEDBACK E ALINHAMENTO FACTUAL (1-ON-1)\n`;
    texto += `SISTEMA: DIÁRIO DE BORDO - SUPERVISÃO INSIDE SALES\n`;
    texto += `================================================================================\n`;
    texto += `DATA E HORÁRIO DE EMISSÃO: ${agoraLocal}\n`;
    texto += `GESTOR(A) RESPONSÁVEL (AUTENTICADO VIA LOGIN): ${gestorLogadoNome} (${gestorLogadoCargo})\n`;
    texto += `LOGIN DO GESTOR: ${gestorLogadoLogin}\n`;
    texto += `CONSULTOR(A) AVALIADO(A): ${selectedConsultant}\n`;
    texto += `--------------------------------------------------------------------------------\n`;
    texto += `RESUMO EXECUTIVO DE INDICADORES:\n`;
    texto += `  - Total de Fatos Registrados no Histórico: ${stats.total}\n`;
    texto += `  - Elogios / Destaques Positivos: ${stats.elogios}\n`;
    texto += `  - Fatos de Processo & SLA: ${stats.processos}\n`;
    texto += `  - Fatos de Pontualidade: ${stats.pontualidade}\n`;
    texto += `  - Fatos de Postura & Conduta: ${stats.postura}\n`;
    texto += `  - Fatos de Desempenho / Conversão: ${stats.desempenho}\n`;
    texto += `  - Feedbacks Concluídos / Alinhados: ${stats.concluidos}\n`;
    texto += `  - Feedbacks Agendados: ${stats.agendados}\n`;
    texto += `  - Pendentes de Reunião 1-on-1: ${stats.naoAplicados}\n`;
    texto += `================================================================================\n\n`;

    if (stats.elogios > 0) {
      texto += `[SEÇÃO 1] RECONHECIMENTOS & PONTOS FORTES:\n`;
      fatosConsultor
        .filter(f => f.tipoFato === 'Elogio')
        .forEach((f, idx) => {
          const gestorCriador = f.gestorRegistro || f.supervisor;
          const dataCriacaoFato = formatBrazilianDate(f.dataHoraCriacao || f.dataHora);
          texto += `  ${idx + 1}. [Data do Fato: ${formatBrazilianDate(f.dataHora)}]\n`;
          texto += `     - Registrado por: ${gestorCriador} (em ${dataCriacaoFato})\n`;
          texto += `     - Evidência Factual: ${f.descricao}\n`;
          texto += `     - Reconhecimento: ${f.acaoTomada}\n`;
          if (f.observacoesFeedback) {
            texto += `     - Combinado 1-on-1: ${f.observacoesFeedback}\n`;
          }
          texto += `\n`;
        });
    }

    const pontosMelhoria = fatosConsultor.filter(f => f.tipoFato !== 'Elogio');
    if (pontosMelhoria.length > 0) {
      texto += `[SEÇÃO 2] FATOS PARA ALINHAMENTO, CONDUTA & PLANO DE AÇÃO:\n`;
      pontosMelhoria.forEach((f, idx) => {
        const st = f.statusFeedback || 'Não Aplicado';
        const gestorCriador = f.gestorRegistro || f.supervisor;
        const dataCriacaoFato = formatBrazilianDate(f.dataHoraCriacao || f.dataHora);
        const gestorFeed = f.gestorFeedback || 'Aguardando 1-on-1';
        const dataFeed = f.dataHoraFeedback ? formatBrazilianDate(f.dataHoraFeedback) : (f.dataFeedback ? formatBrazilianDate(f.dataFeedback) : 'Pendente');

        texto += `  ${idx + 1}. [Data do Fato: ${formatBrazilianDate(f.dataHora)}] (${f.tipoFato || 'Geral'} - Status: ${st})\n`;
        texto += `     - Registrado por: ${gestorCriador} (em ${dataCriacaoFato})\n`;
        texto += `     - Fato Ocorrido: ${f.descricao}\n`;
        texto += `     - Direcionamento Inicial: ${f.acaoTomada}\n`;
        if (f.statusFeedback === 'Aplicado / Concluído') {
          texto += `     - Feedback Conduzido por: ${gestorFeed} em ${dataFeed}\n`;
          texto += `     - Combinados Firmados no 1-on-1: ${f.observacoesFeedback || 'Alinhamento realizado sem notas adicionais'}\n`;
        } else if (f.statusFeedback === 'Agendado') {
          texto += `     - Feedback Agendado por: ${gestorFeed}\n`;
          if (f.observacoesFeedback) texto += `     - Pauta prévia: ${f.observacoesFeedback}\n`;
        } else {
          texto += `     - Situação: Pendente de Feedback 1-on-1\n`;
        }
        texto += `\n`;
      });
    }

    texto += `================================================================================\n`;
    texto += `[SEÇÃO 3] COMPROMISSOS E PRÓXIMOS PASSOS ACORDADOS NO 1-ON-1:\n`;
    texto += `1. ___________________________________________________________________________\n`;
    texto += `2. ___________________________________________________________________________\n`;
    texto += `3. ___________________________________________________________________________\n\n`;
    texto += `Data da Próxima Sessão de Acompanhamento: _____/_____/_________\n\n`;
    texto += `Assinatura do Consultor(a): ___________________________________________________\n`;
    texto += `Assinatura do(a) Gestor(a) [${gestorLogadoNome}]: ____________________________________\n`;
    texto += `================================================================================\n`;

    return texto;
  };

  // Copiar Pauta com Carimbo do Gestor
  const handleCopiarPauta = async () => {
    const texto = gerarTextoDossieCompleto();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiedPauta(true);
      setTimeout(() => setCopiedPauta(false), 3000);
    } catch {
      alert('Pauta gerada com sucesso! Selecione e copie o conteúdo.');
    }
  };

  // Baixar Arquivo .TXT do Dossiê Oficial
  const handleDownloadDossieTXT = () => {
    const texto = gerarTextoDossieCompleto();
    const cleanNome = selectedConsultant.toLowerCase().replace(/\s+/g, '_');
    const dataIso = new Date().toISOString().slice(0, 10);
    const filename = `dossie_feedback_${cleanNome}_${dataIso}.txt`;

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Imprimir / Salvar em PDF
  const handleImprimirDossie = () => {
    window.print();
  };

  // Badge para tipo de fato
  const getTipoFatoBadge = (tipo?: TipoFatoConsultor) => {
    switch (tipo) {
      case 'Elogio':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Elogio
          </span>
        );
      case 'Pontualidade':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Pontualidade
          </span>
        );
      case 'Postura':
        return (
          <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-red-600" />
            Postura
          </span>
        );
      case 'Processo':
        return (
          <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            <FileText className="w-3 h-3 text-sky-600" />
            Processo
          </span>
        );
      case 'Desempenho':
        return (
          <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-purple-600" />
            Desempenho
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
            <Award className="w-3 h-3 text-gray-600" />
            {tipo || 'Geral'}
          </span>
        );
    }
  };

  // Badge para status de feedback
  const getStatusFeedbackBadge = (status?: StatusFeedback) => {
    switch (status) {
      case 'Aplicado / Concluído':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Feedback Concluído
          </span>
        );
      case 'Agendado':
        return (
          <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-600" />
            Agendado
          </span>
        );
      case 'Não Aplicado':
      default:
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente de 1-on-1
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast de Sucesso no Salvamento do Feedback */}
      {modalFeedbackFeedbackToast && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 rounded-r-lg text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{modalFeedbackFeedbackToast}</span>
          </div>
          <button
            onClick={() => setModalFeedbackFeedbackToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* BARRA DE AUDITORIA CORPORATIVA DE LOGIN & SESSÃO */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-purple-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/10 rounded-lg text-purple-200">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">
                Auditoria de Acesso & Registro via Login:
              </span>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                Sessão Autenticada
              </span>
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <span>Gestor(a): {gestorLogadoNome}</span>
              <span className="text-purple-300 text-xs font-normal">({gestorLogadoCargo})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs text-purple-200">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-300" />
            <span>Usuário: <strong className="text-white">{gestorLogadoLogin}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-300" />
            <span>Data e Hora Atual: <strong className="text-white">{new Date().toLocaleDateString('pt-BR')}</strong></span>
          </div>
        </div>
      </div>

      {/* Seletor do Consultor & Ações do Dossiê */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {selectedConsultant.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="consultor-select" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Ficha Individual do Consultor:
              </label>
            </div>
            <select
              id="consultor-select"
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="text-lg font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-600 focus:bg-white cursor-pointer mt-1"
            >
              {consultoresDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c} {c === 'Kelvyn' ? '(Oficial)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botões de Exportar / Copiar / Imprimir Dossiê com Carimbo */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Copiar Pauta */}
          <button
            onClick={handleCopiarPauta}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
              copiedPauta
                ? 'bg-emerald-600 text-white'
                : 'bg-purple-700 hover:bg-purple-800 text-white active:scale-95'
            }`}
            title="Copiar estrutura oficial com carimbo de data, horário e gestor logado"
          >
            {copiedPauta ? (
              <>
                <Check className="w-4 h-4" />
                <span>Pauta Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Pauta 1-on-1</span>
              </>
            )}
          </button>

          {/* Botão Baixar Arquivo TXT do Dossiê */}
          <button
            onClick={handleDownloadDossieTXT}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer border ${
              downloadSuccess
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-800 active:scale-95'
            }`}
            title="Baixar arquivo de texto oficial do dossiê com carimbo de data, horário e gestor"
          >
            <Download className="w-4 h-4 text-purple-700" />
            <span>{downloadSuccess ? 'Arquivo Baixado!' : 'Exportar (.txt)'}</span>
          </button>

          {/* Botão Imprimir / Salvar PDF */}
          <button
            onClick={handleImprimirDossie}
            className="px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-800 active:scale-95"
            title="Imprimir ou salvar dossiê em PDF com cabeçalho de auditoria"
          >
            <Printer className="w-4 h-4 text-gray-700" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo de Fatos do Consultor */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total de Fatos</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{stats.total}</div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Histórico acumulado</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Elogios / Destaques
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">{stats.elogios}</div>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Reconhecimentos</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendentes 1-on-1
          </span>
          <div className="text-2xl font-black text-amber-800 mt-1">{stats.naoAplicados}</div>
          <span className="text-[11px] text-amber-700 mt-0.5 block">Fatos a alinhar</span>
        </div>

        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 shadow-2xs">
          <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider flex items-center gap-1">
            <MessageSquareShare className="w-3.5 h-3.5 text-purple-600" />
            Feedbacks Concluídos
          </span>
          <div className="text-2xl font-black text-purple-800 mt-1">{stats.concluidos}</div>
          <span className="text-[11px] text-purple-700 mt-0.5 block">Alinhamentos feitos</span>
        </div>
      </div>

      {/* Filtros Internos do Dossiê */}
      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
          <Filter className="w-4 h-4 text-purple-700" />
          <span>Filtrar Fatos de {selectedConsultant}:</span>
        </div>

        <select
          value={filtroTipoFato}
          onChange={(e) => setFiltroTipoFato(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-600 cursor-pointer"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="Elogio">Elogio / Reconhecimento</option>
          <option value="Processo">Processo</option>
          <option value="Pontualidade">Pontualidade</option>
          <option value="Postura">Postura</option>
          <option value="Desempenho">Desempenho</option>
          <option value="Comunicação">Comunicação</option>
          <option value="Outro">Outro</option>
        </select>

        <select
          value={filtroStatusFeedback}
          onChange={(e) => setFiltroStatusFeedback(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-600 cursor-pointer"
        >
          <option value="todos">Todos os Status de Feedback</option>
          <option value="Não Aplicado">Pendente de 1-on-1</option>
          <option value="Agendado">Agendado</option>
          <option value="Aplicado / Concluído">Aplicado / Concluído</option>
        </select>

        {(filtroTipoFato !== 'todos' || filtroStatusFeedback !== 'todos') && (
          <button
            onClick={() => {
              setFiltroTipoFato('todos');
              setFiltroStatusFeedback('todos');
            }}
            className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Timeline Cronológica de Fatos */}
      {fatosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 p-6">
          <UserCheck className="w-10 h-10 text-purple-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-gray-800">Nenhum fato registrado para {selectedConsultant}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            Utilize o formulário de Ocorrências acima para adicionar eventos factuais de pontualidade, processos, conduta ou elogios.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fatosFiltrados.map((fato) => {
            const gestorCriador = fato.gestorRegistro || fato.supervisor;
            const dataCriacaoFato = fato.dataHoraCriacao ? formatBrazilianDate(fato.dataHoraCriacao) : formatBrazilianDate(fato.dataHora);
            const gestorDoFeedback = fato.gestorFeedback;
            const dataDoFeedback = fato.dataHoraFeedback ? formatBrazilianDate(fato.dataHoraFeedback) : (fato.dataFeedback ? formatBrazilianDate(fato.dataFeedback) : null);

            return (
              <div
                key={fato.id}
                className={`bg-white rounded-xl border transition-all p-5 shadow-2xs hover:shadow-sm ${
                  fato.tipoFato === 'Elogio'
                    ? 'border-emerald-200 border-l-4 border-l-emerald-600'
                    : fato.statusFeedback === 'Aplicado / Concluído'
                    ? 'border-gray-200 border-l-4 border-l-purple-600'
                    : 'border-amber-200 border-l-4 border-l-amber-500'
                }`}
              >
                {/* Linha Superior: Badges do Fato + Data/Horário + Botão Gerenciar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-gray-100 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      <Calendar className="w-3.5 h-3.5 text-purple-700" />
                      Fato Ocorrido: {formatBrazilianDate(fato.dataHora)}
                    </span>
                    {getTipoFatoBadge(fato.tipoFato)}
                    {getStatusFeedbackBadge(fato.statusFeedback)}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditFeedback(fato)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <MessageSquareShare className="w-3.5 h-3.5 text-purple-700" />
                      <span>Gerenciar Feedback</span>
                    </button>
                  </div>
                </div>

                {/* Bloco de Auditoria Rastreável: Data, Horário e Gestor Registrante */}
                <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      Registrado por: <strong className="text-slate-900 font-bold">{gestorCriador}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Gravação no sistema: <strong>{dataCriacaoFato}</strong>
                    </span>
                  </div>

                  {/* Se já houve feedback registrado, mostra o gestor e horário do feedback */}
                  {fato.statusFeedback === 'Aplicado / Concluído' && gestorDoFeedback && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>
                        Feedback salvo por <strong>{gestorDoFeedback}</strong> {dataDoFeedback ? `em ${dataDoFeedback}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Descrição Factual do Evento */}
                <div className="mb-3">
                  <span className="text-xs font-bold text-gray-700 block mb-1">Evidência Factual:</span>
                  <p className="text-sm text-gray-800 font-medium leading-relaxed bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                    {fato.descricao}
                  </p>
                </div>

                {/* Ação Tomada ou Direcionamento e Notas de 1-on-1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-purple-50/40 p-3 rounded-lg border border-purple-100">
                    <span className="font-bold text-purple-900 block mb-1">
                      Ação Tomada / Direcionamento Inicial:
                    </span>
                    <span className="text-gray-700 leading-relaxed">{fato.acaoTomada}</span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="font-bold text-gray-800 block mb-1 flex items-center gap-1">
                      <MessageSquareShare className="w-3.5 h-3.5 text-gray-600" />
                      Alinhamentos & Combinados do 1-on-1:
                    </span>
                    {fato.observacoesFeedback ? (
                      <span className="text-gray-700 leading-relaxed italic">{fato.observacoesFeedback}</span>
                    ) : (
                      <span className="text-gray-400 italic">Nenhum combinado registrado ainda. Clique em "Gerenciar Feedback" após a conversa.</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE FEEDBACK COM CARIMBO DE LOGIN */}
      {editingFato && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden">
            <div className="bg-purple-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareShare className="w-5 h-5 text-purple-200" />
                <h3 className="text-base font-bold text-white">
                  Registrar Feedback 1-on-1 - {editingFato.consultor}
                </h3>
              </div>
              <button
                onClick={() => setEditingFato(null)}
                className="text-purple-200 hover:text-white cursor-pointer px-2 py-1 rounded text-xs font-bold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSalvarAtualizacaoFeedback} className="p-5 space-y-4">
              
              {/* Box de Auditoria: Gestor autenticado por login */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Gestor Autenticado (via Login):
                  </span>
                  <span className="bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded text-[10px]">
                    Assinatura Digital
                  </span>
                </div>
                <div className="text-gray-800 font-bold">
                  {gestorLogadoNome} <span className="font-normal text-gray-600">({gestorLogadoCargo})</span>
                </div>
                <div className="text-[11px] text-gray-500">
                  O dossiê registrará e armazenará esta alteração assinada com seu usuário, data e horário oficial.
                </div>
              </div>

              {/* Status do Feedback */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status do Feedback 1-on-1
                </label>
                <select
                  value={editingFato.statusFeedback || 'Não Aplicado'}
                  onChange={(e) => setEditingFato({
                    ...editingFato,
                    statusFeedback: e.target.value as StatusFeedback
                  })}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 font-bold text-gray-800 cursor-pointer"
                >
                  <option value="Não Aplicado">Pendente / Não Aplicado</option>
                  <option value="Agendado">Agendado para próxima reunião</option>
                  <option value="Aplicado / Concluído">Aplicado / Concluído (Feedback realizado)</option>
                </select>
              </div>

              {/* Data e Horário do Feedback */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    Data e Horário do Feedback
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    Carimbo oficial da sessão
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={modalDataHoraFeedback}
                  onChange={(e) => setModalDataHoraFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 font-semibold text-gray-800"
                  required
                />
              </div>

              {/* Combinados e Notas */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notas de Alinhamento e Combinados Firmados
                </label>
                <textarea
                  rows={4}
                  value={editingFato.observacoesFeedback || ''}
                  onChange={(e) => setEditingFato({
                    ...editingFato,
                    observacoesFeedback: e.target.value
                  })}
                  placeholder="Ex: Alinhado com o consultor a importância de preencher o checklist de pré-atendimento no CRM. Acordado que ele revisará seus últimos 5 contatos do dia..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingFato(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Salvar Atualização no Dossiê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
