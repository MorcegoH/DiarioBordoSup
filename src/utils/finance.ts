/**
 * @file src/utils/finance.ts
 * @description Módulo de cálculos financeiros de alta precisão com prevenção de erros de ponto flutuante IEEE 754.
 * Centraliza as regras de negócio de Adesão (fixo R$ 200,00) e Plano Mensal (valor digitável com teto de 20%).
 */

import { BUDGET_LIMITS } from '../data/discountData';

/**
 * Converte valor em Reais para Centavos inteiros evitando bugs de ponto flutuante
 */
export function toCents(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Converte centavos inteiros de volta para Reais com 2 casas decimais
 */
export function fromCents(cents: number): number {
  if (isNaN(cents) || !isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/**
 * Formata um valor numérico para o padrão de moeda brasileira BRL (ex: R$ 1.250,50)
 */
export function formatarMoedaBRL(val: number): string {
  const safeVal = isNaN(val) ? 0 : val;
  return safeVal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formata um percentual numérico no padrão brasileiro (ex: 15,5%)
 */
export function formatarPercentual(perc: number, casasDecimais: number = 1): string {
  const safePerc = isNaN(perc) ? 0 : perc;
  return `${safePerc.toFixed(casasDecimais).replace('.', ',')}%`;
}

/**
 * Normaliza e sanitiza valores monetários ou numéricos vindos de inputs (suporta vírgula e ponto)
 */
export function parseInputNumber(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : raw;
  }
  if (!raw) return 0;
  const normalized = String(raw)
    .replace(/[^\d.,-]/g, '')
    .replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export interface ResultadoCalculoFinanceiro {
  valorCheio: number;
  descontoInput: number;
  valorDescontoCalculado: number;
  percentualDesconto: number;
  valorFinal: number;
  excedeTeto: boolean;
  mensagemErroTeto: string;
}

/**
 * Calcula desconto para a modalidade Adesão:
 * - Valor Cheio: R$ 200,00 fixo e inalterável
 * - Desconto informado em R$ (pode ir de R$ 0,00 até R$ 200,00)
 */
export function calcularDescontoAdesao(descontoInputRaw: string | number): ResultadoCalculoFinanceiro {
  const valorCheioCents = toCents(BUDGET_LIMITS.valorAdesaoPadrao); // 20000 centavos
  const inputNum = parseInputNumber(descontoInputRaw);
  const inputCents = toCents(inputNum);

  let excedeTeto = false;
  let mensagemErroTeto = '';

  if (inputCents > valorCheioCents) {
    excedeTeto = true;
    mensagemErroTeto = `O desconto de Adesão não pode ultrapassar o valor total de ${formatarMoedaBRL(BUDGET_LIMITS.valorAdesaoPadrao)}.`;
  } else if (inputCents < 0) {
    excedeTeto = true;
    mensagemErroTeto = 'O valor do desconto não pode ser negativo.';
  }

  const descontoValidoCents = Math.max(0, Math.min(valorCheioCents, inputCents));
  const valorFinalCents = Math.max(0, valorCheioCents - descontoValidoCents);
  const percentual = valorCheioCents > 0 ? (descontoValidoCents / valorCheioCents) * 100 : 0;

  return {
    valorCheio: fromCents(valorCheioCents),
    descontoInput: inputNum,
    valorDescontoCalculado: fromCents(descontoValidoCents),
    percentualDesconto: Number(percentual.toFixed(2)),
    valorFinal: fromCents(valorFinalCents),
    excedeTeto,
    mensagemErroTeto
  };
}

/**
 * Calcula desconto para a modalidade Plano Mensal:
 * - Valor Cheio: Digitável pelo usuário (ex: R$ 150,00)
 * - Desconto informado em % (Teto Máximo estrito: 20,0%)
 */
export function calcularDescontoPlano(
  valorCheioRaw: string | number,
  percentualDescontoRaw: string | number
): ResultadoCalculoFinanceiro {
  const valorCheioNum = Math.max(0, parseInputNumber(valorCheioRaw));
  const valorCheioCents = toCents(valorCheioNum);
  const percentualNum = parseInputNumber(percentualDescontoRaw);

  let excedeTeto = false;
  let mensagemErroTeto = '';

  if (percentualNum > BUDGET_LIMITS.tetoMaximoPercentualDesconto) {
    excedeTeto = true;
    mensagemErroTeto = `Teto máximo de 20% excedido no Plano Mensal! O percentual solicitado (${formatarPercentual(percentualNum)}) é superior ao limite permitido de 20,0%.`;
  } else if (percentualNum < 0) {
    excedeTeto = true;
    mensagemErroTeto = 'O percentual de desconto não pode ser negativo.';
  }

  const percentualLimitado = Math.max(0, percentualNum);
  // Cálculo em centavos para evitar dízimas e imprecisões
  const descontoCents = Math.round((valorCheioCents * percentualLimitado) / 100);
  const valorFinalCents = Math.max(0, valorCheioCents - descontoCents);

  return {
    valorCheio: fromCents(valorCheioCents),
    descontoInput: percentualNum,
    valorDescontoCalculado: fromCents(descontoCents),
    percentualDesconto: Number(percentualLimitado.toFixed(2)),
    valorFinal: fromCents(valorFinalCents),
    excedeTeto,
    mensagemErroTeto
  };
}
