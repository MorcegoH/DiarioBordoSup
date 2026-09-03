/**
 * @file src/components/inspections/InspectionRequestsTable.tsx
 * @description Tabela analítica e de controle operacional para Solicitações de Vistoria,
 * com métricas agregadas de adesão, filtros dinâmicos, ações rápidas de mapas/links e decisões.
 * Otimizado para navegação mobile com cards operacionais e touch targets de 44px+.
 */

import React, { useState, useMemo } from 'react';
import { SolicitacaoVistoria, Vistoriador, StatusVistoria } from '../../types';
import { sanitizeSafeUrl, getSafeWhatsAppUrl, getSafePhoneCallUrl } from '../../utils/security';
import {
  Search,
  Filter,
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
  Eye,
  Trash2,
  Check,
  RotateCcw,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  Layers,
  Navigation
} from 'lucide-react';

interface InspectionRequestsTableProps {
  vistorias: SolicitacaoVistoria[];
  onOpenAprovar: (item: SolicitacaoVistoria) => void;
  onOpenReprovar: (item: SolicitacaoVistoria) => void;
  onOpenDetalhes: (item: SolicitacaoVistoria) => void;
  onOpenDelete: (item: SolicitacaoVistoria) => void;
  onToggleAdesao: (id: string, paga: boolean) => void;
}

