/**
 * @file src/utils/discountAnalytics.ts
 * @description Módulo de Ciência de Dados e Análise Preditiva para Gestão de Descontos e Governança Financeira.
 * Fornece algoritmos de Burn Rate, Matriz de Recorrência de Consultores, Monitoramento de SLA e Impacto Financeiro.
 */

import { SolicitacaoDesconto, TipoDesconto } from '../types';
import { HIERARQUIA_EQUIPES, BUDGET_LIMITS } from '../data/discountData';

export interface BurnRatePonto {
  dia: number;
  diaLabel: string;
  consumoReal?: number;
  consumoProjetado?: number;
  tetoMaximo: number;
  ritmoIdeal: number;
  isHoje?: boolean;
}

export interface BurnRateAnalysis {
  pontos: BurnRatePonto[];
  consumoAtual: number;
  saldoRestante: number;
  diasDecorridos: number;
  diasNoMes: number;
  diaAtual: number;
  burnRateDiario: number; // R$/dia
  burnRateIdeal: number; // R$/dia sustentável (~30/dia)
  projecaoFinalMes: number;
  diaEstimadoEsgotamento: number | null; // Dia do mês em que o saldo acabará (ex: dia 21)
  statusQueima: 'Sustentável' | 'Atenção' | 'Crítico (Esgotamento Precoce)';
  percentualConsumido: number;
  mensagemExecutiva: string;
}

export interface ConsultorRecorrencia {
  nome: string;
  supervisora: string;
  totalSolicitacoes: number;
  solicitacoesAprovadas: number;
  solicitacoesNegadas: number;
  volumeTotalReais: number;
  ticketMedioDesconto: number;
  frequenciaDescontoPercentual: number; // % estimada de dependência de desconto
  indiceDependencia: 'Baixo (Saudável)' | 'Moderado' | 'Alto (Risco)' | 'Crítico (Dependente)';
  corNivel: 'verde' | 'amarelo' | 'laranja' | 'vermelho';
  acaoRecomendada: string;
}

export interface SLARiskAnalysis {
  tempoMedioMinutos: number;
  tempoMedioHoras: number;
  tempoMedioFormatado: string;
  statusSLA: 'Excelente' | 'Normal' | 'Alerta Amarelo (Próximo a 4h)' | 'Crítico (Estouro de SLA)';
  corAlerta: 'verde' | 'amarelo' | 'vermelho';
  totalAvaliadas: number;
  totalNoPrazo: number;
  totalAtrasadas: number;
  percentualNoPrazo: number;
  mediaPorSupervisora: {
    supervisora: string;
    tempoMedioMinutos: number;
    tempoMedioHoras: number;
  }[];
  distribuicaoTempo: {
    faixa: string;
    quantidade: number;
    percentual: number;
  }[];
}

export interface ConversaoTipoDescontoAnalysis {
  dadosPizzaVolume: { name: string; value: number; color: string }[];
  dadosPizzaFinanceiro: { name: string; value: number; color: string; percentual: number }[];
  totalGastoAdesao: number;
  totalGastoPlano: number;
  totalGastoGeral: number;
  percentualAdesao: number;
  percentualPlano: number;
  qtdAdesao: number;
  qtdPlano: number;
  ticketMedioAdesao: number;
  ticketMedioPlano: number;
  diagnosticoImpacto: string;
  modalidadeMaisCritica: TipoDesconto;
}

/**
 * Gera dados simulados realistas para o mês vigente caso o usuário ainda não tenha solicitações cadastradas.
 */
