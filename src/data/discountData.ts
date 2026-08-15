/**
 * @file src/data/discountData.ts
 * @description Dados e constantes de apoio para o módulo de Solicitações de Desconto.
 */

import { SolicitacaoDesconto } from '../types';

export const HIERARQUIA_EQUIPES = {
  gerente: 'Heder Santos',
  supervisoras: {
    'Débora Rodrigues': [
      'Auryane',
      'Charlene',
      'Erick',
      'Everton',
      'Hevely',
      'Rute',
      'Thalia'
    ],
    'Marília Farias': [
      'Aila',
      'Felipe',
      'Gabriela',
      'Hillary',
      'Kelvin',
      'Roney',
      'Naderson',
      'Kelvyn'
    ]
  }
} as const;

export const BUDGET_LIMITS = {
  tetoTotalDepartamento: 900.0,
  tetoSupervisoras: {
    'Débora Rodrigues': 400.0,
    'Marília Farias': 400.0
  },
  reservaGerente: 100.0,
  tetoMaximoPercentualDesconto: 20.0, // 20%
  valorAdesaoPadrao: 200.0 // R$ 200,00
} as const;

/**
 * Validação de placa de veículo:
 * - Padrão Antigo: ABC-1234 ou ABC1234
 * - Padrão Mercosul: ABC1D23 ou ABC-1D23
 */
export function validarPlacaVeiculo(placaRaw: string): {
  valida: boolean;
  formato: 'Mercosul' | 'Antigo' | 'Invalido';
  formatada: string;
} {
  if (!placaRaw) return { valida: false, formato: 'Invalido', formatada: '' };
  
  // Limpar caracteres não alfanuméricos e colocar em maiúsculas
  const limpa = placaRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (limpa.length !== 7) {
    return { valida: false, formato: 'Invalido', formatada: placaRaw.toUpperCase() };
  }

  // Regex Padrão Antigo: 3 letras + 4 números (ex: ABC1234 -> ABC-1234)
  const regexAntigo = /^[A-Z]{3}[0-9]{4}$/;
  if (regexAntigo.test(limpa)) {
    return {
      valida: true,
      formato: 'Antigo',
      formatada: `${limpa.slice(0, 3)}-${limpa.slice(3)}`
    };
  }

  // Regex Mercosul: 3 letras + 1 número + 1 letra + 2 números (ex: ABC1D23)
  const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  if (regexMercosul.test(limpa)) {
    return {
      valida: true,
      formato: 'Mercosul',
      formatada: limpa
    };
  }

  return { valida: false, formato: 'Invalido', formatada: limpa };
}

/**
 * Mock inicial realista de solicitações de desconto para visualização imediata
 */
