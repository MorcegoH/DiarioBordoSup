/**
 * @file src/components/discounts/DiscountRequestForm.tsx
 * @description Formulário de solicitação de desconto com regras de negócio rígidas,
 * cálculo financeiro em tempo real, validação de placa por Regex e trava de orçamento.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { SolicitacaoDesconto, TipoDesconto, BudgetState } from '../../types';
import { HIERARQUIA_EQUIPES, BUDGET_LIMITS, validarPlacaVeiculo } from '../../data/discountData';
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
  CalendarDays
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
  const [valorCheioPlano, setValorCheioPlano] = useState<string>('150.00');
  const [descontoValorAdesao, setDescontoValorAdesao] = useState<string>('30.00'); // Em R$
  const [descontoPercentualPlano, setDescontoPercentualPlano] = useState<string>('15'); // Em %
  const [justificativa, setJustificativa] = useState<string>('');
  
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
      return calcularDescontoAdesao(descontoValorAdesao);
    } else {
      return calcularDescontoPlano(valorCheioPlano, descontoPercentualPlano);
    }
  }, [tipoDesconto, valorCheioPlano, descontoValorAdesao, descontoPercentualPlano]);

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
  const handleSubmit = (e: React.FormEvent) => {
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

    onAddSolicitacao(novaSolicitacao);

    // Feedback visual
    setFeedbackSucesso(`Solicitação enviada com sucesso! Encaminhada para a fila de aprovação do Gerente Heder Santos (SLA: 4 horas).`);
    
    // Limpar campos
    setCliente('');
    setPlacaInput('');
    setJustificativa('');
    setErrosObrigatorios({});
    if (tipoDesconto === 'Adesão') {
      setDescontoValorAdesao('20.00');
    } else {
      setDescontoPercentualPlano('10');
    }

    setTimeout(() => {
      setFeedbackSucesso(null);
    }, 6000);
  };

  return (
    <div className="corporate-card p-5 sm:p-6 mb-8 relative border-l-4 border-l-[#005b2e]">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-gray-200 gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-50 rounded-lg text-primary-green">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 flex-wrap">
              <span>Nova Solicitação de Desconto</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                Inside Sales
              </span>
              {budget.ciclo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                  <CalendarDays className="w-3 h-3 text-[#005b2e]" />
                  {budget.ciclo.mesExtenso}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Preencha os dados do cliente, veículo e política de desconto para envio à aprovação gerencial
            </p>
          </div>
        </div>

        {feedbackSucesso && (
          <div className="flex items-center gap-2 bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{feedbackSucesso}</span>
          </div>
        )}
      </div>

      {/* Trava de Orçamento Esgotado para a Supervisora selecionada */}
      {saldoSupervisoraAtual <= 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3 text-red-900">
          <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Trava de Sistema Ativada: Orçamento Esgotado</h4>
            <p className="text-xs mt-1 text-red-700">
              O saldo mensal de descontos para a supervisora <strong>{supervisora}</strong> atingiu <strong>R$ 0,00</strong>. Novos pedidos para este time estão bloqueados até o próximo ciclo ou liberação da reserva de contingência pelo Gerente Heder Santos.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        
        {/* Banner de Erros de Campos Obrigatórios não preenchidos */}
        {Object.keys(errosObrigatorios).length > 0 && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-2.5 text-red-900 text-xs animate-shake">
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">Atenção: Preencha os campos obrigatórios para prosseguir:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium">
                {Object.values(errosObrigatorios).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Linha 1: Cliente e Placa do Veículo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Nome do Cliente */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                Nome do Cliente / Razão Social <span className="text-red-500 font-bold">*</span>
              </span>
              {errosObrigatorios.cliente && (
                <span className="text-[11px] text-red-600 font-semibold">{errosObrigatorios.cliente}</span>
              )}
            </label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => {
                setCliente(e.target.value);
                if (errosObrigatorios.cliente) {
                  setErrosObrigatorios((prev) => ({ ...prev, cliente: undefined }));
                }
              }}
              placeholder="Ex: Transportadora Brasil Logística Ltda ou João da Silva"
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 transition-all text-gray-800 ${
                errosObrigatorios.cliente
                  ? 'bg-red-50/50 border border-red-400 focus:ring-red-500'
                  : 'bg-gray-50 border border-gray-300 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white'
              }`}
            />
          </div>

          {/* Placa do Veículo com Validação Regex e Máscara */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-emerald-700" />
                Placa do Veículo <span className="text-red-500 font-bold">*</span>
              </span>
              {placaInput && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  validacaoPlaca.valida 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                    : 'bg-red-50 text-red-700 border border-red-300'
                }`}>
                  {validacaoPlaca.valida ? validacaoPlaca.formato : 'Incompleta'}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={8}
                value={placaInput}
                onChange={(e) => {
                  handlePlacaChange(e);
                  if (errosObrigatorios.placa) {
                    setErrosObrigatorios((prev) => ({ ...prev, placa: undefined }));
                  }
                }}
                placeholder="Ex: ABC1D23 ou ABC-1234"
                className={`w-full px-3 py-2 text-sm font-mono uppercase tracking-wider rounded-lg focus:ring-2 focus:bg-white transition-all ${
                  errosObrigatorios.placa
                    ? 'bg-red-50/60 border border-red-400 text-red-900 focus:ring-red-500'
                    : !placaInput
                    ? 'bg-gray-50 border border-gray-300 focus:ring-[#005b2e] text-gray-800'
                    : validacaoPlaca.valida
                    ? 'bg-emerald-50/60 border border-emerald-500 text-emerald-900 focus:ring-[#005b2e]'
                    : 'bg-red-50/60 border border-red-400 text-red-900 focus:ring-red-500'
                }`}
              />
              <div className="absolute right-3 top-2.5 pointer-events-none">
                {validacaoPlaca.valida ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : placaInput.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>
            {errosObrigatorios.placa ? (
              <p className="text-[10px] text-red-600 font-semibold mt-1">{errosObrigatorios.placa}</p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                <span>Padrões aceitos: Mercosul (ABC1D23) e Tradicional (ABC-1234)</span>
              </p>
            )}
          </div>
        </div>

        {/* Linha 2: Hierarquia (Supervisora e Consultor Dinâmico) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          
          {/* Supervisora */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                Supervisora (Requisitante) *
              </span>
              <span className="text-[11px] font-semibold text-emerald-800">
                Saldo: R$ {saldoSupervisoraAtual.toFixed(2).replace('.', ',')}
              </span>
            </label>
            <select
              value={supervisora}
              onChange={(e) => setSupervisora(e.target.value as 'Débora Rodrigues')}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] transition-all text-gray-800 font-semibold cursor-pointer"
            >
              <option value="Débora Rodrigues">
                Débora Rodrigues — Saldo: R$ {budget.debora.saldoDisponivel.toFixed(2).replace('.', ',')} (Teto: R$ 800,00/mês)
              </option>
            </select>
          </div>

          {/* Consultor Dependente da Supervisora */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                Consultor de Vendas (Inside Sales) *
              </span>
              <span className="text-[10px] text-gray-500 font-normal">
                Supervisão Débora ({listaConsultores.length} consultores)
              </span>
            </label>
            <select
              value={consultor}
              onChange={(e) => setConsultor(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] transition-all text-gray-800 font-medium cursor-pointer"
            >
              {listaConsultores.map((nome) => (
                <option key={nome} value={nome}>
                  {nome} (Inside Sales)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 3: Tipo de Desconto (Radio Buttons) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Tipo de Desconto a Solicitar *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Opção 1: Adesão */}
            <label
              className={`flex items-center p-3.5 rounded-lg border transition-all cursor-pointer ${
                tipoDesconto === 'Adesão'
                  ? 'border-[#005b2e] bg-emerald-50/60 ring-1 ring-[#005b2e]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tipoDesconto"
                value="Adesão"
                checked={tipoDesconto === 'Adesão'}
                onChange={() => setTipoDesconto('Adesão')}
                className="w-4 h-4 text-[#005b2e] focus:ring-[#005b2e]"
              />
              <div className="ml-3">
                <span className="block text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  Desconto em Adesão
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Valor Cheio fixo em <strong>R$ 200,00</strong> • Desconto em <strong>R$</strong> (Sem trava de 20%, até R$ 200,00)
                </span>
              </div>
            </label>

            {/* Opção 2: Plano */}
            <label
              className={`flex items-center p-3.5 rounded-lg border transition-all cursor-pointer ${
                tipoDesconto === 'Plano'
                  ? 'border-[#005b2e] bg-emerald-50/60 ring-1 ring-[#005b2e]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tipoDesconto"
                value="Plano"
                checked={tipoDesconto === 'Plano'}
                onChange={() => setTipoDesconto('Plano')}
                className="w-4 h-4 text-[#005b2e] focus:ring-[#005b2e]"
              />
              <div className="ml-3">
                <span className="block text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  Desconto em Plano Mensal
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Valor Cheio editável • Desconto em <strong>%</strong> (Teto máximo: 20,0%)
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Linha 4: Inputs Financeiros conforme o Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Valor Cheio */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Valor Cheio (R$) *</span>
              {tipoDesconto === 'Adesão' && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-normal">
                  <Lock className="w-3 h-3" /> Fixo da Tabela de Adesão
                </span>
              )}
            </label>
            {tipoDesconto === 'Adesão' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-sm font-bold">
                  R$
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value="200,00"
                  className="w-full pl-10 pr-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg text-gray-600 font-bold cursor-not-allowed select-none"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-sm font-bold">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={valorCheioPlano}
                  onChange={(e) => setValorCheioPlano(e.target.value)}
                  placeholder="Ex: 150.00"
                  className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005b2e] focus:bg-white text-gray-800 font-bold"
                />
              </div>
            )}
          </div>

          {/* Desconto (R$ se Adesão, % se Plano) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>
                {tipoDesconto === 'Adesão' ? 'Valor do Desconto (R$) *' : 'Percentual de Desconto (%) *'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-800">
                {tipoDesconto === 'Adesão' ? 'Adesão (Até R$ 200,00)' : 'Teto Máximo: 20,0%'}
              </span>
            </label>
            
            {tipoDesconto === 'Adesão' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-sm font-bold">
                  R$
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="200"
                  required
                  value={descontoValorAdesao}
                  onChange={(e) => setDescontoValorAdesao(e.target.value)}
                  placeholder="Ex: 50.00, 100.00 ou até 200.00"
                  className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg focus:ring-2 focus:bg-white font-bold ${
                    calculosFinanceiros.excedeTeto
                      ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-500'
                      : 'bg-gray-50 border border-gray-300 focus:ring-[#005b2e] text-gray-800'
                  }`}
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500 text-sm font-bold">
                  %
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={descontoPercentualPlano}
                  onChange={(e) => setDescontoPercentualPlano(e.target.value)}
                  placeholder="Ex: 15 (máx 20)"
                  className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg focus:ring-2 focus:bg-white font-bold ${
                    calculosFinanceiros.excedeTeto
                      ? 'bg-red-50 border border-red-500 text-red-900 focus:ring-red-500'
                      : 'bg-gray-50 border border-gray-300 focus:ring-[#005b2e] text-gray-800'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* ALERTA EM TEMPO REAL SE EXCEDER O TETO DO PLANO */}
        {calculosFinanceiros.excedeTeto && (
          <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2.5 text-red-900 animate-pulse">
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">
                {tipoDesconto === 'Plano' ? 'Teto máximo de 20% excedido no Plano Mensal!' : 'Valor de desconto inválido!'}
              </span>
              <p className="text-xs text-red-800 mt-0.5">
                {calculosFinanceiros.mensagemErroTeto} O botão de envio está bloqueado por política de governança de Inside Sales.
              </p>
            </div>
          </div>
        )}

        {/* Card de Simulação Financeira em Tempo Real */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-700 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <span>Simulação Financeira da Negociação</span>
            </div>
            <span className="text-[11px] text-gray-600 font-medium">
              Impacto no Orçamento: <strong className="text-gray-800">- R$ {calculosFinanceiros.valorDescontoCalculado.toFixed(2).replace('.', ',')}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-500 uppercase block font-semibold">Valor Cheio</span>
              <span className="text-sm font-bold text-gray-800">
                R$ {calculosFinanceiros.valorCheio.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-500 uppercase block font-semibold">Desconto (R$)</span>
              <span className={`text-sm font-bold ${calculosFinanceiros.excedeTeto ? 'text-red-700' : 'text-amber-700'}`}>
                - R$ {calculosFinanceiros.valorDescontoCalculado.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-500 uppercase block font-semibold">% Efetivo</span>
              <span className={`text-sm font-bold ${calculosFinanceiros.excedeTeto ? 'text-red-700' : 'text-[#005b2e]'}`}>
                {calculosFinanceiros.percentualDesconto.toFixed(1).replace('.', ',')}%
              </span>
            </div>

            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
              <span className="text-[10px] text-emerald-800 uppercase block font-bold">Valor Final Cliente</span>
              <span className="text-base font-bold text-emerald-900">
                R$ {calculosFinanceiros.valorFinal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Justificativa Comercial Obrigatória */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-emerald-700" />
              Justificativa Comercial do Desconto <span className="text-red-500 font-bold">*</span>
            </span>
            {errosObrigatorios.justificativa ? (
              <span className="text-[11px] text-red-600 font-semibold">{errosObrigatorios.justificativa}</span>
            ) : (
              <span className="text-[10px] text-gray-400 font-normal">Obrigatório para auditoria gerencial</span>
            )}
          </label>
          <textarea
            required
            rows={3}
            value={justificativa}
            onChange={(e) => {
              setJustificativa(e.target.value);
              if (errosObrigatorios.justificativa) {
                setErrosObrigatorios((prev) => ({ ...prev, justificativa: undefined }));
              }
            }}
            placeholder="Explique o motivo da concessão (Ex: Volume de veículos da frota, contraproposta da concorrência, fechamento imediato de contrato anual)..."
            className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 transition-all text-gray-800 ${
              errosObrigatorios.justificativa
                ? 'bg-red-50/50 border border-red-400 focus:ring-red-500'
                : 'bg-gray-50 border border-gray-300 focus:ring-[#005b2e] focus:border-[#005b2e] focus:bg-white'
            }`}
          />
        </div>

        {/* Botão de Envio com Bloqueio de Teto e Trava de Saldo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-500">
            {calculosFinanceiros.excedeTeto ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <AlertOctagon className="w-4 h-4" /> Envio bloqueado: Reduza o desconto para até 20%.
              </span>
            ) : saldoInsuficiente ? (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <AlertOctagon className="w-4 h-4" /> Envio bloqueado: Saldo da supervisora insuficiente.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Parâmetros válidos para solicitação. SLA de análise: 4 horas.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={calculosFinanceiros.excedeTeto || saldoInsuficiente || !validacaoPlaca.valida || !cliente.trim() || !justificativa.trim()}
            className={`w-full sm:w-auto px-6 py-2.5 font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer select-none ${
              calculosFinanceiros.excedeTeto || saldoInsuficiente || !validacaoPlaca.valida || !cliente.trim() || !justificativa.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-primary-green hover:bg-emerald-800 text-white active:scale-95'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Enviar Solicitação para Aprovação</span>
          </button>
        </div>

      </form>
    </div>
  );
});