export function gerarDadosSimuladosDesconto(): SolicitacaoDesconto[] {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const diaAtual = hoje.getDate();

  const mockConsultoresDebora = HIERARQUIA_EQUIPES.supervisoras['Débora Rodrigues'];

  const lista: SolicitacaoDesconto[] = [];

  // Gera dados distribuídos desde o dia 1 até o dia atual
  const diasParaGerar = Math.max(8, Math.min(diaAtual, 28));

  // Amostras de placas e clientes
  const placas = ['ABC1D23', 'BRA2E19', 'RIO3F45', 'SPO4G78', 'MGH5H90', 'PRB6I12', 'RSC7J34', 'BAK8K56', 'DFL9L78', 'GOZ0M12'];
  const clientes = [
    'Transportadora Silva & Filhos', 'Logística Express ABC', 'Distribuidora Minas Frota',
    'Marcos Vinicius Pereira', 'Juliana Costa e Silva', 'Frotas & Cargas Paulista',
    'Agropecuária Sul do Brasil', 'Carla Fernandes Lima', 'Roberto Almeida Santos',
    'Tech & Move Transportes'
  ];

  let idCounter = 1;

  for (let dia = 1; dia <= diasParaGerar; dia++) {
    const qtdNoDia = (dia % 3 === 0 || dia === diasParaGerar) ? 3 : (dia % 2 === 0 ? 2 : 1);

    for (let k = 0; k < qtdNoDia; k++) {
      const supervisora = 'Débora Rodrigues';
      const consultores = mockConsultoresDebora;
      
      // Alguns consultores pedem mais frequentemente (para criar variabilidade na matriz de calor)
      let consultor = consultores[idCounter % consultores.length];
      if (k === 0 && (idCounter % 4 === 0)) consultor = 'Everton'; // Mais dependente
      if (k === 0 && (idCounter % 4 === 2)) consultor = 'Kelvin'; // Mais dependente

      const isAdesao = (idCounter % 3 !== 0);
      const tipoDesconto: TipoDesconto = isAdesao ? 'Adesão' : 'Plano';

      let valorCheio = isAdesao ? 200 : (150 + (idCounter * 15) % 150);
      let descontoInput = isAdesao ? (25 + ((idCounter * 17) % 65)) : (5 + ((idCounter * 3) % 15));
      let valorDescontoCalculado = isAdesao ? descontoInput : (valorCheio * (descontoInput / 100));
      let percentualDesconto = isAdesao ? (descontoInput / valorCheio) * 100 : descontoInput;
      let valorFinal = valorCheio - valorDescontoCalculado;

      // Cria datas e horas com tempos de resposta realistas
      const dataSol = new Date(ano, mes, dia, 9 + (k * 2) % 8, 15 + (k * 10) % 40);
      
      // Simulação de SLA: alguns demoram 45min, outros 3h30, alguns 4h10
      const minutosSLA = 35 + ((idCounter * 47) % 230);
      const dataApr = new Date(dataSol.getTime() + minutosSLA * 60 * 1000);

      const status = idCounter % 9 === 0 ? 'Negado' : (idCounter % 13 === 0 ? 'Aguardando Aprovação' : 'Aprovado');

      lista.push({
        id: `sim-desc-${ano}${String(mes + 1).padStart(2, '0')}-${String(idCounter).padStart(3, '0')}`,
        dataHoraSolicitacao: dataSol.toISOString(),
        cliente: clientes[idCounter % clientes.length],
        supervisora,
        consultor,
        placa: placas[idCounter % placas.length],
        tipoDesconto,
        valorCheio,
        descontoInput,
        valorDescontoCalculado: Math.round(valorDescontoCalculado * 100) / 100,
        percentualDesconto: Math.round(percentualDesconto * 10) / 10,
        valorFinal: Math.round(valorFinal * 100) / 100,
        justificativa: isAdesao ? 'Cliente solicitou condição especial para fechar contrato no ato com 3 veículos.' : 'Negociação de renovação anual com plano corporativo.',
        status,
        dataHoraAprovacao: status !== 'Aguardando Aprovação' ? dataApr.toISOString() : undefined,
        parecer: status === 'Aprovado' ? 'Aprovado com base na política comercial vigente.' : (status === 'Negado' ? 'Percentual excede a margem permitida para este perfil.' : undefined),
        aprovador: 'Heder Santos (Gerente)',
        tipoRegistro: 'SolicitacaoSupervisao'
      });

      idCounter++;
    }
  }

  return lista;
}

/**
 * 1. CÁLCULO DE TAXA DE QUEIMA DE ORÇAMENTO (BURN RATE & PROJEÇÃO PREDITIVA)
 */
