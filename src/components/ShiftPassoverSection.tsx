/**
 * @file src/components/ShiftPassoverSection.tsx
 * @description SEÇÃO 4: Fechamento de Turno, Controle de Pendências & Cálculo de SLA de 24h Úteis de Trabalho.
 * Gerencia os registros de passagem de bastão, computa data de criação/conclusão, sinaliza atrasos na jornada
 * e permite exportação estruturada para CSV com autorização segura por senha para edição e exclusão.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Ocorrencia, ResumoPassagem } from '../types';
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
  Search, X, Lock, CheckCircle, ShieldAlert, Sparkles, Filter
} from 'lucide-react';

interface ShiftPassoverSectionProps {
  ocorrencias: Ocorrencia[];
  passagens: ResumoPassagem[];
  onSavePassagem: (passagem: ResumoPassagem) => Promise<DbOperationResult | void>;
  onUpdatePassagem?: (passagem: ResumoPassagem) => Promise<DbOperationResult | void>;
  onUpdateStatusPassagem?: (id: string, status: 'Pendente' | 'Concluído') => Promise<DbOperationResult | void>;
  onDeletePassagem?: (id: string) => Promise<DbOperationResult | void>;
  defaultSupervisor?: string;
}

export const ShiftPassoverSection: React.FC<ShiftPassoverSectionProps> = React.memo(({
  ocorrencias,
  passagens,
  onSavePassagem,
  onUpdatePassagem,
  onUpdateStatusPassagem,
  onDeletePassagem,
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

  // Handler para Salvar Novo Registro de Fechamento
  const handleSalvarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFuncionou = sanitizeTextInput(oQueFuncionou, 3000);
    const cleanPendente = sanitizeTextInput(oQueFicaPendente, 3000);
    const cleanSupervisor = sanitizeTextInput(supervisor, 100);

    if (!cleanFuncionou && !cleanPendente) {
      alert('Por favor, preencha o resumo do que funcionou ou o que fica pendente para o próximo turno.');
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

  // Handler de Conclusão / Reabertura de Pendência
  const handleToggleStatus = useCallback(async (passagem: ResumoPassagem) => {
    if (!onUpdateStatusPassagem) return;

    const isCurrentlyConcluido = passagem.status === 'Concluído' || Boolean(passagem.dataHoraConclusao);
    const newStatus = isCurrentlyConcluido ? 'Pendente' : 'Concluído';

    await onUpdateStatusPassagem(passagem.id, newStatus);
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
                Consolidação diária de passagem de bastão operacional, controle de pendências e acompanhamento de SLA
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
                <option value="Marilia Farias">Marilia Farias (Supervisora)</option>
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
              Controle de Passagem de Bastão & Pendências Salvas
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Acompanhamento de criação, data de conclusão e controle de atraso por jornada de trabalho comercial (Limite: 24h úteis)
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

        {/* Informação da Regra de Jornada Comercial */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-5 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block text-blue-950 font-bold">Regra de Jornada Operacional & SLA de 24h:</strong>
            Horário útil considerado: <strong>Segunda a Sexta das 08:00 às 18:00 (10h/dia)</strong> e <strong>Sábados das 08:00 às 12:00 (4h/dia)</strong>.
            Domingos e períodos fora do expediente não contabilizam horas úteis. Se a pendência ultrapassar <strong>24 horas úteis de trabalho</strong> sem conclusão, o sistema sinaliza <strong>Atraso</strong> automaticamente.
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
              placeholder="Buscar por supervisor, pendência ou o que funcionou..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
            />
          </div>

          <div className="sm:w-56">
            <select
              value={filtroSupervisor}
              onChange={(e) => setFiltroSupervisor(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#005b2e]"
            >
              <option value="">Todos os Supervisores</option>
              <option value="Heder Santos">Heder Santos (Gerente)</option>
              <option value="Debora Rodrigues">Debora Rodrigues</option>
              <option value="Marilia Farias">Marilia Farias</option>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                      <span className="font-bold text-emerald-900 block mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        O que funcionou bem:
                      </span>
                      <p className="text-emerald-950 whitespace-pre-wrap leading-relaxed">
                        {p.oQueFuncionou || 'Nenhum detalhe informado.'}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg border leading-relaxed ${
                      isAtrasado && !isConcluido
                        ? 'bg-red-50 border-red-200 text-red-950 font-medium'
                        : 'bg-amber-50/70 border-amber-100 text-amber-950'
                    }`}>
                      <span className="font-bold block mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          O que ficou para o próximo turno (Pendência):
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">
                          {p.sla.workingHoursFormatted} de jornada
                        </span>
                      </span>
                      <p className="whitespace-pre-wrap font-medium">
                        {p.oQueFicaPendente || 'Nenhuma pendência registrada.'}
                      </p>
                    </div>
                  </div>

                  {/* Barra de Ações: Conclusão, Edição (Senha) e Exclusão (Senha) */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-200/80 gap-2">
                    
                    {/* Status de SLA Informativo */}
                    <div className="text-[11px] font-medium text-gray-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{p.sla.mensagemSla}</span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2">
                      
                      {/* Botão de Conclusão */}
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 ${
                          isConcluido
                            ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                        title={isConcluido ? 'Reabrir esta pendência' : 'Marcar pendência como concluída'}
                      >
                        {isConcluido ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir Pendência</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar como Concluído</span>
                          </>
                        )}
                      </button>

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

      {/* MODAL DE EDIÇÃO DE REGISTRO COM SENHA */}
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
                  <option value="Marilia Farias">Marilia Farias (Supervisora)</option>
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
