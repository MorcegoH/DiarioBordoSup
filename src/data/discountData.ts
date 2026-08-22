/**
 * @file src/data/discountData.ts
 * @description Dados e constantes de apoio para o módulo de Solicitações de Desconto.
 */

import { SolicitacaoDesconto } from '../types';

export const HIERARQUIA_EQUIPES = {
  gerente: 'Heder Santos',
  supervisoras: {
    'Débora Rodrigues': [
      'Aila',
      'Auryane',
      'Charlene',
      'Erick',
      'Everton',
      'Felipe',
      'Gabriela',
      'Hevely',
      'Hillary',
      'Kelvin',
      'Kelvyn',
      'Naderson',
      'Roney',
      'Rute',
      'Thalia'
    ]
  }
} as const;

export const BUDGET_LIMITS = {
  tetoTotalDepartamento: 900.0,
  tetoSupervisoras: {
    'Débora Rodrigues': 700.0
  },
  reservaGerente: 200.0,
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
 * Mock inicial limpo para uso em produção (inicia sem dados de teste)
 */
export const INITIAL_MOCK_DESCONTOS: SolicitacaoDesconto[] = [];

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