export function calcularBurnRate(solicitacoes: SolicitacaoDesconto[], mesAnoRef?: string): BurnRateAnalysis {
  const agora = new Date();
  const ano = mesAnoRef ? parseInt(mesAnoRef.split('-')[0], 10) : agora.getFullYear();
  const mesIdx = mesAnoRef ? parseInt(mesAnoRef.split('-')[1], 10) - 1 : agora.getMonth();

  const totalDiasMes = new Date(ano, mesIdx + 1, 0).getDate();
  const diaAtual = (mesAnoRef && mesAnoRef !== `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`) 
    ? totalDiasMes 
    : agora.getDate();

  const tetoMaximo = BUDGET_LIMITS.tetoTotalDepartamento; // R$ 900,00
  const ritmoIdealDiario = tetoMaximo / totalDiasMes; // ~R$ 30,00/dia

  // Agrupa os gastos aprovados por dia do mês
  const gastosPorDia: Record<number, number> = {};
  for (let d = 1; d <= totalDiasMes; d++) {
    gastosPorDia[d] = 0;
  }

  solicitacoes.forEach((sol) => {
    if (sol.status === 'Aprovado') {
      const dataRef = new Date(sol.dataHoraAprovacao || sol.dataHoraSolicitacao);
      if (dataRef.getFullYear() === ano && dataRef.getMonth() === mesIdx) {
        const dia = dataRef.getDate();
        if (gastosPorDia[dia] !== undefined) {
          gastosPorDia[dia] += (sol.valorDescontoCalculado || 0);
        }
      }
    }
  });

  // Monta curva de consumo real acumulado
  let acumuladoReal = 0;
  const pontos: BurnRatePonto[] = [];

  for (let d = 1; d <= totalDiasMes; d++) {
    const gastoDia = gastosPorDia[d] || 0;
    const ritmoIdealAcumulado = Math.round(ritmoIdealDiario * d * 100) / 100;

    if (d <= diaAtual) {
      acumuladoReal += gastoDia;
      pontos.push({
        dia: d,
        diaLabel: `Dia ${d}`,
        consumoReal: Math.round(acumuladoReal * 100) / 100,
        consumoProjetado: d === diaAtual ? Math.round(acumuladoReal * 100) / 100 : undefined,
        tetoMaximo,
        ritmoIdeal: ritmoIdealAcumulado,
        isHoje: d === diaAtual
      });
    } else {
      pontos.push({
        dia: d,
        diaLabel: `Dia ${d}`,
        tetoMaximo,
        ritmoIdeal: ritmoIdealAcumulado
      });
    }
  }

  const consumoAtual = Math.round(acumuladoReal * 100) / 100;
  const saldoRestante = Math.max(0, Math.round((tetoMaximo - consumoAtual) * 100) / 100);
  const diasDecorridos = Math.max(1, diaAtual);
  const burnRateDiario = Math.round((consumoAtual / diasDecorridos) * 100) / 100;

  // Projeção Linear até o fim do mês
  const diasRestantes = totalDiasMes - diaAtual;
  const projecaoFinalMes = Math.round((consumoAtual + (burnRateDiario * diasRestantes)) * 100) / 100;

  // Projeção de quando o saldo acaba: diaAtual + (saldoRestante / burnRateDiario)
  let diaEstimadoEsgotamento: number | null = null;
  if (burnRateDiario > 0 && consumoAtual < tetoMaximo) {
    const diasAteAcabar = saldoRestante / burnRateDiario;
    const diaCalc = Math.round(diaAtual + diasAteAcabar);
    if (diaCalc <= totalDiasMes) {
      diaEstimadoEsgotamento = diaCalc;
    }
  } else if (consumoAtual >= tetoMaximo) {
    diaEstimadoEsgotamento = diaAtual;
  }

  // Preenche a projeção pontilhada nos pontos futuros
  let acumuladoProjetado = consumoAtual;
  for (let i = diaAtual; i < totalDiasMes; i++) {
    acumuladoProjetado += burnRateDiario;
    pontos[i].consumoProjetado = Math.round(acumuladoProjetado * 100) / 100;
  }

  const percentualConsumido = Math.min(100, Math.round((consumoAtual / tetoMaximo) * 100));

  let statusQueima: 'Sustentável' | 'Atenção' | 'Crítico (Esgotamento Precoce)' = 'Sustentável';
  let mensagemExecutiva = consumoAtual === 0 
    ? 'Orçamento integral de R$ 900,00 disponível. Nenhuma concessão de desconto realizada no período. Sistema pronto para operação.'
    : `Ritmo controlado de R$ ${burnRateDiario.toFixed(2).replace('.', ',')}/dia. O saldo chegará ao fim do mês com folga orçamentária.`;

  if (projecaoFinalMes > tetoMaximo * 1.15 && consumoAtual > 0) {
    statusQueima = 'Crítico (Esgotamento Precoce)';
    mensagemExecutiva = `Alerta Crítico: No ritmo atual de R$ ${burnRateDiario.toFixed(2).replace('.', ',')}/dia, os R$ 900,00 vão acabar no Dia ${diaEstimadoEsgotamento || totalDiasMes}. Projeção de estouro de R$ ${(projecaoFinalMes - tetoMaximo).toFixed(2).replace('.', ',')}.`;
  } else if (projecaoFinalMes > tetoMaximo && consumoAtual > 0) {
    statusQueima = 'Atenção';
    mensagemExecutiva = `Atenção: Consumo ligeiramente acima da média sustentável (R$ ${burnRateDiario.toFixed(2).replace('.', ',')}/dia vs meta de R$ ${ritmoIdealDiario.toFixed(2).replace('.', ',')}/dia). O saldo acabará próximo ao Dia ${diaEstimadoEsgotamento || totalDiasMes}.`;
  }

  return {
    pontos,
    consumoAtual,
    saldoRestante,
    diasDecorridos,
    diasNoMes: totalDiasMes,
    diaAtual,
    burnRateDiario,
    burnRateIdeal: Math.round(ritmoIdealDiario * 100) / 100,
    projecaoFinalMes,
    diaEstimadoEsgotamento,
    statusQueima,
    percentualConsumido,
    mensagemExecutiva
  };
}

