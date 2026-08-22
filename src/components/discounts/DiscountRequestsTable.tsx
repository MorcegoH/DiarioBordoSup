/**
 * @file src/components/discounts/DiscountRequestsTable.tsx
 * @description Tabela corporativa de solicitações de desconto com monitoramento de SLA de 4 horas,
 * filtros avançados, visualização de pareceres e gatilhos de aprovação/reprovação gerencial.
 */

import React, { useState, useMemo } from 'react';
import { SolicitacaoDesconto, StatusDesconto } from '../../types';
import { exportarDescontosCSV } from '../../data/discountData';
import { formatarMoedaBRL, formatarPercentual } from '../../utils/finance';
import { 
  ClipboardList, 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Eye, 
  ShieldCheck, 
  Filter,
  DollarSign,
  Car,
  RotateCcw,
  Calendar,
  X,
  User,
  Tag
} from 'lucide-react';

interface DiscountRequestsTableProps {
  solicitacoes: SolicitacaoDesconto[];
  onOpenAprovarModal: (solicitacao: SolicitacaoDesconto) => void;
  onOpenReprovarModal: (solicitacao: SolicitacaoDesconto) => void;
  onResetMockData: () => void;
  onOpenManagerRelease?: () => void;
}

export const DiscountRequestsTable: React.FC<DiscountRequestsTableProps> = React.memo(({
  solicitacoes,
  onOpenAprovarModal,
  onOpenReprovarModal,
  onResetMockData,
  onOpenManagerRelease
}) => {
  // Filtros
  const [statusFiltro, setStatusFiltro] = useState<'TODAS' | StatusDesconto>('TODAS');
  const [supervisoraFiltro, setSupervisoraFiltro] = useState<string>('TODAS');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [dataFiltro, setDataFiltro] = useState<string>('');
  const [busca, setBusca] = useState<string>('');
  
  // Modal de Detalhes/Parecer
  const [detalhesItem, setDetalhesItem] = useState<SolicitacaoDesconto | null>(null);

  // Contagem por status
  const contagens = useMemo(() => {
    let aguardando = 0;
    let aprovados = 0;
    let negados = 0;
    solicitacoes.forEach((item) => {
      if (item.status === 'Aguardando Aprovação') aguardando++;
      else if (item.status === 'Aprovado') aprovados++;
      else if (item.status === 'Negado') negados++;
    });
    return { aguardando, aprovados, negados, total: solicitacoes.length };
  }, [solicitacoes]);

  // Lista filtrada
  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter((item) => {
      // Filtro de Status
      if (statusFiltro !== 'TODAS' && item.status !== statusFiltro) {
        return false;
      }
      // Filtro de Supervisora
      if (supervisoraFiltro !== 'TODAS' && !item.supervisora.includes(supervisoraFiltro)) {
        return false;
      }
      // Filtro de Tipo
      if (tipoFiltro !== 'TODOS' && item.tipoDesconto !== tipoFiltro) {
        return false;
      }
      // Filtro de Data
      if (dataFiltro) {
        const itemData = item.dataHoraSolicitacao ? item.dataHoraSolicitacao.split('T')[0] : '';
        if (itemData !== dataFiltro) {
          return false;
        }
      }
      // Busca por Cliente, Placa ou Consultor
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const bateuCliente = item.cliente.toLowerCase().includes(termo);
        const bateuPlaca = item.placa.toLowerCase().includes(termo);
        const bateuConsultor = item.consultor.toLowerCase().includes(termo);
        return bateuCliente || bateuPlaca || bateuConsultor;
      }
      return true;
    });
  }, [solicitacoes, statusFiltro, supervisoraFiltro, tipoFiltro, dataFiltro, busca]);

  // Função para calcular o tempo de SLA decorrido
  const getSLAInfo = (dataSolicitacaoStr: string, status: StatusDesconto) => {
    if (status !== 'Aguardando Aprovação') {
      return null;
    }

    const agora = Date.now();
    const dataSol = new Date(dataSolicitacaoStr).getTime();
    const decorridoMs = agora - dataSol;
    const slaLimiteMs = 4 * 60 * 60 * 1000; // 4 horas
    const restanteMs = slaLimiteMs - decorridoMs;

    const horasDecorridas = Math.floor(decorridoMs / (1000 * 60 * 60));
    const minutosDecorridos = Math.floor((decorridoMs % (1000 * 60 * 60)) / (1000 * 60));

    if (restanteMs <= 0) {
      return {
        estourado: true,
        critico: true,
        texto: `SLA Estourado (+${horasDecorridas}h ${minutosDecorridos}m)`,
        badgeClass: 'bg-red-100 text-red-800 border-red-300 animate-pulse'
      };
    }

    const horasRestantes = Math.floor(restanteMs / (1000 * 60 * 60));
    const minutosRestantes = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
    const isCritico = horasRestantes < 1; // menos de 1h para estourar

    return {
      estourado: false,
      critico: isCritico,
      texto: `${horasRestantes}h ${minutosRestantes}m restantes`,
      badgeClass: isCritico 
        ? 'bg-amber-100 text-amber-900 border-amber-300' 
        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
    };
  };

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8 relative border-l-4 border-l-[#005b2e]">
      
      {/* Header Banner: Controle de Descontos */}
      <div className="mb-5 p-4 bg-[#005b2e] text-white rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg border border-white/20">
            <Clock className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base tracking-tight">
              Controle de Descontos
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-500/40">
              Prazo de aprovação: 4 horas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => exportarDescontosCSV(solicitacoes)}
            className="px-3 py-1.5 bg-white text-[#005b2e] hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Exportar dados limpos para Excel/CSV com pareceres e carimbos de data/hora"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Relatório (CSV)</span>
          </button>
        </div>
      </div>

      {/* Topo da Tabela: Título e Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-200">
        
        {/* Abas Rápidas de Status */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setStatusFiltro('TODAS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFiltro === 'TODAS'
                ? 'bg-primary-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({contagens.total})
          </button>

          <button
            onClick={() => setStatusFiltro('Aguardando Aprovação')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFiltro === 'Aguardando Aprovação'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Aguardando ({contagens.aguardando})</span>
          </button>

          <button
            onClick={() => setStatusFiltro('Aprovado')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFiltro === 'Aprovado'
                ? 'bg-[#005b2e] text-white'
                : 'bg-emerald-50 text-[#005b2e] hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprovados ({contagens.aprovados})</span>
          </button>

          <button
            onClick={() => setStatusFiltro('Negado')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFiltro === 'Negado'
                ? 'bg-red-700 text-white'
                : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Negados ({contagens.negados})</span>
          </button>
        </div>

        {/* Filtros Dropdown, Data e Busca */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Supervisora / Liderança */}
          <select
            value={supervisoraFiltro}
            onChange={(e) => setSupervisoraFiltro(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium cursor-pointer"
          >
            <option value="TODAS">Liderança: Todas</option>
            <option value="Débora">Débora Rodrigues (Supervisão)</option>
            <option value="Gerência">Gerência (Heder Santos)</option>
          </select>

          {/* Tipo de Desconto */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium"
          >
            <option value="TODOS">Tipo: Todos</option>
            <option value="Adesão">Adesão (R$ 200)</option>
            <option value="Plano">Plano Mensal</option>
          </select>

          {/* Filtro por Data (Apenas Símbolo do Calendário) */}
          <div className="relative inline-flex items-center">
            <div
              className={`p-2 rounded-lg border text-xs transition-all flex items-center justify-center cursor-pointer ${
                dataFiltro 
                  ? 'bg-emerald-50 border-[#005b2e] text-[#005b2e] font-bold shadow-2xs' 
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={dataFiltro ? `Data selecionada: ${dataFiltro.split('-').reverse().join('/')} (Clique para alterar)` : 'Filtrar por data'}
            >
              <Calendar className="w-4 h-4 pointer-events-none" />
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title={dataFiltro ? `Data: ${dataFiltro.split('-').reverse().join('/')}` : 'Filtrar por data'}
              />
            </div>
            {dataFiltro && (
              <button
                type="button"
                onClick={() => setDataFiltro('')}
                className="ml-1 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="Limpar filtro de data"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Busca por texto */}
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, placa ou consultor..."
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-800 w-48 sm:w-56 focus:bg-white focus:ring-1 focus:ring-[#005b2e]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={() => {
              setDataFiltro('');
              setBusca('');
              setStatusFiltro('TODAS');
              setSupervisoraFiltro('TODAS');
              setTipoFiltro('TODOS');
              onResetMockData();
            }}
            title="Restaurar filtros e dados de teste"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. VISUALIZAÇÃO MOBILE (CARDS) - Exibida em telas menores que md (< 768px) */}
      <div id="mobile-discount-cards-container" className="block md:hidden space-y-3">
        {solicitacoesFiltradas.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-xl border border-gray-200 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-600">Nenhuma solicitação encontrada</p>
            <p className="text-xs text-gray-400 mt-1">Tente ajustar os filtros acima para ver outros registros.</p>
          </div>
        ) : (
          solicitacoesFiltradas.map((item) => {
            const sla = getSLAInfo(item.dataHoraSolicitacao, item.status);
            const dataSolicFormatada = new Date(item.dataHoraSolicitacao).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={`card-${item.id}`} 
                id={`discount-card-${item.id}`}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs space-y-3"
              >
                {/* Topo do Card: Data, Placa e Status */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 block">{dataSolicFormatada}</span>
                    <h4 className="font-bold text-gray-900 text-sm leading-tight mt-0.5">{item.cliente}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800">
                      <Car className="w-3 h-3 text-gray-500" /> {item.placa}
                    </span>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.tipoDesconto === 'Adesão' 
                        ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}>
                      {item.tipoDesconto}
                    </span>
                  </div>
                </div>

                {/* Dados da Equipe: Supervisora e Consultor */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Supervisora:</span>
                    <span className="font-bold text-gray-800">{item.supervisora}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Consultor:</span>
                    <span className="font-bold text-gray-800">{item.consultor}</span>
                  </div>
                </div>

                {/* Bloco de Valores Financeiros */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-100">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Valor Cheio: {formatarMoedaBRL(item.valorCheio)}</span>
                    <span className="text-xs font-bold text-[#005b2e]">
                      Desconto: -{formatarMoedaBRL(item.valorDescontoCalculado)} ({formatarPercentual(item.percentualDesconto)})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Valor Final:</span>
                    <span className="text-sm font-extrabold text-gray-900">{formatarMoedaBRL(item.valorFinal)}</span>
                  </div>
                </div>

                {/* Status e SLA */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div>
                    {item.status === 'Aguardando Aprovação' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3" /> Aguardando
                        </span>
                        {sla && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sla.badgeClass}`}>
                            {sla.texto}
                          </span>
                        )}
                      </div>
                    )}

                    {item.status === 'Aprovado' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Aprovado
                      </span>
                    )}

                    {item.status === 'Negado' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-300">
                        <XCircle className="w-3 h-3 text-red-700" /> Negado
                      </span>
                    )}
                  </div>

                  {/* Ações Mobile (com área touch mínima de 44px) */}
                  <div className="flex items-center gap-2">
                    {item.status === 'Aguardando Aprovação' ? (
                      <>
                        <button
                          id={`btn-aprovar-mobile-${item.id}`}
                          onClick={() => onOpenAprovarModal(item)}
                          className="min-h-[44px] px-3 py-2 bg-primary-green hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer touch-manipulation"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Aprovar</span>
                        </button>
                        <button
                          id={`btn-reprovar-mobile-${item.id}`}
                          onClick={() => onOpenReprovarModal(item)}
                          className="min-h-[44px] px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer touch-manipulation"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Recusar</span>
                        </button>
                      </>
                    ) : (
                      <button
                        id={`btn-parecer-mobile-${item.id}`}
                        onClick={() => setDetalhesItem(item)}
                        className="min-h-[44px] px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg border border-gray-300 flex items-center gap-1.5 cursor-pointer touch-manipulation"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span>Ver Parecer</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 2. VISUALIZAÇÃO DESKTOP (TABELA) - Exibida em telas médias e grandes (>= 768px) */}
      <div id="desktop-discount-table-container" className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-3.5 py-3">Data / Hora</th>
              <th scope="col" className="px-3.5 py-3">Cliente & Placa</th>
              <th scope="col" className="px-3.5 py-3">Supervisora / Consultor</th>
              <th scope="col" className="px-3.5 py-3">Tipo & Valores</th>
              <th scope="col" className="px-3.5 py-3">Desconto Efetivo</th>
              <th scope="col" className="px-3.5 py-3">Status / SLA</th>
              <th scope="col" className="px-3.5 py-3 text-right">Ações Gerenciais</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 bg-white">
            {solicitacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  Nenhuma solicitação de desconto encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : (
              solicitacoesFiltradas.map((item) => {
                const sla = getSLAInfo(item.dataHoraSolicitacao, item.status);
                const dataSolicFormatada = new Date(item.dataHoraSolicitacao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={item.id} id={`row-desconto-${item.id}`} className="hover:bg-emerald-50/30 transition-colors">
                    
                    {/* Data / Hora */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap text-gray-600">
                      <span className="font-semibold text-gray-800 block">{dataSolicFormatada}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{item.id.slice(0, 14)}</span>
                    </td>

                    {/* Cliente & Placa */}
                    <td className="px-3.5 py-3.5">
                      <div className="font-bold text-gray-900 max-w-[200px] truncate" title={item.cliente}>
                        {item.cliente}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-gray-100 border border-gray-300 text-gray-800">
                          <Car className="w-3 h-3 text-gray-500" /> {item.placa}
                        </span>
                      </div>
                    </td>

                    {/* Supervisora / Consultor */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-800">{item.supervisora}</span>
                        {item.tipoRegistro === 'LiberacaoGerencial' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-[#005b2e] border border-emerald-300">
                            Gerência
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 block">Consultor: <strong>{item.consultor}</strong></span>
                    </td>

                    {/* Tipo & Valores */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                        item.tipoDesconto === 'Adesão' 
                          ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}>
                        {item.tipoDesconto}
                      </span>
                      <div className="text-[11px] text-gray-600">
                        Cheio: {formatarMoedaBRL(item.valorCheio)}
                      </div>
                    </td>

                    {/* Desconto Efetivo */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-sm text-[#005b2e] block">
                        - {formatarMoedaBRL(item.valorDescontoCalculado)}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {formatarPercentual(item.percentualDesconto)} • Final: <strong>{formatarMoedaBRL(item.valorFinal)}</strong>
                      </span>
                    </td>

                    {/* Status & SLA */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      {item.status === 'Aguardando Aprovação' && (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3" /> Aguardando
                          </span>
                          {sla && (
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${sla.badgeClass}`}>
                              SLA: {sla.texto}
                            </div>
                          )}
                        </div>
                      )}

                      {item.status === 'Aprovado' && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Aprovado
                          </span>
                          {item.dataHoraAprovacao && (
                            <span className="text-[10px] text-gray-400 block">
                              {new Date(item.dataHoraAprovacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}

                      {item.status === 'Negado' && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-300">
                            <XCircle className="w-3 h-3 text-red-700" /> Negado
                          </span>
                          {item.dataHoraAprovacao && (
                            <span className="text-[10px] text-gray-400 block">
                              {new Date(item.dataHoraAprovacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Ações Gerenciais */}
                    <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                      {item.status === 'Aguardando Aprovação' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-aprovar-desktop-${item.id}`}
                            onClick={() => onOpenAprovarModal(item)}
                            className="px-2.5 py-1.5 bg-primary-green hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Aprovar com Senha de Segurança e Parecer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Aprovar</span>
                          </button>

                          <button
                            id={`btn-reprovar-desktop-${item.id}`}
                            onClick={() => onOpenReprovarModal(item)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Reprovar com Parecer Obrigatório"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reprovar</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`btn-parecer-desktop-${item.id}`}
                          onClick={() => setDetalhesItem(item)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg border border-gray-300 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          <span>Ver Parecer</span>
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes do Parecer / Auditoria */}
      {detalhesItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary-green" />
                Histórico & Parecer do Gerente
              </h4>
              <button
                onClick={() => setDetalhesItem(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <div><strong>Cliente:</strong> {detalhesItem.cliente}</div>
                <div><strong>Placa:</strong> {detalhesItem.placa} ({detalhesItem.tipoDesconto})</div>
                <div><strong>Supervisora / Consultor:</strong> {detalhesItem.supervisora} • {detalhesItem.consultor}</div>
                <div>
                  <strong>Desconto:</strong> R$ {detalhesItem.valorDescontoCalculado.toFixed(2).replace('.', ',')} ({detalhesItem.percentualDesconto.toFixed(1)}%) • Final: R$ {detalhesItem.valorFinal.toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-medium block mb-0.5">Justificativa da Solicitação:</span>
                <p className="p-2.5 bg-amber-50 rounded border border-amber-200 italic text-gray-700">
                  "{detalhesItem.justificativa}"
                </p>
              </div>

              <div>
                <span className="text-gray-500 font-medium block mb-0.5">
                  Parecer do Aprovador ({detalhesItem.aprovador || 'Gerência'}):
                </span>
                <p className={`p-2.5 rounded border font-medium ${
                  detalhesItem.status === 'Aprovado' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-red-50 text-red-900 border-red-300'
                }`}>
                  {detalhesItem.parecer || 'Nenhum parecer formal registrado.'}
                </p>
              </div>

              {detalhesItem.dataHoraAprovacao && (
                <div className="text-[11px] text-gray-400 pt-1 text-right">
                  Decisão tomada em: {new Date(detalhesItem.dataHoraAprovacao).toLocaleString('pt-BR')}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setDetalhesItem(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