export const InspectionRequestsTable: React.FC<InspectionRequestsTableProps> = React.memo(({
  vistorias,
  onOpenAprovar,
  onOpenReprovar,
  onOpenDetalhes,
  onOpenDelete,
  onToggleAdesao
}) => {
  // Estados de Filtros
  const [busca, setBusca] = useState<string>('');
  const [filtroVistoriador, setFiltroVistoriador] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroAdesao, setFiltroAdesao] = useState<string>('todos');
  const [filtroData, setFiltroData] = useState<string>('');

  // Métricas Agregadas
  const metricas = useMemo(() => {
    let total = vistorias.length;
    let pendentes = 0;
    let aprovadas = 0;
    let reprovadas = 0;
    let valorTotalAdesao = 0;
    let valorAdesaoPaga = 0;
    let valorAdesaoAReceber = 0;
    let countDanilo = 0;
    let countLucas = 0;

    vistorias.forEach((v) => {
      if (v.status === 'Aguardando Vistoria') pendentes++;
      if (v.status === 'Aprovado') aprovadas++;
      if (v.status === 'Reprovado') reprovadas++;

      const val = Number(v.valorAdesao) || 0;
      valorTotalAdesao += val;
      if (v.adesaoPaga) {
        valorAdesaoPaga += val;
      } else {
        valorAdesaoAReceber += val;
      }

      if (v.vistoriador === 'Danilo') countDanilo++;
      if (v.vistoriador === 'Lucas') countLucas++;
    });

    return {
      total,
      pendentes,
      aprovadas,
      reprovadas,
      valorTotalAdesao,
      valorAdesaoPaga,
      valorAdesaoAReceber,
      countDanilo,
      countLucas
    };
  }, [vistorias]);

  // Lista Filtrada
  const vistoriasFiltradas = useMemo(() => {
    return vistorias.filter((item) => {
      // 1. Busca textual
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchNome = item.nomeAssociado?.toLowerCase().includes(termo);
        const matchPlaca = item.placa?.toLowerCase().includes(termo);
        const matchModelo = item.modeloCarro?.toLowerCase().includes(termo);
        const matchContato = item.contato?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));
        if (!matchNome && !matchPlaca && !matchModelo && !matchContato) return false;
      }

      // 2. Filtro de Vistoriador
      if (filtroVistoriador !== 'todos' && item.vistoriador !== filtroVistoriador) {
        return false;
      }

      // 3. Filtro de Status
      if (filtroStatus !== 'todos' && item.status !== filtroStatus) {
        return false;
      }

      // 4. Filtro de Adesão
      if (filtroAdesao === 'paga' && !item.adesaoPaga) return false;
      if (filtroAdesao === 'a_receber' && item.adesaoPaga) return false;

      // 5. Filtro de Data
      if (filtroData && item.dataVistoria !== filtroData) {
        return false;
      }

      return true;
    });
  }, [vistorias, busca, filtroVistoriador, filtroStatus, filtroAdesao, filtroData]);

  return (
    <div className="space-y-4">
      
      {/* 1. CARDS DE INDICADORES / METRICAS OPERACIONAIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Total Vistorias</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-900 mt-1">{metricas.total}</p>
          <div className="text-[10px] text-gray-500 mt-0.5 flex gap-2">
            <span>Danilo: <strong>{metricas.countDanilo}</strong></span>
            <span>Lucas: <strong>{metricas.countLucas}</strong></span>
          </div>
        </div>

        {/* Aguardando Vistoria */}
        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
            <span>Aguardando</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-950 mt-1">{metricas.pendentes}</p>
          <span className="text-[10px] text-amber-800">Em fila para visita</span>
        </div>

        {/* Aprovadas */}
        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span>Aprovadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-950 mt-1">{metricas.aprovadas}</p>
          <span className="text-[10px] text-emerald-800">Laudos aprovados</span>
        </div>

        {/* Reprovadas */}
        <div className="bg-red-50/70 p-3.5 rounded-xl border border-red-200 shadow-2xs">
          <div className="flex items-center justify-between text-red-800 text-xs font-bold">
            <span>Reprovadas</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xl font-bold text-red-950 mt-1">{metricas.reprovadas}</p>
          <span className="text-[10px] text-red-800">Não conformidades</span>
        </div>

        {/* Adesão Paga */}
        <div className="bg-emerald-900 text-white p-3.5 rounded-xl border border-emerald-800 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-200 text-xs font-bold">
            <span>Adesão Paga</span>
            <DollarSign className="w-4 h-4 text-emerald-300" />
          </div>
          <p className="text-base sm:text-lg font-bold text-white mt-1">
            R$ {metricas.valorAdesaoPaga.toFixed(2).replace('.', ',')}
          </p>
          <span className="text-[10px] text-emerald-200/90">Confirmado em conta</span>
        </div>

        {/* Adesão a Receber */}
        <div className="bg-amber-950 text-amber-100 p-3.5 rounded-xl border border-amber-800 shadow-2xs">
          <div className="flex items-center justify-between text-amber-200 text-xs font-bold">
            <span>Adesão a Receber</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-base sm:text-lg font-bold text-white mt-1">
            R$ {metricas.valorAdesaoAReceber.toFixed(2).replace('.', ',')}
          </p>
          <span className="text-[10px] text-amber-200/90">A receber em campo</span>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS E BUSCA */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Campo de Busca */}
          <div className="relative flex-grow">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por associado, placa, modelo do carro ou telefone..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtros em Grade / Linha */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            
            {/* Vistoriador */}
            <select
              value={filtroVistoriador}
              onChange={(e) => setFiltroVistoriador(e.target.value)}
              className="px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-gray-700"
            >
              <option value="todos">Vistoriador: Todos</option>
              <option value="Danilo">Danilo</option>
              <option value="Lucas">Lucas</option>
            </select>

            {/* Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-gray-700"
            >
              <option value="todos">Status: Todos</option>
              <option value="Aguardando Vistoria">Aguardando Vistoria</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Reprovado">Reprovado</option>
            </select>

            {/* Adesão */}
            <select
              value={filtroAdesao}
              onChange={(e) => setFiltroAdesao(e.target.value)}
              className="px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-gray-700"
            >
              <option value="todos">Adesão: Todas</option>
              <option value="paga">Adesão: Paga</option>
              <option value="a_receber">Adesão: A Receber</option>
            </select>

            {/* Data */}
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium text-gray-700"
              title="Filtrar por data específica da vistoria"
            />
          </div>
        </div>

        {/* Indicador de Filtros Ativos */}
        {(busca || filtroVistoriador !== 'todos' || filtroStatus !== 'todos' || filtroAdesao !== 'todos' || filtroData) && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>
              Exibindo <strong>{vistoriasFiltradas.length}</strong> de <strong>{vistorias.length}</strong> registros
            </span>
            <button
              onClick={() => {
                setBusca('');
                setFiltroVistoriador('todos');
                setFiltroStatus('todos');
                setFiltroAdesao('todos');
                setFiltroData('');
              }}
              className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Redefinir Filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. VISUALIZAÇÃO MOBILE: CARDS OPERACIONAIS DE ALTO DESEMPENHO (< md) */}
      <div id="mobile-inspections-container" className="block md:hidden space-y-3.5">
        {vistoriasFiltradas.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-400 space-y-2">
            <Car className="w-10 h-10 mx-auto text-gray-300" />
            <h4 className="font-bold text-gray-700 text-sm">Nenhuma vistoria encontrada</h4>
            <p className="text-xs text-gray-400">Ajuste os filtros de busca para visualizar outros registros.</p>
          </div>
        ) : (
          vistoriasFiltradas.map((item) => {
            const mapsUrl = sanitizeSafeUrl(item.localizacaoMaps);
            const laudoUrl = sanitizeSafeUrl(item.linkVistoria);
            const faturaUrl = sanitizeSafeUrl(item.linkPagamento);
            const whatsAppUrl = getSafeWhatsAppUrl(item.contato, `Olá ${item.nomeAssociado}, sou da equipe de vistorias sobre o veículo ${item.modeloCarro} (${item.placa}).`);
            const phoneCallUrl = getSafePhoneCallUrl(item.contato);

            return (
              <div
                key={`mob-${item.id}`}
                id={`card-vistoria-${item.id}`}
                className={`bg-white rounded-2xl p-4 border shadow-xs space-y-3.5 transition-all ${
                  item.status === 'Aguardando Vistoria'
                    ? 'border-amber-200 bg-amber-50/10'
                    : item.status === 'Aprovado'
                    ? 'border-emerald-200'
                    : 'border-red-200'
                }`}
              >
                {/* Cabeçalho do Card: Data/Horário, Vistoriador e Status */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{item.dataVistoria}</span>
                      <span className="text-gray-400">•</span>
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{item.horarioVistoria}</span>
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                        <User className="w-3 h-3 text-emerald-700" />
                        <span>Vistoriador: {item.vistoriador}</span>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                      item.status === 'Aprovado'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : item.status === 'Reprovado'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {item.status === 'Aprovado' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {item.status === 'Reprovado' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                    {item.status === 'Aguardando Vistoria' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                    <span>{item.status}</span>
                  </span>
                </div>

                {/* Dados do Associado & Contato Rápido (WhatsApp / Ligação) */}
                <div className="flex items-center justify-between gap-2 bg-gray-50/90 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium block">Associado</span>
                    <h4 className="font-bold text-gray-900 text-sm">{item.nomeAssociado}</h4>
                    <span className="font-mono text-xs text-gray-600 font-semibold">{item.contato}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {whatsAppUrl && (
                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] min-w-[44px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 touch-manipulation"
                        title="Abrir conversa no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Whats</span>
                      </a>
                    )}
                    {phoneCallUrl && (
                      <a
                        href={phoneCallUrl}
                        className="min-h-[44px] min-w-[44px] p-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center shadow-xs transition-all active:scale-95 touch-manipulation"
                        title="Ligar para o associado"
                      >
                        <Phone className="w-4 h-4 text-gray-700" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Dados do Veículo & Placa */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50/30 rounded-xl border border-emerald-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 font-medium block">Veículo / Modelo</span>
                    <span className="font-bold text-gray-900 text-xs">{item.modeloCarro}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-gray-100 border border-gray-300 text-gray-900 block">
                      {item.placa}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 block mt-0.5">
                      {item.tipoPlaca || 'Padrão'}
                    </span>
                  </div>
                </div>

                {/* Adesão & Alternância de Status Financeiro */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium block">Valor da Adesão</span>
                    <span className="text-base font-extrabold text-gray-900">
                      R$ {Number(item.valorAdesao || 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleAdesao(item.id, !item.adesaoPaga)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 shadow-2xs ${
                      item.adesaoPaga
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                    title="Toque para alternar o status do pagamento da taxa de adesão"
                  >
                    {item.adesaoPaga ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Adesão Paga</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 text-amber-700" />
                        <span>A Receber</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Botões de Acesso Rápido a Links Externos (Google Maps, Laudo, Fatura) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] p-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl border border-blue-200 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>GPS / Maps</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="min-h-[44px] p-2 bg-gray-100 text-gray-400 rounded-xl border border-gray-200 text-xs font-medium flex items-center justify-center gap-1 opacity-60"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>Sem GPS</span>
                    </button>
                  )}

                  {laudoUrl ? (
                    <a
                      href={laudoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation"
                    >
                      <Car className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Laudo</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="min-h-[44px] p-2 bg-gray-100 text-gray-400 rounded-xl border border-gray-200 text-xs font-medium flex items-center justify-center gap-1 opacity-60"
                    >
                      <Car className="w-3.5 h-3.5 text-gray-400" />
                      <span>Sem Laudo</span>
                    </button>
                  )}

                  {faturaUrl ? (
                    <a
                      href={faturaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Fatura</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="min-h-[44px] p-2 bg-gray-100 text-gray-400 rounded-xl border border-gray-200 text-xs font-medium flex items-center justify-center gap-1 opacity-60"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      <span>Sem Fatura</span>
                    </button>
                  )}
                </div>

                {/* Ações Gerenciais e Decisões em Grade Touch */}
                <div className="border-t border-gray-100 pt-3">
                  {item.status === 'Aguardando Vistoria' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenAprovar(item)}
                        className="min-h-[44px] px-3 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprovar Vistoria</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenReprovar(item)}
                        className="min-h-[44px] px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reprovar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDetalhes(item)}
                        className="min-h-[44px] px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 transition-all active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                        <span>Ver Ficha Completa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDelete(item)}
                        className="min-h-[44px] px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-red-200 transition-all active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetalhes(item)}
                        className="min-h-[44px] flex-grow px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 transition-all active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                        <span>Visualizar Laudo e Parecer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDelete(item)}
                        className="min-h-[44px] min-w-[44px] p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 flex items-center justify-center transition-all active:scale-95 touch-manipulation cursor-pointer"
                        title="Excluir Vistoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 4. VISUALIZAÇÃO DESKTOP: TABELA ANALÍTICA DE ALTA DENSIDADE (>= md) */}
      <div id="desktop-inspections-container" className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {vistoriasFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-sm">Nenhuma solicitação de vistoria encontrada</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Tente ajustar os termos de busca ou filtros aplicados acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 border-collapse">
              <thead>
                <tr className="bg-[#005b2e] text-white font-bold uppercase tracking-wider text-[11px] border-b border-emerald-800">
                  <th scope="col" className="px-3.5 py-3">Agendamento</th>
                  <th scope="col" className="px-3.5 py-3">Vistoriador</th>
                  <th scope="col" className="px-3.5 py-3">Associado & Contato</th>
                  <th scope="col" className="px-3.5 py-3">Veículo & Placa</th>
                  <th scope="col" className="px-3.5 py-3">Adesão (R$)</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Local & Hiperlinks</th>
                  <th scope="col" className="px-3.5 py-3 text-center">Status</th>
                  <th scope="col" className="px-3.5 py-3 text-right">Ações & Decisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/80">
                {vistoriasFiltradas.map((item) => {
                  const mapsUrl = sanitizeSafeUrl(item.localizacaoMaps);
                  const laudoUrl = sanitizeSafeUrl(item.linkVistoria);
                  const faturaUrl = sanitizeSafeUrl(item.linkPagamento);
                  const whatsAppUrl = getSafeWhatsAppUrl(item.contato);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-emerald-50/40 transition-colors ${
                        item.status === 'Aguardando Vistoria' ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* 1. Agendamento */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{item.dataVistoria}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{item.horarioVistoria}</span>
                        </div>
                      </td>

                      {/* 2. Vistoriador */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          <User className="w-3 h-3 text-emerald-700" />
                          <span>{item.vistoriador}</span>
                        </span>
                      </td>

                      {/* 3. Associado e Contato */}
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-gray-900 text-sm">
                          {item.nomeAssociado}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-gray-600">{item.contato}</span>
                          {whatsAppUrl && (
                            <a
                              href={whatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 4. Veículo e Placa */}
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-gray-900">
                          {item.modeloCarro}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-900">
                            {item.placa}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700">
                            {item.tipoPlaca || 'Placa'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Adesão R$ */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-bold text-gray-900">
                          R$ {Number(item.valorAdesao || 0).toFixed(2).replace('.', ',')}
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleAdesao(item.id, !item.adesaoPaga)}
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            item.adesaoPaga
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                          }`}
                          title="Clique para alternar status do pagamento da taxa de adesão"
                        >
                          {item.adesaoPaga ? (
                            <>
                              <Check className="w-2.5 h-2.5" />
                              <span>Paga</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-2.5 h-2.5" />
                              <span>A Receber</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* 6. Local & Hiperlinks */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Maps */}
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-200 transition-colors"
                              title="Abrir Localização no Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="p-1.5 text-gray-300">
                              <MapPin className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {/* Link Vistoria */}
                          {laudoUrl ? (
                            <a
                              href={laudoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-white rounded-lg border border-emerald-200 transition-colors"
                              title="Acessar Laudo de Vistoria Externa"
                            >
                              <Car className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="p-1.5 text-gray-300">
                              <Car className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {/* Link Pagamento */}
                          {faturaUrl ? (
                            <a
                              href={faturaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-700 hover:text-white rounded-lg border border-indigo-200 transition-colors"
                              title="Acessar Fatura / Link de Pagamento"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="p-1.5 text-gray-300">
                              <CreditCard className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            item.status === 'Aprovado'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.status === 'Reprovado'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {item.status === 'Aprovado' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {item.status === 'Reprovado' && <XCircle className="w-3 h-3 text-red-600" />}
                          {item.status === 'Aguardando Vistoria' && <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* 8. Ações & Decisão */}
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Botão de Ver Ficha Completa */}
                          <button
                            type="button"
                            onClick={() => onOpenDetalhes(item)}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Ver detalhes completos da vistoria"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Botões de Decisão (Aprovar / Reprovar) para Vistorias Pendentes */}
                          {item.status === 'Aguardando Vistoria' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenAprovar(item)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Emitir parecer técnico e aprovar vistoria"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenReprovar(item)}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Reprovar vistoria com justificativa"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reprovar</span>
                              </button>
                            </>
                          )}

                          {/* Excluir Registro */}
                          <button
                            type="button"
                            onClick={() => onOpenDelete(item)}
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir registro de vistoria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});