/**
 * 2. CÁLCULO DA MATRIZ DE RECORRÊNCIA (CONSULTOR x FREQUÊNCIA DE DESCONTO)
 */
export function calcularMatrizRecorrencia(solicitacoes: SolicitacaoDesconto[]): ConsultorRecorrencia[] {
  const mapaConsultores: Record<string, {
    supervisora: string;
    total: number;
    aprovadas: number;
    negadas: number;
    volumeReais: number;
  }> = {};

  // Inicializa todos os consultores de ambas as supervisoras
  Object.entries(HIERARQUIA_EQUIPES.supervisoras).forEach(([supervisora, consultores]) => {
    consultores.forEach((consultor) => {
      mapaConsultores[consultor] = {
        supervisora,
        total: 0,
        aprovadas: 0,
        negadas: 0,
        volumeReais: 0
      };
    });
  });

  // Agrega solicitações
  solicitacoes.forEach((sol) => {
    const c = sol.consultor;
    if (!mapaConsultores[c]) {
      mapaConsultores[c] = {
        supervisora: sol.supervisora,
        total: 0,
        aprovadas: 0,
        negadas: 0,
        volumeReais: 0
      };
    }

    mapaConsultores[c].total += 1;
    if (sol.status === 'Aprovado') {
      mapaConsultores[c].aprovadas += 1;
      mapaConsultores[c].volumeReais += (sol.valorDescontoCalculado || 0);
    } else if (sol.status === 'Negado') {
      mapaConsultores[c].negadas += 1;
    }
  });

  // Transforma em array e calcula índices de dependência
  const totalGeralSolicitacoes = Math.max(1, solicitacoes.length);

  const resultado: ConsultorRecorrencia[] = Object.entries(mapaConsultores).map(([nome, dados]) => {
    const ticketMedio = dados.aprovadas > 0 ? Math.round((dados.volumeReais / dados.aprovadas) * 100) / 100 : 0;
    
    // Frequência relativa dentro da equipe
    const freqPercentual = Math.round((dados.total / totalGeralSolicitacoes) * 100);

    let indiceDependencia: 'Baixo (Saudável)' | 'Moderado' | 'Alto (Risco)' | 'Crítico (Dependente)' = 'Baixo (Saudável)';
    let corNivel: 'verde' | 'amarelo' | 'laranja' | 'vermelho' = 'verde';
    let acaoRecomendada = 'Venda estruturada sem concessão excessiva. Parabéns pela sustentabilidade!';

    if (dados.total >= 6 || dados.volumeReais >= 200) {
      indiceDependencia = 'Crítico (Dependente)';
      corNivel = 'vermelho';
      acaoRecomendada = 'Urgente: Treinamento em Contorno de Objeções de Preço e Valor Percebido.';
    } else if (dados.total >= 4 || dados.volumeReais >= 120) {
      indiceDependencia = 'Alto (Risco)';
      corNivel = 'laranja';
      acaoRecomendada = 'Reforço em técnicas de negociação para evitar desconto como primeira opção.';
    } else if (dados.total >= 2 || dados.volumeReais >= 60) {
      indiceDependencia = 'Moderado';
      corNivel = 'amarelo';
      acaoRecomendada = 'Acompanhamento pontual da supervisão nos fechamentos.';
    }

    return {
      nome,
      supervisora: dados.supervisora,
      totalSolicitacoes: dados.total,
      solicitacoesAprovadas: dados.aprovadas,
      solicitacoesNegadas: dados.negadas,
      volumeTotalReais: Math.round(dados.volumeReais * 100) / 100,
      ticketMedioDesconto: ticketMedio,
      frequenciaDescontoPercentual: freqPercentual,
      indiceDependencia,
      corNivel,
      acaoRecomendada
    };
  });

  // Ordena pelos que mais solicitam (maior dependência primeiro)
  return resultado.sort((a, b) => b.volumeTotalReais - a.volumeTotalReais || b.totalSolicitacoes - a.totalSolicitacoes);
}

