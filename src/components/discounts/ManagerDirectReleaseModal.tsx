/**
 * @file src/components/discounts/ManagerDirectReleaseModal.tsx
 * @description Modal exclusivo para o Gerente registrar uma liberação direta de desconto
 * com autenticação estrita por senha gerencial de segurança.
 */

import React, { useState, useMemo } from 'react';
import { SolicitacaoDesconto, TipoDesconto, BudgetCycleInfo } from '../../types';
import { HIERARQUIA_EQUIPES, validarPlacaVeiculo } from '../../data/discountData';
import { verifyApprovalAuthorization, sanitizeTextInput } from '../../utils/security';
import { 
  calcularDescontoAdesao, 
  calcularDescontoPlano, 
  formatarMoedaBRL 
} from '../../utils/finance';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Calculator, 
  Car, 
  X,
  UserCheck,
  CalendarDays
} from 'lucide-react';

interface ManagerDirectReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRegistro: (novaLiberacao: SolicitacaoDesconto) => void;
  saldoReservaGerente?: number;
  ciclo?: BudgetCycleInfo;
}

export const ManagerDirectReleaseModal: React.FC<ManagerDirectReleaseModalProps> = React.memo(({
  isOpen,
  onClose,
  onConfirmRegistro,
  saldoReservaGerente = 200.0,
  ciclo
}) => {
  const [supervisora, setSupervisora] = useState<'Débora Rodrigues'>('Débora Rodrigues');
  const [consultor, setConsultor] = useState<string>(HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'][0] || 'Aila');
  const [cliente, setCliente] = useState<string>('');
  const [placaInput, setPlacaInput] = useState<string>('');
  const [tipoDesconto, setTipoDesconto] = useState<TipoDesconto>('Adesão');
  
  // Valores financeiros
  const [descontoValorAdesao, setDescontoValorAdesao] = useState<string>('');
  const [valorCheioPlano, setValorCheioPlano] = useState<string>('150.00');
  const [descontoPercentualPlano, setDescontoPercentualPlano] = useState<string>('');
  
  // Justificativa e Segurança
  const [motivoLiberacao, setMotivoLiberacao] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [erroSenha, setErroSenha] = useState<string>('');

  // Erros de campos obrigatórios
  const [errosObrigatorios, setErrosObrigatorios] = useState<{
    cliente?: string;
    placa?: string;
    desconto?: string;
    motivo?: string;
    senha?: string;
  }>({});

  // Lista de consultores da equipe unificada
  const consultoresDisponiveis = useMemo(() => {
    return HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'] || [];
  }, []);

  // Validação da placa
  const validacaoPlaca = useMemo(() => {
    return validarPlacaVeiculo(placaInput);
  }, [placaInput]);

  // Cálculos financeiros em tempo real
  const calculos = useMemo(() => {
    const res = tipoDesconto === 'Adesão'
      ? calcularDescontoAdesao(descontoValorAdesao)
      : calcularDescontoPlano(valorCheioPlano, descontoPercentualPlano);

    // Validação da Reserva do Gerente
    const tetoGerenteEsgotado = saldoReservaGerente <= 0;
    const excedeSaldoGerente = res.valorDescontoCalculado > saldoReservaGerente;

    return {
      valorCheio: res.valorCheio,
      valorDesconto: res.valorDescontoCalculado,
      percentual: res.percentualDesconto,
      valorFinal: res.valorFinal,
      excede: res.excedeTeto,
      mensagemErro: res.mensagemErroTeto,
      tetoGerenteEsgotado,
      excedeSaldoGerente
    };
  }, [tipoDesconto, descontoValorAdesao, valorCheioPlano, descontoPercentualPlano, saldoReservaGerente]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha('');

    const novosErros: {
      cliente?: string;
      placa?: string;
      desconto?: string;
      motivo?: string;
      senha?: string;
    } = {};

    // Validações de campos obrigatórios
    if (!cliente.trim()) {
      novosErros.cliente = 'Campo obrigatório: Informe o Nome/Razão Social do Cliente.';
    }

    if (!placaInput.trim()) {
      novosErros.placa = 'Campo obrigatório: Informe a Placa do Veículo.';
    } else if (!validacaoPlaca.valida) {
      novosErros.placa = 'Placa inválida: Digite no padrão Mercosul (ABC1D23) ou Tradicional (ABC-1234).';
    }

    if (calculos.valorDesconto <= 0) {
      novosErros.desconto = 'Campo obrigatório: Informe um valor ou percentual de desconto concedido maior que zero.';
    }

    if (!motivoLiberacao.trim()) {
      novosErros.motivo = 'Campo obrigatório: Descreva a justificativa/motivo do desconto liberado pelo Gerente.';
    }

    if (!senha.trim()) {
      novosErros.senha = 'Campo obrigatório: Digite a Senha de Segurança Gerencial para autenticar o registro.';
    }

    if (Object.keys(novosErros).length > 0) {
      setErrosObrigatorios(novosErros);
      return;
    }

    setErrosObrigatorios({});

    // Bloqueio se o teto do gerente estiver esgotado
    if (calculos.tetoGerenteEsgotado) {
      return;
    }

    if (calculos.excede) {
      return;
    }

    // Validação de senha de autorização/aprovação gerencial
    if (!verifyApprovalAuthorization(senha)) {
      setErroSenha('Senha de Segurança incorreta. Liberação não autorizada pelo Gerente Heder Santos.');
      return;
    }

    const agora = new Date().toISOString();
    const id = `ger-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const cleanCliente = sanitizeTextInput(cliente, 150);
    const cleanMotivo = sanitizeTextInput(motivoLiberacao, 1000);

    const novaLiberacao: SolicitacaoDesconto = {
      id,
      dataHoraSolicitacao: agora,
      cliente: cleanCliente,
      supervisora: supervisora,
      consultor: consultor,
      placa: validacaoPlaca.formatada,
      tipoDesconto,
      valorCheio: calculos.valorCheio,
      descontoInput: tipoDesconto === 'Adesão' ? calculos.valorDesconto : calculos.percentual,
      valorDescontoCalculado: calculos.valorDesconto,
      percentualDesconto: calculos.percentual,
      valorFinal: calculos.valorFinal,
      justificativa: `[LIBERAÇÃO DIRETA GERENCIAL]: ${cleanMotivo}`,
      status: 'Aprovado',
      dataHoraAprovacao: agora,
      aprovador: 'Heder Santos (Gerente)',
      parecer: `Liberação direta autorizada pelo Gerente de Vendas: ${cleanMotivo}`,
      tipoRegistro: 'LiberacaoGerencial'
    };

    onConfirmRegistro(novaLiberacao);
    
    // Limpar campos
    setCliente('');
    setPlacaInput('');
    setDescontoValorAdesao('');
    setDescontoPercentualPlano('');
    setMotivoLiberacao('');
    setSenha('');
    setErroSenha('');
    setErrosObrigatorios({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="bg-[#005b2e] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              <Shield className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Registro de Desconto Liberado pelo Gerente</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-500/40">
                  Heder Santos
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                Lançamento oficial de descontos negociados e concedidos diretamente pela Gerência de Vendas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto" noValidate>
          
          {/* Informação do Ciclo Mensal e Vigência da Reserva */}
          {ciclo && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#005b2e] shrink-0" />
                <span>
                  <strong>Competência:</strong> {ciclo.mesExtenso}
                </span>
              </div>
              <span className="font-semibold text-emerald-800 text-[11px]">
                Liberação: {ciclo.dataProximaRenovacao}
              </span>
            </div>
          )}

          {/* Alerta de Teto Esgotado da Reserva do Gerente */}
          {saldoReservaGerente <= 0 && (
            <div className="p-3.5 bg-red-50 border-l-4 border-red-600 rounded-r-lg flex items-start gap-2.5 text-red-900 text-xs">
              <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">Teto Máximo do Gerente Esgotado</span>
                <p className="mt-0.5 text-red-800">
                  O gerente <strong>Heder Santos</strong> já liberou seu teto máximo mensal de <strong>R$ 200,00</strong> para {ciclo ? ciclo.mesCurto : 'este mês'}. A reserva de contingência gerencial <strong>não está mais disponível</strong> para novas concessões neste ciclo (próxima liberação em {ciclo?.dataProximaRenovacao || 'próximo dia 01'}).
                </p>
              </div>
            </div>
          )}

          {/* Banner de Erros de Campos Obrigatórios não preenchidos */}
          {Object.keys(errosObrigatorios).length > 0 && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-2.5 text-red-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Campos obrigatórios não preenchidos:</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-medium">
                  {Object.values(errosObrigatorios).map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Informações da Equipe / Destino do Desconto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Equipe / Supervisão Beneficiada *
              </label>
              <select
                value={supervisora}
                disabled
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-100 font-semibold text-gray-800 cursor-not-allowed"
              >
                <option value="Débora Rodrigues">Equipe Débora Rodrigues (Supervisão Unificada)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Consultor Responsável pelo Fechamento *
              </label>
              <select
                value={consultor}
                onChange={(e) => setConsultor(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white font-semibold focus:ring-2 focus:ring-[#005b2e] focus:border-[#005b2e] cursor-pointer"
              >
                {consultoresDisponiveis.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dados do Cliente e Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>Cliente / Razão Social <span className="text-red-500 font-bold">*</span></span>
                {errosObrigatorios.cliente && (
                  <span className="text-[10px] text-red-600 font-semibold">{errosObrigatorios.cliente}</span>
                )}
              </label>
              <input
                type="text"
                required
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  if (errosObrigatorios.cliente) {
                    setErrosObrigatorios(prev => ({ ...prev, cliente: undefined }));
                  }
                }}
                placeholder="Nome do cliente ou empresa"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white focus:ring-2 transition-all ${
                  errosObrigatorios.cliente
                    ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-[#005b2e] focus:border-[#005b2e]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>Placa do Veículo <span className="text-red-500 font-bold">*</span></span>
                {placaInput && (
                  <span className={`text-[10px] font-bold px-1 rounded ${
                    validacaoPlaca.valida ? 'text-emerald-700' : 'text-red-600'
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
                    setPlacaInput(e.target.value.toUpperCase());
                    if (errosObrigatorios.placa) {
                      setErrosObrigatorios(prev => ({ ...prev, placa: undefined }));
                    }
                  }}
                  placeholder="BRA2E19"
                  className={`w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg border focus:ring-2 uppercase ${
                    errosObrigatorios.placa
                      ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-red-500'
                      : !placaInput 
                      ? 'border-gray-300 bg-white focus:ring-[#005b2e]' 
                      : validacaoPlaca.valida 
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 focus:ring-[#005b2e]' 
                      : 'border-red-400 bg-red-50/50 text-red-900 focus:ring-red-500'
                  }`}
                />
                <Car className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
              {errosObrigatorios.placa && (
                <p className="text-[10px] text-red-600 font-semibold mt-0.5">{errosObrigatorios.placa}</p>
              )}
            </div>
          </div>

          {/* Modalidade de Desconto Liberado */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Tipo de Desconto Concedido *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  tipoDesconto === 'Adesão'
                    ? 'border-[#005b2e] bg-emerald-50/60 ring-1 ring-[#005b2e]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="mgr_tipoDesconto"
                  checked={tipoDesconto === 'Adesão'}
                  onChange={() => setTipoDesconto('Adesão')}
                  className="w-4 h-4 text-[#005b2e] focus:ring-[#005b2e]"
                />
                <div className="ml-2.5">
                  <span className="text-xs font-bold text-gray-800 block">Desconto em Adesão</span>
                  <span className="text-[11px] text-gray-500 block">Valor Cheio: R$ 200,00 (Até R$ 200,00)</span>
                </div>
              </label>

              <label
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  tipoDesconto === 'Plano'
                    ? 'border-[#005b2e] bg-emerald-50/60 ring-1 ring-[#005b2e]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="mgr_tipoDesconto"
                  checked={tipoDesconto === 'Plano'}
                  onChange={() => setTipoDesconto('Plano')}
                  className="w-4 h-4 text-[#005b2e] focus:ring-[#005b2e]"
                />
                <div className="ml-2.5">
                  <span className="text-xs font-bold text-gray-800 block">Desconto em Plano Mensal</span>
                  <span className="text-[11px] text-gray-500 block">Desconto em % (Teto: 20,0%)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Valores Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {tipoDesconto === 'Adesão' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Valor Cheio da Adesão
                  </label>
                  <input
                    type="text"
                    disabled
                    value="R$ 200,00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-100 font-bold text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Valor do Desconto Liberado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="200"
                    required
                    value={descontoValorAdesao}
                    onChange={(e) => setDescontoValorAdesao(e.target.value)}
                    placeholder="Ex: 50.00 ou até 200.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-bold text-gray-800 focus:ring-2 focus:ring-[#005b2e]"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Valor Cheio do Plano Mensal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorCheioPlano}
                    onChange={(e) => setValorCheioPlano(e.target.value)}
                    placeholder="150.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-bold text-gray-800 focus:ring-2 focus:ring-[#005b2e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex justify-between">
                    <span>Percentual Concedido (%) *</span>
                    <span className="text-[11px] text-emerald-800 font-normal">Teto: 20,0%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    required
                    value={descontoPercentualPlano}
                    onChange={(e) => setDescontoPercentualPlano(e.target.value)}
                    placeholder="Ex: 15 (máx 20)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-bold text-gray-800 focus:ring-2 focus:ring-[#005b2e]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Alerta se exceder regra do plano */}
          {calculos.excede && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2 text-red-900 text-xs">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{calculos.mensagemErro}</span>
            </div>
          )}

          {/* Resumo Financeiro da Liberação */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 pb-2 mb-2 border-b border-gray-200">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <span>Resumo do Desconto Liberado</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-500 block uppercase">Desconto Efetivo</span>
                <span className="text-xs font-bold text-amber-700">
                  - R$ {calculos.valorDesconto.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-500 block uppercase">% Equivalente</span>
                <span className="text-xs font-bold text-[#005b2e]">
                  {calculos.percentual.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300">
                <span className="text-[10px] text-emerald-800 block uppercase font-bold">Valor Final Cliente</span>
                <span className="text-xs font-bold text-emerald-900">
                  R$ {calculos.valorFinal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {/* Motivo da Concessão pelo Gerente */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
              <span>Motivo / Justificativa da Liberação pelo Gerente <span className="text-red-500 font-bold">*</span></span>
              {errosObrigatorios.motivo && (
                <span className="text-[10px] text-red-600 font-semibold">{errosObrigatorios.motivo}</span>
              )}
            </label>
            <textarea
              required
              rows={2}
              value={motivoLiberacao}
              onChange={(e) => {
                setMotivoLiberacao(e.target.value);
                if (errosObrigatorios.motivo) {
                  setErrosObrigatorios(prev => ({ ...prev, motivo: undefined }));
                }
              }}
              placeholder="Ex: Negociação especial autorizada em reunião com diretoria frotista / Retenção estratégica..."
              className={`w-full px-3 py-2 text-xs rounded-lg border focus:ring-2 ${
                errosObrigatorios.motivo
                  ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-[#005b2e]'
              }`}
            />
          </div>

          {/* Autenticação com Senha de Segurança */}
          <div className={`p-3.5 rounded-lg border ${
            errosObrigatorios.senha || erroSenha 
              ? 'bg-red-50/70 border-red-300' 
              : 'bg-emerald-50/60 border-emerald-200'
          }`}>
            <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#005b2e]" />
                Senha de Segurança do Gerente (Obrigatória para Autenticar Registro) <span className="text-red-500 font-bold">*</span>
              </span>
              {errosObrigatorios.senha && (
                <span className="text-[10px] text-red-600 font-semibold">{errosObrigatorios.senha}</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErroSenha('');
                  if (errosObrigatorios.senha) {
                    setErrosObrigatorios(prev => ({ ...prev, senha: undefined }));
                  }
                }}
                placeholder="Informe a senha gerencial de autenticação..."
                className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-emerald-300 bg-white font-mono focus:ring-2 focus:ring-[#005b2e]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroSenha && (
              <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {erroSenha}
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs">
              {calculos.tetoGerenteEsgotado ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4" /> Teto do gerente esgotado (Saldo: R$ 0,00).
                </span>
              ) : (
                <span className="text-emerald-800 font-medium flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" /> Saldo reserva gerente: <strong>R$ {saldoReservaGerente.toFixed(2).replace('.', ',')}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={calculos.tetoGerenteEsgotado || calculos.excede || !cliente.trim() || !validacaoPlaca.valida || !motivoLiberacao.trim() || !senha.trim()}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                  calculos.tetoGerenteEsgotado || calculos.excede || !cliente.trim() || !validacaoPlaca.valida || !motivoLiberacao.trim() || !senha.trim()
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-[#005b2e] hover:bg-emerald-800 shadow-sm'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Autenticar e Gravar Liberação
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
});
