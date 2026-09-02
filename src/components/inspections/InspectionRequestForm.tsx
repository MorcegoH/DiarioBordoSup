/**
 * @file src/components/inspections/InspectionRequestForm.tsx
 * @description Formulário de Solicitação de Vistoria com validações rígidas de placa (Mercosul e Tradicional),
 * máscara de telefone, links de localização do Google Maps, links de sistemas externos e controle de taxa de adesão.
 * Otimizado para dispositivos móveis com áreas de toque ampliadas (44px+) e feedback em tempo real.
 */

import React, { useState, useMemo } from 'react';
import { SolicitacaoVistoria, Vistoriador } from '../../types';
import { validarPlacaVeiculo } from '../../data/discountData';
import { sanitizeTextInput, sanitizeSafeUrl, getSafeWhatsAppUrl } from '../../utils/security';
import {
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  MapPin,
  DollarSign,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Send,
  Sparkles,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Navigation
} from 'lucide-react';

interface InspectionRequestFormProps {
  onAddVistoria: (vistoria: SolicitacaoVistoria) => Promise<void> | void;
  currentUser?: { name: string; role: string } | null;
}

export const InspectionRequestForm: React.FC<InspectionRequestFormProps> = React.memo(({
  onAddVistoria,
  currentUser
}) => {
  // Data de hoje como padrão inicial
  const hojeStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Estados dos Campos
  const [dataVistoria, setDataVistoria] = useState<string>(hojeStr);
  const [horarioVistoria, setHorarioVistoria] = useState<string>('09:00');
  const [valorAdesao, setValorAdesao] = useState<string>('200.00');
  const [adesaoPaga, setAdesaoPaga] = useState<boolean>(false);
  const [vistoriador, setVistoriador] = useState<Vistoriador>('Danilo');
  const [nomeAssociado, setNomeAssociado] = useState<string>('');
  const [contato, setContato] = useState<string>('');
  const [localizacaoMaps, setLocalizacaoMaps] = useState<string>('');
  const [modeloCarro, setModeloCarro] = useState<string>('');
  const [placaInput, setPlacaInput] = useState<string>('');
  const [linkVistoria, setLinkVistoria] = useState<string>('');
  const [linkPagamento, setLinkPagamento] = useState<string>('');

  // Feedbacks visuais
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [erros, setErros] = useState<{ [key: string]: string }>({});

  // Validação em tempo real da Placa (Padrão Mercosul / Tradicional)
  const validacaoPlaca = useMemo(() => {
    return validarPlacaVeiculo(placaInput);
  }, [placaInput]);

  const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
    setPlacaInput(raw);
    if (erros.placa) {
      setErros((prev) => ({ ...prev, placa: '' }));
    }
  };

  // Máscara e formatação de Telefone com DDD
  const handleContatoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setContato(formatted);
    if (erros.contato) {
      setErros((prev) => ({ ...prev, contato: '' }));
    }
  };

  // Submissão com Validações
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const novosErros: { [key: string]: string } = {};

    const cleanAssociado = sanitizeTextInput(nomeAssociado, 150);
    const cleanModelo = sanitizeTextInput(modeloCarro, 100);
    const cleanMaps = sanitizeTextInput(localizacaoMaps, 1000);
    const cleanLinkVis = sanitizeTextInput(linkVistoria, 2000);
    const cleanLinkPag = sanitizeTextInput(linkPagamento, 2000);
    const cleanContato = sanitizeTextInput(contato, 30);
    const parsedValor = parseFloat(valorAdesao.replace(',', '.')) || 0;

    if (!dataVistoria) {
      novosErros.dataVistoria = 'Informe a data agendada para a vistoria.';
    }

    if (!horarioVistoria) {
      novosErros.horarioVistoria = 'Informe o horário agendado.';
    }

    if (!cleanAssociado.trim()) {
      novosErros.nomeAssociado = 'Informe o nome completo do associado.';
    }

    const digitsContato = cleanContato.replace(/\D/g, '');
    if (!digitsContato || digitsContato.length < 10) {
      novosErros.contato = 'Informe um telefone com DDD válido (10 ou 11 dígitos).';
    }

    if (!cleanModelo.trim()) {
      novosErros.modeloCarro = 'Informe a marca e modelo do carro (ex: Corolla 2.0 XEi).';
    }

    if (!placaInput.trim()) {
      novosErros.placa = 'Informe a placa do veículo.';
    } else if (!validacaoPlaca.valida) {
      novosErros.placa = 'Placa inválida. Digite no formato Mercosul (ABC1D23) ou Padrão Tradicional (ABC-1234).';
    }

    if (!cleanMaps.trim()) {
      novosErros.localizacaoMaps = 'Informe o link de localização do Google Maps.';
    }

    if (parsedValor < 0) {
      novosErros.valorAdesao = 'O valor da adesão não pode ser negativo.';
    }

    setErros(novosErros);

    if (Object.keys(novosErros).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const nova: SolicitacaoVistoria = {
        id: `vis-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        dataHoraSolicitacao: new Date().toISOString(),
        dataVistoria,
        horarioVistoria,
        valorAdesao: parsedValor,
        adesaoPaga,
        vistoriador,
        nomeAssociado: cleanAssociado,
        contato: cleanContato,
        localizacaoMaps: cleanMaps,
        modeloCarro: cleanModelo,
        placa: placaInput.toUpperCase(),
        tipoPlaca: validacaoPlaca.tipo,
        linkVistoria: cleanLinkVis,
        linkPagamento: cleanLinkPag,
        solicitante: currentUser?.name || 'Inside Sales',
        status: 'Aguardando Vistoria'
      };

      await onAddVistoria(nova);

      // Limpar formulário mantendo data atual e vistoriador
      setNomeAssociado('');
      setContato('');
      setModeloCarro('');
      setPlacaInput('');
      setLocalizacaoMaps('');
      setLinkVistoria('');
      setLinkPagamento('');
      setAdesaoPaga(false);
      setValorAdesao('200.00');

      setFeedbackSucesso(`Solicitação de vistoria para ${cleanAssociado} (${nova.placa}) enviada com sucesso para ${vistoriador}!`);
      setTimeout(() => setFeedbackSucesso(null), 6000);
    } catch (err: any) {
      alert('Erro ao registrar vistoria: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeMaps = sanitizeSafeUrl(localizacaoMaps);
  const safeVis = sanitizeSafeUrl(linkVistoria);
  const safePag = sanitizeSafeUrl(linkPagamento);
  const safeWhats = getSafeWhatsAppUrl(contato);

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-emerald-100 overflow-hidden">
      {/* Mensagem de Feedback de Sucesso */}
      {feedbackSucesso && (
        <div className="mx-5 sm:mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-950 text-xs sm:text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{feedbackSucesso}</span>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        
        {/* GRUPO 1: Agendamento e Designação do Vistoriador */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>1. Agendamento & Vistoriador Designado</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data da Vistoria */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data da Vistoria <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dataVistoria}
                  onChange={(e) => {
                    setDataVistoria(e.target.value);
                    if (erros.dataVistoria) setErros((p) => ({ ...p, dataVistoria: '' }));
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px] sm:min-h-0 ${
                    erros.dataVistoria ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
              </div>
              {erros.dataVistoria && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.dataVistoria}</span>
              )}
            </div>

            {/* Horário da Vistoria */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Horário Agendado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={horarioVistoria}
                  onChange={(e) => {
                    setHorarioVistoria(e.target.value);
                    if (erros.horarioVistoria) setErros((p) => ({ ...p, horarioVistoria: '' }));
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px] sm:min-h-0 ${
                    erros.horarioVistoria ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                />
                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
              </div>
              {erros.horarioVistoria && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.horarioVistoria}</span>
              )}
            </div>

            {/* Vistoriador: Danilo ou Lucas */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Vistoriador Responsável <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVistoriador('Danilo')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer active:scale-95 touch-manipulation ${
                    vistoriador === 'Danilo'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Danilo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVistoriador('Lucas')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer active:scale-95 touch-manipulation ${
                    vistoriador === 'Lucas'
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Lucas</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* GRUPO 2: Dados do Associado e Contato */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <User className="w-4 h-4 text-emerald-700" />
            <span>2. Dados do Associado & Contato</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome do Associado */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nome do Associado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nomeAssociado}
                  onChange={(e) => {
                    setNomeAssociado(e.target.value);
                    if (erros.nomeAssociado) setErros((p) => ({ ...p, nomeAssociado: '' }));
                  }}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px] sm:min-h-0 ${
                    erros.nomeAssociado ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
              </div>
              {erros.nomeAssociado && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.nomeAssociado}</span>
              )}
            </div>

            {/* Contato com DDD */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Contato / Telefone com DDD <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={contato}
                    onChange={handleContatoChange}
                    placeholder="Ex: (11) 98765-4321"
                    maxLength={15}
                    className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-medium min-h-[44px] sm:min-h-0 ${
                      erros.contato ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                  />
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
                </div>
                {safeWhats && (
                  <a
                    href={safeWhats}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors active:scale-95 touch-manipulation"
                    title="Conversar pelo WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}
              </div>
              {erros.contato && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.contato}</span>
              )}
            </div>
          </div>
        </div>

        {/* GRUPO 3: Dados do Veículo e Placa */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <Car className="w-4 h-4 text-emerald-700" />
            <span>3. Veículo & Placa</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modelo do Carro */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Carro (Modelo / Versão) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={modeloCarro}
                  onChange={(e) => {
                    setModeloCarro(e.target.value);
                    if (erros.modeloCarro) setErros((p) => ({ ...p, modeloCarro: '' }));
                  }}
                  placeholder="Ex: Toyota Corolla 2.0 XEi Flex / HB20 1.0"
                  className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px] sm:min-h-0 ${
                    erros.modeloCarro ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                />
                <Car className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
              </div>
              {erros.modeloCarro && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.modeloCarro}</span>
              )}
            </div>

            {/* Placa com Validação Regex Mercosul / Tradicional */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Placa do Veículo <span className="text-red-500">*</span>
                </label>
                {placaInput.trim().length > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      validacaoPlaca.valida
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {validacaoPlaca.tipo}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={placaInput}
                  onChange={handlePlacaChange}
                  placeholder="Ex: BRA2E19 ou ABC-1234"
                  maxLength={8}
                  className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl uppercase tracking-wider font-mono font-bold focus:ring-2 focus:ring-emerald-500 min-h-[44px] sm:min-h-0 ${
                    erros.placa
                      ? 'border-red-400 bg-red-50 text-red-900'
                      : validacaoPlaca.valida
                      ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950'
                      : 'border-gray-300 bg-white'
                  }`}
                />
                <Car className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
              </div>
              {erros.placa && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.placa}</span>
              )}
            </div>
          </div>
        </div>

        {/* GRUPO 4: Localização Google Maps & Valor da Adesão (com Checkbox de Recebimento) */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>4. Localização (Google Maps) & Taxa de Adesão</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Link de Localização Google Maps */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Local (Link do Google Maps) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    value={localizacaoMaps}
                    onChange={(e) => {
                      setLocalizacaoMaps(e.target.value);
                      if (erros.localizacaoMaps) setErros((p) => ({ ...p, localizacaoMaps: '' }));
                    }}
                    placeholder="https://maps.google.com/?q=..."
                    className={`w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-[11px] min-h-[44px] sm:min-h-0 ${
                      erros.localizacaoMaps ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
                </div>
                {safeMaps && (
                  <a
                    href={safeMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 active:scale-95 touch-manipulation"
                    title="Abrir no Google Maps"
                  >
                    <Navigation className="w-4 h-4" />
                  </a>
                )}
              </div>
              {erros.localizacaoMaps && (
                <span className="text-[11px] text-red-600 font-semibold mt-1 block">{erros.localizacaoMaps}</span>
              )}
            </div>

            {/* Adesão: Valor R$ e Checkbox de Status de Pagamento */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Adesão Acordada (R$) & Status de Cobrança <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative w-full sm:w-36 shrink-0">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorAdesao}
                    onChange={(e) => setValorAdesao(e.target.value)}
                    placeholder="200,00"
                    className="w-full pl-8 pr-3 py-2.5 sm:py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-900 bg-white min-h-[44px] sm:min-h-0"
                  />
                  <span className="text-xs font-bold text-gray-500 absolute left-2.5 top-3 sm:top-2">R$</span>
                </div>

                {/* Checkbox estilizado com indicação explícita e touch target 44px+ */}
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all flex-grow min-h-[44px] ${
                  adesaoPaga
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                    : 'bg-amber-50/70 border-amber-300 text-amber-950 font-semibold'
                }`}>
                  <input
                    type="checkbox"
                    checked={adesaoPaga}
                    onChange={(e) => setAdesaoPaga(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    {adesaoPaga ? (
                      <span className="flex items-center gap-1 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Adesão Já Paga
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-800">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                        A receber pelo vistoriador
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* GRUPO 5: Hiperlinks de Integração Externa */}
        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
            <LinkIcon className="w-4 h-4 text-emerald-700" />
            <span>5. Hiperlinks Gerados por Outros Sistemas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LINK VISTORIA */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                LINK VISTORIA (Hiperlink do Sistema de Vistoria)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    value={linkVistoria}
                    onChange={(e) => setLinkVistoria(e.target.value)}
                    placeholder="https://sistema-vistoria.com/laudo/..."
                    className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-[11px] bg-white min-h-[44px] sm:min-h-0"
                  />
                  <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
                </div>
                {safeVis && (
                  <a
                    href={safeVis}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 active:scale-95 touch-manipulation"
                    title="Abrir Link da Vistoria"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* LINK PAGAMENTO */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                LINK PAGAMENTO (Hiperlink de Pagamento / Fatura)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    value={linkPagamento}
                    onChange={(e) => setLinkPagamento(e.target.value)}
                    placeholder="https://sistema-pagamento.com/fatura/..."
                    className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-[11px] bg-white min-h-[44px] sm:min-h-0"
                  />
                  <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 sm:top-2.5" />
                </div>
                {safePag && (
                  <a
                    href={safePag}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl transition-colors flex items-center justify-center shrink-0 active:scale-95 touch-manipulation"
                    title="Abrir Link de Pagamento"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Envio com Touch Target 48px */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#005b2e] to-[#007a3d] hover:from-[#004a25] hover:to-[#006633] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98 touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registrando Solicitação...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Cadastrar Solicitação de Vistoria</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
});