/**
 * 3. CÁLCULO DO INDICADOR DE RISCO DE SLA (TEMPO MÉDIO DE APROVAÇÃO)
 */
export function calcularRiscoSLA(solicitacoes: SolicitacaoDesconto[]): SLARiskAnalysis {
  const avaliadas = solicitacoes.filter((s) => s.status === 'Aprovado' || s.status === 'Negado');

  let somaMinutos = 0;
  let totalNoPrazo = 0; // <= 240 minutos (4 horas)
  let totalAtrasadas = 0; // > 240 minutos

  const minutosSupervisora: Record<string, { totalMin: number; count: number }> = {
    'Débora Rodrigues': { totalMin: 0, count: 0 }
  };

  const faixas = {
    ate1h: 0,
    de1a2h: 0,
    de2a4h: 0,
    acima4h: 0
  };

  avaliadas.forEach((sol) => {
    if (sol.dataHoraSolicitacao && sol.dataHoraAprovacao) {
      const tSol = new Date(sol.dataHoraSolicitacao).getTime();
      const tApr = new Date(sol.dataHoraAprovacao).getTime();
      let diffMin = Math.max(1, Math.round((tApr - tSol) / (1000 * 60)));

      somaMinutos += diffMin;

      if (diffMin <= 240) {
        totalNoPrazo++;
      } else {
        totalAtrasadas++;
      }

      if (diffMin <= 60) faixas.ate1h++;
      else if (diffMin <= 120) faixas.de1a2h++;
      else if (diffMin <= 240) faixas.de2a4h++;
      else faixas.acima4h++;

      const sup = sol.supervisora;
      if (minutosSupervisora[sup]) {
        minutosSupervisora[sup].totalMin += diffMin;
        minutosSupervisora[sup].count += 1;
      }
    }
  });

  const countTotal = Math.max(1, avaliadas.length);
  const mediaMin = avaliadas.length > 0 ? Math.round(somaMinutos / avaliadas.length) : 0;
  const mediaHoras = Math.round((mediaMin / 60) * 10) / 10;

  const horasInt = Math.floor(mediaMin / 60);
  const minRest = mediaMin % 60;
  const tempoMedioFormatado = avaliadas.length > 0 ? `${horasInt}h ${String(minRest).padStart(2, '0')}m` : '0h 00m';

  let statusSLA: 'Excelente' | 'Normal' | 'Alerta Amarelo (Próximo a 4h)' | 'Crítico (Estouro de SLA)' = 'Excelente';
  let corAlerta: 'verde' | 'amarelo' | 'vermelho' = 'verde';

  if (avaliadas.length > 0) {
    if (mediaMin >= 240) {
      statusSLA = 'Crítico (Estouro de SLA)';
      corAlerta = 'vermelho';
    } else if (mediaMin >= 180) { // a partir de 3h (próximo de 4h)
      statusSLA = 'Alerta Amarelo (Próximo a 4h)';
      corAlerta = 'amarelo';
    } else if (mediaMin >= 120) {
      statusSLA = 'Normal';
      corAlerta = 'amarelo';
    }
  }

  const percentualNoPrazo = avaliadas.length > 0 ? Math.round((totalNoPrazo / avaliadas.length) * 100) : 100;

  const mediaPorSupervisora = Object.entries(minutosSupervisora).map(([supervisora, dados]) => ({
    supervisora,
    tempoMedioMinutos: dados.count > 0 ? Math.round(dados.totalMin / dados.count) : 0,
    tempoMedioHoras: dados.count > 0 ? Math.round((dados.totalMin / dados.count / 60) * 10) / 10 : 0
  }));

  const distribuicaoTempo = [
    { faixa: 'Até 1h (Ágil)', quantidade: faixas.ate1h, percentual: Math.round((faixas.ate1h / countTotal) * 100) },
    { faixa: '1h a 2h (Bom)', quantidade: faixas.de1a2h, percentual: Math.round((faixas.de1a2h / countTotal) * 100) },
    { faixa: '2h a 4h (Atenção)', quantidade: faixas.de2a4h, percentual: Math.round((faixas.de2a4h / countTotal) * 100) },
    { faixa: '> 4h (Estouro SLA)', quantidade: faixas.acima4h, percentual: Math.round((faixas.acima4h / countTotal) * 100) }
  ];

  return {
    tempoMedioMinutos: mediaMin,
    tempoMedioHoras: mediaHoras,
    tempoMedioFormatado,
    statusSLA,
    corAlerta,
    totalAvaliadas: avaliadas.length,
    totalNoPrazo,
    totalAtrasadas,
    percentualNoPrazo,
    mediaPorSupervisora,
    distribuicaoTempo
  };
}

