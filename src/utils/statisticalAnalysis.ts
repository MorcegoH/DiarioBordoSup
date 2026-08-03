/**
 * @file src/utils/statisticalAnalysis.ts
 * @description Módulo de Engenharia de Dados e Análise Estatística Avançada.
 * Aplica técnicas de Z-Score para detecção de anomalias operacionais,
 * bem como utilitários de limpeza programática de dados.
 */

import { Ocorrencia, Categoria, AnomaliaZScore } from '../types';

/**
 * Limpa e padroniza strings de texto sujas de planilhas/entradas brutas.
 * Remove múltiplos espaços, caracteres especiais ocultos e limpa espaços nas pontas.
 * 
 * @param text - Texto bruto a ser higienizado
 * @returns Texto limpo e formatado
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]+/g, ' ') // Substitui quebras de linha e tabs por espaço
    .replace(/\s+/g, ' ')       // Reduz múltiplos espaços para um único
    .trim();
}

/**
 * Separa campos compostos de planilhas operacionais (ex: "Sistemas - Instabilidade VoIP").
 * 
 * @param compoundString - String com delimitadores (-, :, /)
 * @returns Par contendo Categoria e Detalhe
 */
export function parseCompoundCategory(compoundString: string): { categoria: string; detalhe: string } {
  const clean = sanitizeText(compoundString);
  const parts = clean.split(/[-:\/]/);
  
  if (parts.length > 1) {
    return {
      categoria: parts[0].trim(),
      detalhe: parts.slice(1).join(' - ').trim()
    };
  }
  
  return { categoria: clean, detalhe: '' };
}

/**
 * Calcula a média aritmética de uma lista de números.
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calcula o Desvio Padrão populacional de um conjunto de valores.
 */
export function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Aplica o cálculo do Z-Score para detectar anomalias no volume de ocorrências por categoria.
 * Z = (X - Média) / Desvio_Padrão
 * 
 * Se Z > 1.5: Atenção (Pico acima da curva esperada)
 * Se Z > 2.0: Anomalia Crítica (Desvio severo na operação)
 * 
 * @param ocorrencias - Lista completa de ocorrências registradas
 * @returns Lista de análises de anomalia por categoria
 */
export function detectCategoryAnomalies(ocorrencias: Ocorrencia[]): AnomaliaZScore[] {
  const categoriasPossiveis: Categoria[] = [
    'Sistemas & Ferramentas',
    'Qualidade de Leads & Mídia',
    'Processos & SLA',
    'Pessoas & Performance',
    'Comercial & Objeções'
  ];

  // Contagem por categoria
  const counts: Record<string, number> = {};
  categoriasPossiveis.forEach(cat => counts[cat] = 0);

  ocorrencias.forEach(oc => {
    if (counts[oc.categoria] !== undefined) {
      counts[oc.categoria]++;
    } else {
      counts[oc.categoria] = (counts[oc.categoria] || 0) + 1;
    }
  });

  const values = Object.values(counts);
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values, mean);

  const results: AnomaliaZScore[] = Object.entries(counts).map(([categoria, quantidade]) => {
    // Se o desvio padrão for zero (todos os valores iguais), Z-score é 0
    const zScore = stdDev === 0 ? 0 : Number(((quantidade - mean) / stdDev).toFixed(2));
    
    let nivelAlerta: 'Normal' | 'Atenção' | 'Anomalia Crítica' = 'Normal';
    let isOutlier = false;
    let mensagem = 'Volume dentro da margem operacional esperada.';

    if (zScore >= 2.0) {
      isOutlier = true;
      nivelAlerta = 'Anomalia Crítica';
      mensagem = `ALERTA CRÍTICO: Volume de ocorrências (${quantidade}) ultrapassa 2.0 desvios padrão da média (${mean.toFixed(1)}). Requer intervenção imediata da Supervisão!`;
    } else if (zScore >= 1.2) {
      isOutlier = true;
      nivelAlerta = 'Atenção';
      mensagem = `ATENÇÃO: Desvio moderado detectado (${zScore} desvios acima da média). Acompanhar operação.`;
    }

    return {
      categoria,
      quantidade,
      mediaEsperada: Number(mean.toFixed(1)),
      desvioPadrao: Number(stdDev.toFixed(2)),
      zScore,
      isOutlier,
      nivelAlerta,
      mensagem
    };
  });

  return results.sort((a, b) => b.zScore - a.zScore);
}

/**
 * Formata data em padrão brasileiro elegante (DD/MM/YYYY às HH:mm).
 */
export function formatBrazilianDate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return isoDateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return isoDateString;
  }
}

/**
 * Exporta os dados de ocorrências sanitizados para um arquivo CSV estruturado.
 * Inclui o cabeçalho UTF-8 BOM (\uFEFF) para garantir abertura perfeita em Excel/Google Sheets.
 */
export function exportToCSV(ocorrencias: Ocorrencia[], filename = 'ocorrencias_inside_sales.csv') {
  if (!ocorrencias || ocorrencias.length === 0) {
    alert('Nenhuma ocorrência disponível para exportação.');
    return;
  }

  const headers = ['ID', 'Data/Hora', 'Supervisor', 'Categoria', 'Impacto', 'Status', 'Duração (Min)', 'Descrição', 'Ação Tomada'];
  
  const rows = ocorrencias.map(oc => [
    `"${oc.id}"`,
    `"${formatBrazilianDate(oc.dataHora)}"`,
    `"${oc.supervisor.replace(/"/g, '""')}"`,
    `"${oc.categoria.replace(/"/g, '""')}"`,
    `"${oc.impacto}"`,
    `"${oc.status}"`,
    `"${oc.duracaoMinutos || 0}"`,
    `"${oc.descricao.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    `"${oc.acaoTomada.replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