export const INITIAL_MOCK_DESCONTOS: SolicitacaoDesconto[] = [
  {
    id: 'desc-20260815-01',
    dataHoraSolicitacao: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min atrás
    cliente: 'Transportadora Silva & Filhos Ltda',
    supervisora: 'Débora Rodrigues',
    consultor: 'Erick',
    placa: 'BRA2E19',
    tipoDesconto: 'Adesão',
    valorCheio: 200.0,
    descontoInput: 40.0, // R$ 40
    valorDescontoCalculado: 40.0,
    percentualDesconto: 20.0,
    valorFinal: 160.0,
    justificativa: 'Cliente frotista fechando contrato para 5 veículos simultâneos. Solicitado desconto teto de 20% na taxa de adesão da primeira placa.',
    status: 'Aguardando Aprovação'
  },
  {
    id: 'desc-20260815-02',
    dataHoraSolicitacao: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h atrás
    cliente: 'Marcos Vinícius de Oliveira',
    supervisora: 'Marília Farias',
    consultor: 'Gabriela',
    placa: 'KXZ-4821',
    tipoDesconto: 'Plano',
    valorCheio: 150.0,
    descontoInput: 15.0, // 15%
    valorDescontoCalculado: 22.5,
    percentualDesconto: 15.0,
    valorFinal: 127.5,
    justificativa: 'Cliente alegou proposta concorrente agressiva no plano de rastreamento com seguro. Concedido 15% para retenção no fechamento.',
    status: 'Aguardando Aprovação'
  },
  {
    id: 'desc-20260814-03',
    dataHoraSolicitacao: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    cliente: 'Auto Elétrica e Mecânica Central',
    supervisora: 'Débora Rodrigues',
    consultor: 'Hevely',
    placa: 'RIO1A24',
    tipoDesconto: 'Adesão',
    valorCheio: 200.0,
    descontoInput: 30.0,
    valorDescontoCalculado: 30.0,
    percentualDesconto: 15.0,
    valorFinal: 170.0,
    justificativa: 'Parceiro comercial indicando novas contas corporativas.',
    status: 'Aprovado',
    dataHoraAprovacao: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
    aprovador: 'Heder Santos (Gerente)',
    parecer: 'Autorizado conforme política de expansão de parcerias B2B. Aprovado pelo teto do time.'
  },
  {
    id: 'desc-20260814-04',
    dataHoraSolicitacao: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    cliente: 'Distribuidora Aliança Norte',
    supervisora: 'Marília Farias',
    consultor: 'Kelvin',
    placa: 'QPB-9912',
    tipoDesconto: 'Plano',
    valorCheio: 180.0,
    descontoInput: 18.0,
    valorDescontoCalculado: 32.4,
    percentualDesconto: 18.0,
    valorFinal: 147.6,
    justificativa: 'Fechamento de plano anual frotista.',
    status: 'Aprovado',
    dataHoraAprovacao: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    aprovador: 'Heder Santos (Gerente)',
    parecer: 'Autorizado com base no volume anual.'
  },
  {
    id: 'desc-20260813-05',
    dataHoraSolicitacao: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    cliente: 'Lucas Pereira Guimarães',
    supervisora: 'Marília Farias',
    consultor: 'Felipe',
    placa: 'MNO-3120',
    tipoDesconto: 'Plano',
    valorCheio: 110.0,
    descontoInput: 20.0,
    valorDescontoCalculado: 22.0,
    percentualDesconto: 20.0,
    valorFinal: 88.0,
    justificativa: 'Cliente pessoa física solicitou desconto máximo sem histórico.',
    status: 'Negado',
    dataHoraAprovacao: new Date(Date.now() - 1000 * 60 * 60 * 38).toISOString(),
    aprovador: 'Heder Santos (Gerente)',
    parecer: 'Reprovado: Desconto de 20% para pessoa física em plano avulso não justificado comercialmente. Manter valor cheio ou negociar adesão.'
  }
];

/**
 * Função para exportar os dados das solicitações de desconto em formato CSV limpo
 */
export function exportarDescontosCSV(solicitacoes: SolicitacaoDesconto[]): void {
  if (!solicitacoes || solicitacoes.length === 0) {
    alert('Nenhuma solicitação de desconto disponível para exportação.');
    return;
  }

  // Colunas solicitadas:
  // Data/Hora Solicitação, Supervisora, Consultor, Cliente, Placa, Tipo (Adesão/Plano), Valor Cheio, Valor Desconto, Status (Aprovado/Negado), Data/Hora Aprovação, Parecer
  const cabecalhos = [
    'Data/Hora Solicitação',
    'Supervisora',
    'Consultor',
    'Cliente',
    'Placa',
    'Tipo (Adesão/Plano)',
    'Valor Cheio (R$)',
    'Valor Desconto (R$)',
    '% Desconto',
    'Valor Final (R$)',
    'Status',
    'Data/Hora Decisão',
    'Aprovador',
    'Justificativa / Parecer'
  ];

  const linhas = solicitacoes.map((item) => {
    const dataSol = item.dataHoraSolicitacao 
      ? new Date(item.dataHoraSolicitacao).toLocaleString('pt-BR') 
      : '';
    const dataApr = item.dataHoraAprovacao 
      ? new Date(item.dataHoraAprovacao).toLocaleString('pt-BR') 
      : '—';
    const parecerOuJust = item.parecer 
      ? `[PARECER]: ${item.parecer} | [JUSTIFICATIVA]: ${item.justificativa}` 
      : item.justificativa;

    return [
      `"${dataSol}"`,
      `"${item.supervisora}"`,
      `"${item.consultor}"`,
      `"${item.cliente.replace(/"/g, '""')}"`,
      `"${item.placa}"`,
      `"${item.tipoDesconto}"`,
      item.valorCheio.toFixed(2).replace('.', ','),
      item.valorDescontoCalculado.toFixed(2).replace('.', ','),
      `${item.percentualDesconto.toFixed(1).replace('.', ',')}%`,
      item.valorFinal.toFixed(2).replace('.', ','),
      `"${item.status}"`,
      `"${dataApr}"`,
      `"${item.aprovador || '—'}"`,
      `"${parecerOuJust.replace(/"/g, '""')}"`
    ].join(';');
  });

  const conteudoCSV = '\uFEFF' + [cabecalhos.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_solicitacoes_desconto_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