/**
 * 4. CÁLCULO DA CONVERSÃO E IMPACTO POR TIPO DE DESCONTO (ADESÃO vs PLANO)
 */
export function calcularConversaoTipoDesconto(solicitacoes: SolicitacaoDesconto[]): ConversaoTipoDescontoAnalysis {
  let gastoAdesao = 0;
  let gastoPlano = 0;
  let qtdAdesao = 0;
  let qtdPlano = 0;

  solicitacoes.forEach((sol) => {
    if (sol.status === 'Aprovado') {
      const valor = sol.valorDescontoCalculado || 0;
      if (sol.tipoDesconto === 'Adesão') {
        gastoAdesao += valor;
        qtdAdesao++;
      } else {
        gastoPlano += valor;
        qtdPlano++;
      }
    }
  });

  const totalGeral = gastoAdesao + gastoPlano;
  const percAdesao = totalGeral > 0 ? Math.round((gastoAdesao / totalGeral) * 100) : 0;
  const percPlano = totalGeral > 0 ? Math.round((gastoPlano / totalGeral) * 100) : 0;

  const ticketMedioAdesao = qtdAdesao > 0 ? Math.round((gastoAdesao / qtdAdesao) * 100) / 100 : 0;
  const ticketMedioPlano = qtdPlano > 0 ? Math.round((gastoPlano / qtdPlano) * 100) / 100 : 0;

  const modalidadeMaisCritica: TipoDesconto = gastoAdesao >= gastoPlano ? 'Adesão' : 'Plano';

  let diagnosticoImpacto = '';
  if (totalGeral === 0) {
    diagnosticoImpacto = 'Nenhuma concessão de desconto aprovada no período. O ambiente está 100% limpo e pronto para registrar as primeiras solicitações.';
  } else if (gastoAdesao > gastoPlano) {
    diagnosticoImpacto = `A concessão de descontos em Adesão representa ${percAdesao}% do montante financeiro concedido (R$ ${gastoAdesao.toFixed(2).replace('.', ',')}). É a principal fonte de renúncia de receita imediata no caixa de entrada.`;
  } else {
    diagnosticoImpacto = `A concessão de descontos no Plano Mensal representa ${percPlano}% do impacto financeiro (R$ ${gastoPlano.toFixed(2).replace('.', ',')}). Atenção: Desconto em plano compromete a receita recorrente (MRR) ao longo de todo o ciclo de vida do cliente.`;
  }

  const dadosPizzaVolume = [
    { name: 'Desconto Adesão', value: qtdAdesao, color: '#005b2e' },
    { name: 'Desconto Plano', value: qtdPlano, color: '#0284c7' }
  ];

  const dadosPizzaFinanceiro = [
    { name: 'Impacto Adesão (R$)', value: Math.round(gastoAdesao * 100) / 100, color: '#005b2e', percentual: percAdesao },
    { name: 'Impacto Plano (R$)', value: Math.round(gastoPlano * 100) / 100, color: '#0284c7', percentual: percPlano }
  ];

  return {
    dadosPizzaVolume,
    dadosPizzaFinanceiro,
    totalGastoAdesao: Math.round(gastoAdesao * 100) / 100,
    totalGastoPlano: Math.round(gastoPlano * 100) / 100,
    totalGastoGeral: Math.round(totalGeral * 100) / 100,
    percentualAdesao: percAdesao,
    percentualPlano: percPlano,
    qtdAdesao,
    qtdPlano,
    ticketMedioAdesao,
    ticketMedioPlano,
    diagnosticoImpacto,
    modalidadeMaisCritica
  };
}
