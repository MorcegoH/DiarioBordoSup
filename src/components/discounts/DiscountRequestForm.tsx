/**
 * @file src/components/discounts/DiscountRequestForm.tsx
 * @description Formulário de solicitação de desconto com regras de negócio rígidas,
 * cálculo financeiro em tempo real, validação de placa por Regex e trava de orçamento.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { SolicitacaoDesconto, TipoDesconto, BudgetState } from '../../types';
import { HIERARQUIA_EQUIPES, BUDGET_LIMITS, OPCOES_VALOR_ADESAO, validarPlacaVeiculo } from '../../data/discountData';
import { sanitizeTextInput } from '../../utils/security';
import { 
  calcularDescontoAdesao, 
  calcularDescontoPlano, 
  formatarMoedaBRL, 
  formatarPercentual 
} from '../../utils/finance';
import { 
  FileCheck, 
  User, 
  Users, 
  Car, 
  Percent, 
  DollarSign, 
  AlertOctagon, 
  CheckCircle2, 
  Info, 
  Send,
  Lock,
  Calculator,
  AlertTriangle,
  CalendarDays,
  Loader2
} from 'lucide-react';

interface DiscountRequestFormProps {
  budget: BudgetState;
  onAddSolicitacao: (solicitacao: SolicitacaoDesconto) => void;
}

export const DiscountRequestForm: React.FC<DiscountRequestFormProps> = React.memo(({
  budget,
  onAddSolicitacao
}) => {
  // Estados do Formulário
  const [cliente, setCliente] = useState<string>('');
  const [supervisora, setSupervisora] = useState<'Débora Rodrigues'>('Débora Rodrigues');
  const [consultor, setConsultor] = useState<string>('');
  const [placaInput, setPlacaInput] = useState<string>('');
  const [tipoDesconto, setTipoDesconto] = useState<TipoDesconto>('Adesão');
  
  // Valores financeiros
  // Valor cheio de adesão inicia em R$ 200,00, com opções oficiais de R$ 160,00 e R$ 100,00
  const [valorCheioAdesao, setValorCheioAdesao] = useState<string>('200.00');
  const [valorCheioPlano, setValorCheioPlano] = useState<string>('150.00');
  const [descontoValorAdesao, setDescontoValorAdesao] = useState<string>('30.00'); // Em R$
  const [descontoPercentualPlano, setDescontoPercentualPlano] = useState<string>('15'); // Em %
  const [justificativa, setJustificativa] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Lista de consultores baseada na supervisora selecionada (Equipe Unificada)
  const listaConsultores = useMemo(() => {
    return HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'] || [];
  }, []);

  // Atualizar consultor padrão ao inicializar
  useEffect(() => {
    if (listaConsultores.length > 0 && !consultor) {
      setConsultor(listaConsultores[0]);
    }
  }, [listaConsultores, consultor]);

  // Validação da Placa
  const validacaoPlaca = useMemo(() => {
    return validarPlacaVeiculo(placaInput);
  }, [placaInput]);

  // Formatação em tempo real da placa
  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
    setPlacaInput(raw);
  };

  // Cálculos Financeiros em Tempo Real
  const calculosFinanceiros = useMemo(() => {
    if (tipoDesconto === 'Adesão') {
      return calcularDescontoAdesao(descontoValorAdesao, valorCheioAdesao);
    } else {
      return calcularDescontoPlano(valorCheioPlano, descontoPercentualPlano);
    }
  }, [tipoDesconto, valorCheioPlano, valorCheioAdesao, descontoValorAdesao, descontoPercentualPlano]);

  // Validação de Trava de Orçamento da Supervisora Débora (Unificada)
  const saldoSupervisoraAtual = useMemo(() => {
    return budget.debora.saldoDisponivel;
  }, [budget]);

  const saldoInsuficiente = useMemo(() => {
    if (saldoSupervisoraAtual <= 0) return true;
    if (calculosFinanceiros.valorDescontoCalculado > saldoSupervisoraAtual) return true;
    return false;
  }, [saldoSupervisoraAtual, calculosFinanceiros.valorDescontoCalculado]);

  // Estado de validação visual de erros em campos obrigatórios
  const [errosObrigatorios, setErrosObrigatorios] = useState<{
    cliente?: string;
    placa?: string;
    consultor?: string;
    desconto?: string;
    justificativa?: string;
  }>({});

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCliente = sanitizeTextInput(cliente, 150);
    const cleanJustificativa = sanitizeTextInput(justificativa, 1000);

    const novosErros: {
      cliente?: string;
      placa?: string;
      consultor?: string;
      desconto?: string;
      justificativa?: string;
    } = {};

    if (!cleanCliente.trim()) {
      novosErros.cliente = 'Campo obrigatório: Informe o Nome/Razão Social do Cliente.';
    }

    if (!placaInput.trim()) {
      novosErros.placa = 'Campo obrigatório: Informe a Placa do Veículo.';
    } else if (!validacaoPlaca.valida) {
      novosErros.placa = 'Placa inválida. Digite no padrão Mercosul (ABC1D23) ou Tradicional (ABC-1234).';
    }

    if (!consultor.trim()) {
      novosErros.consultor = 'Campo obrigatório: Selecione o Consultor de Vendas responsável.';
    }

    if (calculosFinanceiros.valorDescontoCalculado <= 0) {
      novosErros.desconto = 'Campo obrigatório: Informe um valor ou percentual de desconto maior que zero.';
    }

    if (!cleanJustificativa.trim()) {
      novosErros.justificativa = 'Campo obrigatório: Descreva a Justificativa Comercial detalhada para auditoria.';
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosObrigatorios(novosErros);
      return;
    }

    setErrosObrigatorios({});

    if (calculosFinanceiros.excedeTeto) {
      return;
    }

    if (saldoInsuficiente) {
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const novaSolicitacao: SolicitacaoDesconto = {
        id: `desc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
        dataHoraSolicitacao: new Date().toISOString(),
        cliente: cleanCliente,
        supervisora,
        consultor,
        placa: validacaoPlaca.formatada,
        tipoDesconto,
        valorCheio: calculosFinanceiros.valorCheio,
        descontoInput: calculosFinanceiros.descontoInput,
        valorDescontoCalculado: calculosFinanceiros.valorDescontoCalculado,
        percentualDesconto: calculosFinanceiros.percentualDesconto,
        valorFinal: calculosFinanceiros.valorFinal,
        justificativa: cleanJustificativa,
        status: 'Aguardando Aprovação'
      };

      await onAddSolicitacao(novaSolicitacao);

      // Feedback visual
      setFeedbackSucesso(`Solicitação enviada com sucesso! Encaminhada para a fila de aprovação do Gerente Heder Santos (SLA: 4 horas).`);
      
      // Limpar campos
      setCliente('');
      setPlacaInput('');
      setJustificativa('');
      setErrosObrigatorios({});
      if (tipoDesconto === 'Adesão') {
        setValorCheioAdesao('200.00');
        setDescontoValorAdesao('30.00');
      } else {
        setDescontoPercentualPlano('10');
      }

      setTimeout(() => {
        setFeedbackSucesso(null);
      }, 6000);
    } catch (err) {
      console.error('[DiscountRequestForm] Erro ao enviar solicitação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8 relative border-l-4 border-l-[#005b2e]">
      {/* Cabeçalho Limpo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-emerald-50 rounded-lg text-primary-green">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>Nova Solicitação de Desconto</span>
              {budget.ciclo && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                  {budget.ciclo.mesExtenso}
                </span>
              )}
            </h2>
          </div>
        </div>

        {feedbackSucesso && (
          <div className="flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
            <span>{feedbackSucesso}</span>
          </div>
        )}
      </div>

      {/* Trava de Orçamento Esgotado */}
      {saldoSupervisoraAtual <= 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-900 text-xs">
          <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Orçamento Mensal Esgotado:</span> Novos pedidos para a supervisora {supervisora} estão bloqueados até o próximo ciclo ou liberação da reserva de contingência pelo Gerente.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Banner de Erros */}
        {Object.keys(errosObrigatorios).length > 0 && (
          <div className="p-3 bg-red-50 border-l-3 border-red-500 rounded-r-lg text-red-900 text-xs">
            <span className="font-bold block mb-1">Preencha os campos obrigatórios:</span>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.values(errosObrigatorios).map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Linha 1: Cliente e Placa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => {
                setCliente(e.target.value);
                if (errosObrigatorios.cliente) setErrosObrigatorios((prev) => ({ ...prev, cliente: undefined }));
              }}
              placeholder="Nome do cliente ou razão social"
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                errosObrigatorios.cliente
                  ? 'bg-red-50/50 border-red-400 focus:ring-1 focus:ring-red-500 text-gray-900'
                  : 'bg-white border-gray-200 hover:border-gray-300 focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] text-gray-800'
              }`}
            />
            {errosObrigatorios.cliente && (
              <p className="text-[11px] text-red-600 mt-1">{errosObrigatorios.cliente}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">
                Placa <span className="text-red-500">*</span>
              </label>
              {placaInput && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  validacaoPlaca.valida 
                    ? 'bg-emerald-50 text-emerald-800' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {validacaoPlaca.valida ? validacaoPlaca.formato : 'Incompleta'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={8}
                value={placaInput}
                onChange={(e) => {
                  handlePlacaChange(e);
                  if (errosObrigatorios.placa) setErrosObrigatorios((prev) => ({ ...prev, placa: undefined }));
                }}
                placeholder="ABC1D23 ou ABC-1234"
                className={`w-full px-3 py-2 text-sm font-mono uppercase tracking-wider rounded-lg border transition-colors ${
                  errosObrigatorios.placa
                    ? 'bg-red-50/50 border-red-400 text-red-900 focus:ring-1 focus:ring-red-500'
                    : validacaoPlaca.valida
                    ? 'bg-white border-emerald-500 text-gray-900 focus:ring-1 focus:ring-[#005b2e]'
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-800 focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e]'
                }`}
              />
              {validacaoPlaca.valida && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-2.5 pointer-events-none" />
              )}
            </div>
            {errosObrigatorios.placa && (
              <p className="text-[11px] text-red-600 mt-1">{errosObrigatorios.placa}</p>
            )}
          </div>
        </div>

        {/* Linha 2: Supervisora e Consultor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Supervisora
            </label>
            <select
              value={supervisora}
              onChange={(e) => setSupervisora(e.target.value as 'Débora Rodrigues')}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 font-medium focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
            >
              <option value="Débora Rodrigues">
                Débora Rodrigues — Saldo: R$ {saldoSupervisoraAtual.toFixed(2).replace('.', ',')}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Consultor de Vendas
            </label>
            <select
              value={consultor}
              onChange={(e) => setConsultor(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 font-medium focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] cursor-pointer"
            >
              {listaConsultores.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 3: Tipo de Desconto a Solicitar (Estilo Cards com Radio Button) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Tipo de Desconto a Solicitar <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opção 1: Adesão */}
            <label
              className={`flex items-start p-3.5 rounded-lg border transition-all cursor-pointer ${
                tipoDesconto === 'Adesão'
                  ? 'border-[#005b2e] bg-emerald-50/50 ring-1 ring-[#005b2e]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tipoDesconto"
                value="Adesão"
                checked={tipoDesconto === 'Adesão'}
                onChange={() => {
                  setTipoDesconto('Adesão');
                  setValorCheioAdesao('200.00');
                }}
                className="w-4 h-4 mt-0.5 text-[#005b2e] focus:ring-[#005b2e] cursor-pointer"
              />
              <div className="ml-3">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="text-[#005b2e] font-extrabold text-base leading-none">$</span>
                  <span>Desconto em Adesão</span>
                </span>
                <span className="block text-xs text-gray-500 mt-1 leading-relaxed">
                  Desconto Total Liberado
                </span>
              </div>
            </label>

            {/* Opção 2: Plano Mensal */}
            <label
              className={`flex items-start p-3.5 rounded-lg border transition-all cursor-pointer ${
                tipoDesconto === 'Plano'
                  ? 'border-[#005b2e] bg-emerald-50/50 ring-1 ring-[#005b2e]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tipoDesconto"
                value="Plano"
                checked={tipoDesconto === 'Plano'}
                onChange={() => setTipoDesconto('Plano')}
                className="w-4 h-4 mt-0.5 text-[#005b2e] focus:ring-[#005b2e] cursor-pointer"
              />
              <div className="ml-3">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <span className="text-[#005b2e] font-extrabold text-base leading-none">%</span>
                  <span>Desconto em Plano Mensal</span>
                </span>
                <span className="block text-xs text-gray-500 mt-1 leading-relaxed">
                  Valor Cheio editável • Desconto em <strong>%</strong> (Teto máximo: 20,0%)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Linha 4: Configuração de Valores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Valor Cheio */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {tipoDesconto === 'Adesão' ? 'Valor Cheio da Adesão' : 'Valor Cheio do Plano (R$) *'}
            </label>

            {tipoDesconto === 'Adesão' ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { valor: '200.00', label: 'R$ 200' },
                  { valor: '160.00', label: 'R$ 160' },
                  { valor: '100.00', label: 'R$ 100' }
                ].map((op) => {
                  const isSelected = Math.abs(parseFloat(valorCheioAdesao) - parseFloat(op.valor)) < 0.01;
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => {
                        setValorCheioAdesao(op.valor);
                        if (parseFloat(descontoValorAdesao) > parseFloat(op.valor)) {
                          setDescontoValorAdesao(op.valor);
                        }
                      }}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-[#005b2e] text-white border-[#004724] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-xs font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={valorCheioPlano}
                  onChange={(e) => setValorCheioPlano(e.target.value)}
                  placeholder="150.00"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] text-gray-800 font-bold"
                />
              </div>
            )}
          </div>

          {/* Desconto */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {tipoDesconto === 'Adesão' ? 'Desconto na Adesão (R$) *' : 'Desconto no Plano (% - máx 20%) *'}
            </label>

            {tipoDesconto === 'Adesão' ? (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-xs font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={calculosFinanceiros.valorCheio || 200}
                  required
                  value={descontoValorAdesao}
                  onChange={(e) => setDescontoValorAdesao(e.target.value)}
                  placeholder="30.00"
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border font-bold transition-colors ${
                    calculosFinanceiros.excedeTeto
                      ? 'bg-red-50 border-red-400 text-red-900 focus:ring-red-500'
                      : 'bg-white border-gray-200 hover:border-gray-300 focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] text-gray-800'
                  }`}
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 text-xs font-bold">
                  %
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={descontoPercentualPlano}
                  onChange={(e) => setDescontoPercentualPlano(e.target.value)}
                  placeholder="15"
                  className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg border font-bold transition-colors ${
                    calculosFinanceiros.excedeTeto
                      ? 'bg-red-50 border-red-400 text-red-900 focus:ring-red-500'
                      : 'bg-white border-gray-200 hover:border-gray-300 focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] text-gray-800'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Teto Excedido */}
        {calculosFinanceiros.excedeTeto && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-900 text-xs">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{calculosFinanceiros.mensagemErroTeto}</span>
          </div>
        )}

        {/* Resumo Financeiro Executivo (Ultra Clean, sem caixas aninhadas) */}
        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-gray-500 block">Valor Cheio</span>
              <span className="font-bold text-gray-800 text-sm">{formatarMoedaBRL(calculosFinanceiros.valorCheio)}</span>
            </div>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <div>
              <span className="text-gray-500 block">Desconto</span>
              <span className={`font-bold text-sm ${calculosFinanceiros.excedeTeto ? 'text-red-700' : 'text-amber-700'}`}>
                - {formatarMoedaBRL(calculosFinanceiros.valorDescontoCalculado)} ({calculosFinanceiros.percentualDesconto.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-emerald-800 font-semibold block">Valor Final do Cliente</span>
            <span className="text-base font-extrabold text-[#005b2e]">
              {formatarMoedaBRL(calculosFinanceiros.valorFinal)}
            </span>
          </div>
        </div>

        {/* Linha 5: Justificativa Comercial */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Justificativa Comercial <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={justificativa}
            onChange={(e) => {
              setJustificativa(e.target.value);
              if (errosObrigatorios.justificativa) setErrosObrigatorios((prev) => ({ ...prev, justificativa: undefined }));
            }}
            placeholder="Informe o motivo comercial para a concessão do desconto..."
            className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
              errosObrigatorios.justificativa
                ? 'bg-red-50/50 border-red-400 focus:ring-1 focus:ring-red-500 text-gray-900'
                : 'bg-white border-gray-200 hover:border-gray-300 focus:border-[#005b2e] focus:ring-1 focus:ring-[#005b2e] text-gray-800'
            }`}
          />
          {errosObrigatorios.justificativa && (
            <p className="text-[11px] text-red-600 mt-1">{errosObrigatorios.justificativa}</p>
          )}
        </div>

        {/* Linha 6: Rodapé com Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-500">
            {calculosFinanceiros.excedeTeto ? (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> Desconto excede o teto permitido.
              </span>
            ) : saldoInsuficiente ? (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" /> Saldo da supervisora insuficiente.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Parâmetros válidos.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || calculosFinanceiros.excedeTeto || saldoInsuficiente || !validacaoPlaca.valida || !cliente.trim() || !justificativa.trim()}
            className={`w-full sm:w-auto px-5 py-2 font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2 select-none cursor-pointer ${
              isSubmitting || calculosFinanceiros.excedeTeto || saldoInsuficiente || !validacaoPlaca.valida || !cliente.trim() || !justificativa.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-primary-green hover:bg-emerald-800 text-white active:scale-98'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Solicitação</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
});
