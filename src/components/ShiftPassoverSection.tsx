/**
 * @file src/components/ShiftPassoverSection.tsx
 * @description SEÇÃO 4: Fechamento de Turno, Controle de Pendências & Cálculo de SLA de 24h Úteis de Trabalho.
 * Gerencia os registros de passagem de bastão, modal para leitura detalhada de 'O que funcionou bem',
 * modal de tabulação e justificativa de solução para conclusão de pendências, e exportação CSV.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Ocorrencia, ResumoPassagem, ComentarioPassagem } from '../types';
import { 
  formatBrazilianDate, 
  calculateWorkingHoursSla, 
  exportPassagensToCSV 
} from '../utils/statisticalAnalysis';
import { sanitizeTextInput, verifyAdminAuthorization } from '../utils/security';
import { DbOperationResult } from '../services/dbService';
import { 
  Check, CheckCircle2, AlertTriangle, User, Calendar, 
  Clock, Download, Save, Edit3, Trash2, RotateCcw, AlertCircle, 
  Search, X, Lock, CheckCircle, Sparkles, Maximize2, FileText,
  MessageSquare, ExternalLink, HelpCircle, Send, Lightbulb, ThumbsUp,
  CornerDownRight, MessageCircle, ShieldCheck, Tag
} from 'lucide-react';

interface ShiftPassoverSectionProps {
  ocorrencias: Ocorrencia[];
  passagens: ResumoPassagem[];
  onSavePassagem: (passagem: ResumoPassagem) => Promise<DbOperationResult | void>;
  onUpdatePassagem?: (passagem: ResumoPassagem) => Promise<DbOperationResult | void>;
  onUpdateStatusPassagem?: (
    id: string, 
    status: 'Pendente' | 'Concluído',
    observacaoConclusao?: string,
    responsavelConclusao?: string
  ) => Promise<DbOperationResult | void>;
  onDeletePassagem?: (id: string) => Promise<DbOperationResult | void>;
  onAddComentarioPassagem?: (passagemId: string, comentario: ComentarioPassagem) => Promise<DbOperationResult | void>;
  defaultSupervisor?: string;
}

export const ShiftPassoverSection: React.FC<ShiftPassoverSectionProps> = React.memo(({
  ocorrencias,
  passagens,
  onSavePassagem,
  onUpdatePassagem,
  onUpdateStatusPassagem,
  onDeletePassagem,
  onAddComentarioPassagem,
  defaultSupervisor = 'Debora Rodrigues'
}) => {
  // Estados do formulário de novo fechamento
  const [supervisor, setSupervisor] = useState<string>(defaultSupervisor);
  const [oQueFuncionou, setOQueFuncionou] = useState<string>('');
  const [oQueFicaPendente, setOQueFicaPendente] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Status de salvamento
  const [saveStatus, setSaveStatus] = useState<{
    type: 'supabase' | 'local' | 'error' | null;
    message: string;
    errorDetail?: string;
  }>({ type: null, message: '' });

  // Estados de filtros e pesquisa
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'concluidos' | 'atrasados'>('todos');
  const [filtroSupervisor, setFiltroSupervisor] = useState<string>('');

  // Estado para Modal de Leitura Detalhada ("O que funcionou bem" ou "Pendência")
  const [viewingDetail, setViewingDetail] = useState<{
    titulo: string;
    tipo: 'funcionou' | 'pendente' | 'solucao' | 'geral';
    texto: string;
    passagem: ResumoPassagem;
  } | null>(null);

  // Estados para formulário de comentários de líderes no Modal
  const [comentarioAutor, setComentarioAutor] = useState<string>(defaultSupervisor);
  const [comentarioTexto, setComentarioTexto] = useState<string>('');
  const [comentarioTipo, setComentarioTipo] = useState<'auxilio' | 'reconhecimento' | 'alinhamento'>('reconhecimento');
  const [isSavingComentario, setIsSavingComentario] = useState<boolean>(false);
  const [comentarioFeedback, setComentarioFeedback] = useState<string | null>(null);

  // Estado para Modal de Tabulação / Conclusão de Pendência
  const [concludingPassagem, setConcludingPassagem] = useState<ResumoPassagem | null>(null);
  const [conclusaoObservacao, setConclusaoObservacao] = useState<string>('');
  const [conclusaoResponsavel, setConclusaoResponsavel] = useState<string>(defaultSupervisor);
  const [isSavingConclusao, setIsSavingConclusao] = useState<boolean>(false);

  // Estados de Edição com Senha
  const [editingPassagem, setEditingPassagem] = useState<ResumoPassagem | null>(null);
  const [editSupervisor, setEditSupervisor] = useState<string>('');
  const [editFuncionou, setEditFuncionou] = useState<string>('');
  const [editPendente, setEditPendente] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Filtrar ocorrências do dia de hoje com useMemo
  const dataHojeISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const ocorrenciasHoje = useMemo(() => {
    return ocorrencias.filter((oc) => oc.dataHora.startsWith(dataHojeISO));
  }, [ocorrencias, dataHojeISO]);

  // Handler para Salvar Novo Registro de Fechamento (Validação Rigorosa & Sanitização)
  const handleSalvarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();

    // SEGURANÇA: Sanitização contra XSS e limitação de caracteres
    const cleanFuncionou = sanitizeTextInput(oQueFuncionou, 3000);
    const cleanPendente = sanitizeTextInput(oQueFicaPendente, 3000);
    const cleanSupervisor = sanitizeTextInput(supervisor, 100);

    // VALIDAÇÃO RIGOROSA DE REGRAS DE NEGÓCIO:
    // Garante obrigatoriedade de ambos os campos antes do envio
    if (!cleanFuncionou || cleanFuncionou.trim().length < 5) {
      alert('Por favor, preencha o campo obrigatório: "O que funcionou bem hoje?" (mínimo 5 caracteres).');
      return;
    }

    if (!cleanPendente || cleanPendente.trim().length < 5) {
      alert('Por favor, preencha o campo obrigatório: "O que fica pendente para o próximo turno / amanhã?" (mínimo 5 caracteres com SLA de 24h úteis).');
      return;
    }

    setIsSaving(true);
    const timestampCriacao = new Date().toISOString();

    const novaPassagem: ResumoPassagem = {
      id: 'pass-' + Date.now().toString(36),
      data: dataHojeISO,
      supervisor: cleanSupervisor,
      oQueFuncionou: cleanFuncionou,
      oQueFicaPendente: cleanPendente,
      dataHoraCriacao: timestampCriacao,
      status: 'Pendente'
    };

    try {
      const result = await onSavePassagem(novaPassagem);

      if (result && result.storage === 'supabase' && result.success) {
        setSaveStatus({
          type: 'supabase',
          message: 'Fechamento de turno salvo no Supabase (Nuvem) com sucesso!'
        });
      } else if (result && result.error) {
        setSaveStatus({
          type: 'error',
          message: 'Salvo localmente com segurança no dispositivo.',
          errorDetail: result.error
        });
      } else {
        setSaveStatus({
          type: 'local',
          message: 'Fechamento de turno salvo com sucesso no navegador!'
        });
      }

      // Limpar campos após salvar
      setOQueFuncionou('');
      setOQueFicaPendente('');
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: 'Ocorreu um erro ao salvar o fechamento:',
        errorDetail: err?.message || String(err)
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 7000);
    }
  };

  // Abrir modal de Tabulação para concluir pendência
  const handleAbrirConclusao = useCallback((passagem: ResumoPassagem) => {
    setConcludingPassagem(passagem);
    setConclusaoObservacao(passagem.observacaoConclusao || '');
    setConclusaoResponsavel(passagem.responsavelConclusao || supervisor || defaultSupervisor);
  }, [supervisor, defaultSupervisor]);

  // Confirmar Tabulação e Conclusão de Pendência
  const handleConfirmarConclusao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concludingPassagem || !onUpdateStatusPassagem) return;

    const cleanObservacao = sanitizeTextInput(conclusaoObservacao, 3000);
    const cleanResponsavel = sanitizeTextInput(conclusaoResponsavel, 100);

    if (!cleanObservacao || cleanObservacao.trim().length < 5) {
      alert('Por favor, informe a tabulação com a descrição da conclusão ou solução aplicada (mínimo 5 caracteres).');
      return;
    }

    setIsSavingConclusao(true);
    await onUpdateStatusPassagem(
      concludingPassagem.id, 
      'Concluído', 
      cleanObservacao, 
      cleanResponsavel
    );
    setIsSavingConclusao(false);
    setConcludingPassagem(null);
    setConclusaoObservacao('');
  };

  // Reabrir Pendência
  const handleReabrirPendencia = useCallback(async (passagem: ResumoPassagem) => {
    if (!onUpdateStatusPassagem) return;
    if (window.confirm('Deseja reabrir esta pendência? Ela voltará para o status "Pendente".')) {
      await onUpdateStatusPassagem(passagem.id, 'Pendente');
    }
  }, [onUpdateStatusPassagem]);

  // Handler de Edição com Validação de Senha de Segurança
  const handleSolicitarEdicao = useCallback((passagem: ResumoPassagem) => {
    const senhaInput = window.prompt('Confirmação de Segurança: Informe a senha do projeto para editar este registro:');
    if (verifyAdminAuthorization(senhaInput)) {
      setEditingPassagem(passagem);
      setEditSupervisor(passagem.supervisor);
      setEditFuncionou(passagem.oQueFuncionou);
      setEditPendente(passagem.oQueFicaPendente);
    } else if (senhaInput !== null) {
      alert('Senha incorreta! A edição não foi autorizada.');
    }
  }, []);

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPassagem || !onUpdatePassagem) return;

    const cleanFuncionou = sanitizeTextInput(editFuncionou, 3000);
    const cleanPendente = sanitizeTextInput(editPendente, 3000);
    const cleanSupervisor = sanitizeTextInput(editSupervisor, 100);

    setIsSavingEdit(true);

    const atualizado: ResumoPassagem = {
      ...editingPassagem,
      supervisor: cleanSupervisor,
      oQueFuncionou: cleanFuncionou,
      oQueFicaPendente: cleanPendente
    };

    await onUpdatePassagem(atualizado);
    setIsSavingEdit(false);
    setEditingPassagem(null);
  };

  // Handler de Exclusão com Validação de Senha de Segurança
  const handleSolicitarExclusao = useCallback(async (id: string) => {
    if (!onDeletePassagem) return;

    const senhaInput = window.prompt('Confirmação de Segurança: Informe a senha do projeto para EXCLUIR este registro de fechamento:');
    if (verifyAdminAuthorization(senhaInput)) {
      if (window.confirm('Tem certeza que deseja excluir permanentemente este registro de fechamento de turno?')) {
        await onDeletePassagem(id);
      }
    } else if (senhaInput !== null) {
      alert('Senha incorreta! A exclusão não foi autorizada.');
    }
  }, [onDeletePassagem]);

  // Handler para abrir modal de detalhes ajustando o tipo de comentário inicial
  const handleAbrirDetalhes = useCallback((
    titulo: string, 
    tipo: 'funcionou' | 'pendente' | 'solucao' | 'geral', 
    texto: string, 
    passagem: ResumoPassagem
  ) => {
    setViewingDetail({ titulo, tipo, texto, passagem });
    setComentarioTexto('');
    setComentarioFeedback(null);
    setComentarioAutor(defaultSupervisor);
    if (tipo === 'pendente') {
      setComentarioTipo('auxilio');
    } else if (tipo === 'funcionou') {
      setComentarioTipo('reconhecimento');
    } else {
      setComentarioTipo('alinhamento');
    }
  }, [defaultSupervisor]);

  // Handler para salvar novo comentário ou apontamento de auxílio do líder
  const handleEnviarComentario = async (e: React.FormEvent, passagemId: string) => {
    e.preventDefault();
    if (!onAddComentarioPassagem) return;

    const cleanTexto = sanitizeTextInput(comentarioTexto, 3000);
    const cleanAutor = sanitizeTextInput(comentarioAutor, 100);

    if (!cleanTexto || cleanTexto.trim().length < 3) {
      alert('Por favor, digite seu comentário ou auxílio (mínimo de 3 caracteres).');
      return;
    }

    setIsSavingComentario(true);
    const novoComentario: ComentarioPassagem = {
      id: 'com-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      autor: cleanAutor || defaultSupervisor,
      contexto: viewingDetail?.tipo === 'funcionou' ? 'funcionou' : (viewingDetail?.tipo === 'pendente' ? 'pendente' : 'geral'),
      tipo: comentarioTipo,
      mensagem: cleanTexto,
      dataHora: new Date().toISOString()
    };

    try {
      await onAddComentarioPassagem(passagemId, novoComentario);
      setComentarioTexto('');
      setComentarioFeedback('Comentário registrado e salvo com sucesso!');
      setTimeout(() => setComentarioFeedback(null), 4000);
    } catch (err: any) {
      alert('Erro ao salvar comentário: ' + (err?.message || 'Falha ao registrar comentário'));
    } finally {
      setIsSavingComentario(false);
    }
  };

  // Filtragem e Estatísticas dos Registros Salvos
  const passagensProcessadas = useMemo(() => {
    return passagens.map((p) => {
      const isConcluido = p.status === 'Concluído' || Boolean(p.dataHoraConclusao);
      const sla = calculateWorkingHoursSla(p.dataHoraCriacao, p.dataHoraConclusao, isConcluido);
      return {
        ...p,
        isConcluido,
        sla
      };
    });
  }, [passagens]);

  const estatisticas = useMemo(() => {
    let total = passagensProcessadas.length;
    let pendentes = 0;
    let concluidos = 0;
    let atrasados = 0;

    for (let i = 0; i < passagensProcessadas.length; i++) {
      const item = passagensProcessadas[i];
      if (item.isConcluido) {
        concluidos++;
      } else {
        pendentes++;
      }
      if (item.sla.isAtrasado) {
        atrasados++;
      }
    }

    return { total, pendentes, concluidos, atrasados };
  }, [passagensProcessadas]);

  const passagensFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return passagensProcessadas.filter((p) => {
      const matchBusca = 
        !termo ||
        p.supervisor.toLowerCase().includes(termo) ||
        p.oQueFuncionou.toLowerCase().includes(termo) ||
        p.oQueFicaPendente.toLowerCase().includes(termo) ||
        (p.observacaoConclusao && p.observacaoConclusao.toLowerCase().includes(termo)) ||
        p.data.includes(termo);

      const matchSupervisor = !filtroSupervisor || p.supervisor === filtroSupervisor;

      let matchStatus = true;
      if (filtroStatus === 'pendentes') {
        matchStatus = !p.isConcluido;
      } else if (filtroStatus === 'concluidos') {
        matchStatus = p.isConcluido;
      } else if (filtroStatus === 'atrasados') {
        matchStatus = p.sla.isAtrasado;
      }

      return matchBusca && matchSupervisor && matchStatus;
    });
  }, [passagensProcessadas, busca, filtroSupervisor, filtroStatus]);

  return (
    <div className="space-y-8">
      
      {/* SEÇÃO 1: Formulário de Registro de Fechamento de Turno */}
      <div className="corporate-card p-5 sm:p-6 border-l-4 border-l-[#005b2e]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-gray-200 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-primary-green">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Fechamento de Turno & Registro de Pendências
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Consolidação diária de passagem de bastão operacional, controle de pendências e tabulação de conclusões
              </p>
            </div>
          </div>

          {/* Feedback de Gravação */}
          {saveStatus.type === 'supabase' && (
            <div className="flex items-center gap-2 bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{saveStatus.message}</span>
            </div>
          )}

          {saveStatus.type === 'local' && (
            <div className="flex items-center gap-2 bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <span>{saveStatus.message}</span>
            </div>
          )}

          {saveStatus.type === 'error' && (
            <div className="flex flex-col gap-1 bg-red-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm max-w-md">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-200 shrink-0" />
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

        <form onSubmit={handleSalvarRegistro} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
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
                <option value="Heder Santos">Heder Santos (Gerente de Vendas)</option>
                <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
              </select>
            </div>

            {/* Data de Registro */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Data de Fechamento do Turno
              </label>
              <div className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-medium flex items-center justify-between">
                <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="text-xs text-gray-500 font-mono">Hoje</span>
              </div>
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
              placeholder="Descreva as vitórias do turno, metas alcançadas, conversões em alta ou boa qualidade de leads..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e]"
            />
          </div>

          {/* O que fica pendente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                O que fica pendente para o próximo turno / amanhã? *
              </span>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                SLA: 24h úteis de trabalho
              </span>
            </label>
            <textarea
              required
              rows={3}
              value={oQueFicaPendente}
              onChange={(e) => setOQueFicaPendente(e.target.value)}
              placeholder="Relate pendências técnicas, chamados em aberto, leads prioritários para recontato ou alertas operacionais que requerem ação do próximo turno..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e]"
            />
          </div>

          {/* Resumo das ocorrências vinculadas */}
          <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200 text-xs">
            <span className="font-bold text-emerald-900 block mb-1">
              Ocorrências operacionais registradas no dia de hoje ({ocorrenciasHoje.length} encontradas):
            </span>
            {ocorrenciasHoje.length === 0 ? (
              <p className="text-gray-600 italic">
                Nenhuma ocorrência registrada no sistema na data de hoje.
              </p>
            ) : (
              <ul className="space-y-1 text-emerald-950 font-medium max-h-28 overflow-y-auto">
                {ocorrenciasHoje.map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${o.impacto === 'Crítico' ? 'bg-red-500' : 'bg-emerald-600'}`} />
                    <span className="font-bold">[{o.categoria}]</span> 
                    <span className="truncate">{o.descricao}</span>
                    <span className="ml-auto text-[11px] text-gray-500 shrink-0">({o.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botão de Salvar Registro */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary-green hover:bg-primary-dark text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Salvando no Banco...' : 'Salvar Fechamento de Turno'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 2: Painel de Controle de Pendências de Turno e Histórico */}
      <div className="corporate-card p-5 sm:p-6">
        
        {/* Top Header com Botão Exportar CSV */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 border-b border-gray-200 gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-green" />
              Controle de Turnos
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Clique nos cards para abrir a leitura completa. Conclusões exigem tabulação de solução.
            </p>
          </div>

          {/* Botão clássico Exportar para CSV */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => exportPassagensToCSV(passagensFiltradas)}
              className="px-4 py-2 bg-primary-green hover:bg-primary-dark text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Exportar todos os fechamentos de turno filtrados para planilha Excel/CSV"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>Exportar para CSV</span>
            </button>
          </div>
        </div>

        {/* Cards de Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`p-3 rounded-lg border text-left transition-all ${
              filtroStatus === 'todos'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-600/30'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Total</span>
            <span className="text-lg font-bold text-gray-800">{estatisticas.total}</span>
          </button>

          <button
            onClick={() => setFiltroStatus('pendentes')}
            className={`p-3 rounded-lg border text-left transition-all ${
              filtroStatus === 'pendentes'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-600/30'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Pendentes
            </span>
            <span className="text-lg font-bold text-amber-900">{estatisticas.pendentes}</span>
          </button>

          <button
            onClick={() => setFiltroStatus('concluidos')}
            className={`p-3 rounded-lg border text-left transition-all ${
              filtroStatus === 'concluidos'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-600/30'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Concluídos
            </span>
            <span className="text-lg font-bold text-emerald-900">{estatisticas.concluidos}</span>
          </button>

          <button
            onClick={() => setFiltroStatus('atrasados')}
            className={`p-3 rounded-lg border text-left transition-all ${
              filtroStatus === 'atrasados'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-600/30'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600" />
              Com Atraso (&gt;24h)
            </span>
            <span className="text-lg font-bold text-red-900">{estatisticas.atrasados}</span>
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 mb-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por liderança, pendência, o que funcionou ou solução aplicada..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={filtroSupervisor}
              onChange={(e) => setFiltroSupervisor(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
            >
              <option value="">Liderança</option>
              <option value="Heder Santos">Heder Santos (Gerente)</option>
              <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
            </select>
          </div>
        </div>

        {/* Lista de Registros Salvos */}
        {passagensFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 text-xs">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold text-gray-700">Nenhum registro de fechamento encontrado</p>
            <p className="text-gray-400 mt-1">Utilize o formulário acima para salvar o fechamento do turno.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {passagensFiltradas.map((p) => {
              const isAtrasado = p.sla.isAtrasado;
              const isConcluido = p.isConcluido;

              return (
                <div 
                  key={p.id} 
                  className={`p-4 sm:p-5 rounded-lg border text-xs transition-all ${
                    isAtrasado && !isConcluido
                      ? 'bg-red-50/40 border-red-300 shadow-xs'
                      : isConcluido
                      ? 'bg-gray-50/80 border-gray-200'
                      : 'bg-white border-gray-300 shadow-xs'
                  }`}
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-gray-200 gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-700" />
                        {p.supervisor}
                      </span>
                      
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 font-medium">Ref: {p.data}</span>

                      {/* Badge de Status */}
                      {isConcluido ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Concluído
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Pendente
                        </span>
                      )}

                      {/* Badge de SLA / Horas de Trabalho */}
                      {isAtrasado && !isConcluido && (
                        <span className="bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3 text-red-200" />
                          ATRASADO (+{p.sla.horasExcedentes}h úteis de excesso)
                        </span>
                      )}

                      {isAtrasado && isConcluido && (
                        <span className="bg-red-100 text-red-800 border border-red-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Concluído com Atraso ({p.sla.workingHoursFormatted} úteis)
                        </span>
                      )}

                      {!isAtrasado && isConcluido && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          No Prazo ({p.sla.workingHoursFormatted} úteis)
                        </span>
                      )}

                      {!isAtrasado && !isConcluido && (
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          {p.sla.workingHoursFormatted} úteis decorridas (Limite: 24h)
                        </span>
                      )}
                    </div>

                    {/* Datas de Criação e Conclusão */}
                    <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-3">
                      <span>
                        <strong>Criado:</strong> {formatBrazilianDate(p.dataHoraCriacao)}
                      </span>
                      {p.dataHoraConclusao && (
                        <span className="text-emerald-800 font-medium">
                          <strong>Concluído em:</strong> {formatBrazilianDate(p.dataHoraConclusao)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo: O que funcionou e O que fica pendente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    
                    {/* Card Interativo: O que funcionou bem (Clique para abrir modal com detalhes completos e comentários) */}
                    <div 
                      onClick={() => handleAbrirDetalhes(
                        'O Que Funcionou Bem no Turno',
                        'funcionou',
                        p.oQueFuncionou || 'Nenhum detalhe informado.',
                        p
                      )}
                      className="bg-emerald-50/70 hover:bg-emerald-100/70 p-3 rounded-lg border border-emerald-200/80 hover:border-emerald-400 transition-all cursor-pointer group shadow-2xs"
                      title="Clique para abrir, ler detalhes e interagir com comentários/elogios"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          O que funcionou bem:
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-emerald-200 transition-colors">
                          <Maximize2 className="w-3 h-3" />
                          Detalhes & Comentários
                        </span>
                      </div>
                      <p className="text-emerald-950 whitespace-pre-wrap leading-relaxed line-clamp-3">
                        {p.oQueFuncionou || 'Nenhum detalhe informado.'}
                      </p>
                    </div>

                    {/* Card Interativo: O que fica pendente (Clique para abrir modal com detalhes e auxílio) */}
                    <div 
                      onClick={() => handleAbrirDetalhes(
                        'O Que Ficou Pendente para o Próximo Turno',
                        'pendente',
                        p.oQueFicaPendente || 'Nenhuma pendência registrada.',
                        p
                      )}
                      className={`p-3 rounded-lg border leading-relaxed cursor-pointer transition-all group shadow-2xs ${
                        isAtrasado && !isConcluido
                          ? 'bg-red-50/80 hover:bg-red-100/80 border-red-200 hover:border-red-400 text-red-950 font-medium'
                          : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200/80 hover:border-amber-400 text-amber-950'
                      }`}
                      title="Clique para abrir, ler pendência e pontuar auxílio/plano de ação"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1 text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          O que ficou para o próximo turno:
                        </span>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:bg-amber-200 transition-colors">
                          <Maximize2 className="w-3 h-3" />
                          Detalhes & Auxílio
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap font-medium line-clamp-3">
                        {p.oQueFicaPendente || 'Nenhuma pendência registrada.'}
                      </p>
                    </div>
                  </div>

                  {/* Seção de Conclusão / Solução Aplicada (Quando Concluído) */}
                  {isConcluido && (
                    <div 
                      onClick={() => handleAbrirDetalhes(
                        'Tabulação: Solução / Conclusão Aplicada',
                        'solucao',
                        p.observacaoConclusao || 'Conclusão registrada com sucesso.',
                        p
                      )}
                      className="bg-emerald-100/50 hover:bg-emerald-100/80 p-3 rounded-lg border border-emerald-300 text-emerald-950 mb-3 cursor-pointer transition-all group"
                      title="Clique para ler a tabulação completa da solução aplicada"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                          Solução / Conclusão Aplicada:
                          {p.responsavelConclusao && (
                            <span className="font-normal text-emerald-800 text-[11px]">
                              (por <strong>{p.responsavelConclusao}</strong> em {p.dataHoraConclusao ? formatBrazilianDate(p.dataHoraConclusao) : ''})
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-200/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          Ver Tabulação
                        </span>
                      </div>
                      {p.observacaoConclusao ? (
                        <p className="whitespace-pre-wrap text-emerald-950 line-clamp-2 italic">
                          "{p.observacaoConclusao}"
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Barra de Ações: Conclusão com Tabulação, Botão de Comentários, Edição e Exclusão */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-200/80 gap-2">
                    
                    {/* Status de SLA e Contador de Comentários */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{p.sla.mensagemSla}</span>
                      </div>

                      {/* Botão / Contador de Comentários de Líderes */}
                      <button
                        onClick={() => handleAbrirDetalhes(
                          'Espaço Colaborativo dos Líderes • Fechamento de Turno',
                          'geral',
                          `O QUE FUNCIONOU BEM:\n${p.oQueFuncionou || 'N/A'}\n\nO QUE FICOU PENDENTE:\n${p.oQueFicaPendente || 'N/A'}`,
                          p
                        )}
                        className={`px-2.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                          p.comentarios && p.comentarios.length > 0
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                        }`}
                        title="Abrir área de comentários e auxílio da liderança"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {p.comentarios && p.comentarios.length > 0
                            ? `${p.comentarios.length} comentário${p.comentarios.length > 1 ? 's' : ''} de líderes`
                            : 'Comentar / Auxiliar'}
                        </span>
                      </button>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2">
                      
                      {/* Botão de Conclusão com Tabulação Obrigatória */}
                      {isConcluido ? (
                        <button
                          onClick={() => handleReabrirPendencia(p)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Reabrir esta pendência"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reabrir Pendência</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAbrirConclusao(p)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Marcar pendência como concluída e tabula a solução aplicada"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar como Concluído</span>
                        </button>
                      )}

                      {/* Botão de Edição (Mediante Senha) */}
                      <button
                        onClick={() => handleSolicitarEdicao(p)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors border border-gray-300 cursor-pointer"
                        title="Editar registro de fechamento (requer senha de autorização)"
                      >
                        <Lock className="w-3 h-3 text-gray-400" />
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {/* Botão de Exclusão (Mediante Senha) */}
                      <button
                        onClick={() => handleSolicitarExclusao(p.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors border border-red-200 cursor-pointer"
                        title="Excluir este registro (requer senha de autorização)"
                      >
                        <Lock className="w-3 h-3 text-red-400" />
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Excluir</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL 1: LEITURA DETALHADA E ÁREA COLABORATIVA DE COMENTÁRIOS E AUXÍLIO DOS LÍDERES */}
      {viewingDetail && (() => {
        const currentPassagem = passagens.find((p) => p.id === viewingDetail.passagem.id) || viewingDetail.passagem;
        const comentarios = currentPassagem.comentarios || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 text-gray-800">
              
              {/* Header do Modal */}
              <div className={`p-4 flex items-center justify-between text-white shrink-0 ${
                viewingDetail.tipo === 'funcionou'
                  ? 'bg-emerald-800'
                  : viewingDetail.tipo === 'pendente'
                  ? 'bg-amber-700'
                  : 'bg-indigo-900'
              }`}>
                <div className="flex items-center gap-2">
                  {viewingDetail.tipo === 'funcionou' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  ) : viewingDetail.tipo === 'pendente' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-200" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-indigo-200" />
                  )}
                  <div>
                    <h3 className="text-base font-bold leading-tight">{viewingDetail.titulo}</h3>
                    <p className="text-[11px] text-white/80">Espaço de leitura, alinhamento e auxílio colaborativo entre líderes</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingDetail(null)}
                  className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Metadados */}
              <div className="bg-gray-50 px-5 py-2.5 border-b border-gray-200 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  Supervisor do Turno: <strong>{currentPassagem.supervisor}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  Data de Criação: {formatBrazilianDate(currentPassagem.dataHoraCriacao)}
                </span>
              </div>

              {/* Corpo com Scroll */}
              <div className="p-5 overflow-y-auto space-y-5 flex-grow text-xs">
                
                {/* 1. Conteúdo Original Selecionado */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
                    <span>Registro Original do Supervisor</span>
                    <span className="text-gray-400 font-normal">Data: {currentPassagem.data}</span>
                  </label>
                  <div className={`p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                    viewingDetail.tipo === 'funcionou'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : viewingDetail.tipo === 'pendente'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}>
                    {viewingDetail.texto}
                  </div>
                </div>

                {/* 2. Seção de Comentários e Auxílio de Outros Líderes */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-indigo-600" />
                      Comentários & Pontuações de Auxílio dos Líderes
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full text-xs ml-1">
                        {comentarios.length}
                      </span>
                    </h4>
                  </div>

                  {/* Lista de Comentários Anteriores */}
                  {comentarios.length === 0 ? (
                    <div className="bg-indigo-50/40 rounded-lg p-4 text-center border border-dashed border-indigo-200 text-indigo-900 mb-4">
                      <Lightbulb className="w-6 h-6 mx-auto mb-1 text-indigo-500" />
                      <p className="font-semibold text-xs">Nenhum líder comentou neste registro ainda.</p>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Utilize o formulário abaixo para elogiar o que deu certo ou pontuar um plano de auxílio para o que ficou pendente!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 mb-4">
                      {comentarios.map((com) => {
                        const isAuxilio = com.tipo === 'auxilio';
                        const isReconhecimento = com.tipo === 'reconhecimento';

                        return (
                          <div 
                            key={com.id} 
                            className={`p-3.5 rounded-lg border text-xs transition-all ${
                              isAuxilio
                                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                : isReconhecimento
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                                  isAuxilio ? 'bg-amber-700' : isReconhecimento ? 'bg-emerald-700' : 'bg-indigo-700'
                                }`}>
                                  {com.autor.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                                </div>
                                <span className="font-bold text-gray-900">{com.autor}</span>

                                {/* Badge de Tipo de Comentário */}
                                {isAuxilio && (
                                  <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3 text-amber-800" />
                                    Auxílio / Solução
                                  </span>
                                )}
                                {isReconhecimento && (
                                  <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3 text-emerald-800" />
                                    Elogio / Reconhecimento
                                  </span>
                                )}
                                {!isAuxilio && !isReconhecimento && (
                                  <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-blue-800" />
                                    Alinhamento
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-gray-500">
                                {formatBrazilianDate(com.dataHora)}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap leading-relaxed pl-8 font-sans">
                              {com.mensagem}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. Formulário para Adicionar Comentário / Auxílio */}
                  <form onSubmit={(e) => handleEnviarComentario(e, currentPassagem.id)} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 flex items-center gap-1.5 text-xs">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        Novo Comentário ou Auxílio da Liderança
                      </span>
                      {comentarioFeedback && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded animate-pulse">
                          {comentarioFeedback}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Seleção do Líder Autor */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Líder Responsável pelo Comentário:
                        </label>
                        <select
                          value={comentarioAutor}
                          onChange={(e) => setComentarioAutor(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Heder Santos">Heder Santos (Gerente de Vendas)</option>
                          <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
                        </select>
                      </div>

                      {/* Tipo de Apontamento */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Objetivo do Apontamento:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setComentarioTipo('auxilio')}
                            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-all ${
                              comentarioTipo === 'auxilio'
                                ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-500/40'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Lightbulb className="w-3 h-3 text-amber-600" />
                            Auxílio
                          </button>

                          <button
                            type="button"
                            onClick={() => setComentarioTipo('reconhecimento')}
                            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-all ${
                              comentarioTipo === 'reconhecimento'
                                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-1 ring-emerald-500/40'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            Elogio
                          </button>

                          <button
                            type="button"
                            onClick={() => setComentarioTipo('alinhamento')}
                            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 border transition-all ${
                              comentarioTipo === 'alinhamento'
                                ? 'bg-indigo-100 border-indigo-400 text-indigo-900 ring-1 ring-indigo-500/40'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Tag className="w-3 h-3 text-indigo-600" />
                            Geral
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Campo de Texto do Comentário */}
                    <div>
                      <textarea
                        required
                        rows={3}
                        value={comentarioTexto}
                        onChange={(e) => setComentarioTexto(e.target.value)}
                        placeholder={
                          comentarioTipo === 'auxilio'
                            ? "Pontue como você pode auxiliar nesta pendência, sugira um plano de ação ou direcione a resolução..."
                            : comentarioTipo === 'reconhecimento'
                            ? "Deixe um elogio ou reconhecimento pelo que funcionou bem hoje no turno..."
                            : "Escreva suas observações ou alinhamentos operacionais..."
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Botão de Salvar Comentário */}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingComentario || !comentarioTexto.trim()}
                        className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSavingComentario ? 'Salvando...' : 'Salvar Comentário / Auxílio'}</span>
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Rodapé */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
                <button
                  onClick={() => setViewingDetail(null)}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL 2: TABULAÇÃO E JUSTIFICATIVA DE CONCLUSÃO DA PENDÊNCIA */}
      {concludingPassagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 text-gray-800">
            
            {/* Header do Modal */}
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <h3 className="text-base font-bold">Tabulação de Conclusão da Pendência</h3>
              </div>
              <button
                onClick={() => setConcludingPassagem(null)}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo da Pendência Original */}
            <div className="bg-amber-50 p-4 border-b border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                Pendência que ficou para este turno:
              </span>
              <p className="text-amber-950 whitespace-pre-wrap leading-relaxed line-clamp-3 bg-white/70 p-2 rounded border border-amber-200/60">
                {concludingPassagem.oQueFicaPendente}
              </p>
              <div className="mt-2 text-[11px] text-amber-800 flex justify-between">
                <span>Criado por: <strong>{concludingPassagem.supervisor}</strong></span>
                <span>Data: {formatBrazilianDate(concludingPassagem.dataHoraCriacao)}</span>
              </div>
            </div>

            {/* Formulário de Tabulação */}
            <form onSubmit={handleConfirmarConclusao} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    Responsável pela Conclusão / Resolução *
                  </span>
                </label>
                <select
                  value={conclusaoResponsavel}
                  onChange={(e) => setConclusaoResponsavel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] font-medium"
                >
                  <option value="Heder Santos">Heder Santos (Gerente de Vendas)</option>
                  <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    Qual foi a conclusão / solução aplicada? *
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Obrigatório</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={conclusaoObservacao}
                  onChange={(e) => setConclusaoObservacao(e.target.value)}
                  placeholder="Explique detalhadamente como a pendência foi tratada e resolvida (ex: 'Chamado #4892 foi atendido pela TI e a fila de discagem voltou a operar normalmente')..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e]"
                />
              </div>

              <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  A data e hora de conclusão (<strong>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>) serão registradas automaticamente para fins de SLA.
                </span>
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setConcludingPassagem(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingConclusao}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingConclusao ? 'Salvando...' : 'Concluir Pendência & Salvar'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: EDIÇÃO DE REGISTRO COM SENHA */}
      {editingPassagem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 text-gray-800">
            
            {/* Header do Modal */}
            <div className="bg-primary-green text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-200" />
                <h3 className="text-base font-bold">Editar Fechamento de Turno</h3>
              </div>
              <button
                onClick={() => setEditingPassagem(null)}
                className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário de Edição */}
            <form onSubmit={handleSalvarEdicao} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Supervisor Responsável</label>
                <select
                  value={editSupervisor}
                  onChange={(e) => setEditSupervisor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
                >
                  <option value="Heder Santos">Heder Santos (Gerente de Vendas)</option>
                  <option value="Debora Rodrigues">Debora Rodrigues (Supervisora)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">O que funcionou bem hoje</label>
                <textarea
                  rows={3}
                  value={editFuncionou}
                  onChange={(e) => setEditFuncionou(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">O que fica pendente para o próximo turno</label>
                <textarea
                  rows={3}
                  value={editPendente}
                  onChange={(e) => setEditPendente(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
                />
              </div>

              <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-gray-500 font-mono text-[11px]">
                Data de Criação Original: {formatBrazilianDate(editingPassagem.dataHoraCriacao)}
                {editingPassagem.dataHoraConclusao && (
                  <span className="block text-emerald-700 font-semibold mt-0.5">
                    Data de Conclusão: {formatBrazilianDate(editingPassagem.dataHoraConclusao)}
                  </span>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingPassagem(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-primary-green hover:bg-primary-dark text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
});
