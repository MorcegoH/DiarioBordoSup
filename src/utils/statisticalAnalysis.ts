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

  // Contagem por categoria otimizada
  const counts: Record<string, number> = {
    'Sistemas & Ferramentas': 0,
    'Qualidade de Leads & Mídia': 0,
    'Processos & SLA': 0,
    'Pessoas & Performance': 0,
    'Comercial & Objeções': 0
  };

  for (let i = 0; i < ocorrencias.length; i++) {
    const cat = ocorrencias[i].categoria;
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const values = Object.values(counts);
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values, mean);

  const results: AnomaliaZScore[] = [];
  const entries = Object.entries(counts);

  for (let i = 0; i < entries.length; i++) {
    const [categoria, quantidade] = entries[i];
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

    results.push({
      categoria,
      quantidade,
      mediaEsperada: Number(mean.toFixed(1)),
      desvioPadrao: Number(stdDev.toFixed(2)),
      zScore,
      isOutlier,
      nivelAlerta,
      mensagem
    });
  }

  return results.sort((a, b) => b.zScore - a.zScore);
}

/**
 * Interface com resultado detalhado do cálculo de horas úteis de trabalho e SLA de 24h úteis.
 */
export interface WorkingHoursSlaResult {
  workingHours: number; // Total de horas úteis decimais (ex: 14.5)
  workingHoursFormatted: string; // Ex: "14h 30m"
  isAtrasado: boolean; // Verdadeiro se ultrapassar 24.0 horas úteis de trabalho
  horasExcedentes: number; // Quantidade de horas úteis além das 24h
  statusSla: 'no_prazo' | 'atrasado' | 'concluido_no_prazo' | 'concluido_atrasado';
  mensagemSla: string;
}

/**
 * Calcula precisamente as horas de trabalho úteis decorridas entre duas datas,
 * considerando a jornada operacional:
 * - Segunda a Sexta: das 08:00 às 18:00 (10 horas por dia)
 * - Sábados: das 08:00 às 12:00 (4 horas por sábado)
 * - Domingos e horários noturnos: 0 horas
 * 
 * Se ultrapassar 24 horas úteis de trabalho, é classificado como Atraso.
 */
export function calculateWorkingHoursSla(
  startDateISO: string,
  endDateISO?: string,
  isConcluido: boolean = false
): WorkingHoursSlaResult {
  if (!startDateISO) {
    return {
      workingHours: 0,
      workingHoursFormatted: '0h 00m',
      isAtrasado: false,
      horasExcedentes: 0,
      statusSla: isConcluido ? 'concluido_no_prazo' : 'no_prazo',
      mensagemSla: 'Data de início inválida'
    };
  }

  const start = new Date(startDateISO);
  const end = endDateISO ? new Date(endDateISO) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return {
      workingHours: 0,
      workingHoursFormatted: '0h 00m',
      isAtrasado: false,
      horasExcedentes: 0,
      statusSla: isConcluido ? 'concluido_no_prazo' : 'no_prazo',
      mensagemSla: isConcluido ? 'Concluído' : 'Recém-criado'
    };
  }

  let totalWorkMs = 0;

  // Iterar dia a dia desde o início até o fim
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const finalDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current.getTime() <= finalDay.getTime()) {
    const dayOfWeek = current.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    let openHour = 8;
    let closeHour = 18;
    let isWorkDay = true;

    if (dayOfWeek === 0) {
      // Domingo: não é dia útil
      isWorkDay = false;
    } else if (dayOfWeek === 6) {
      // Sábado: das 08:00 às 12:00 (4 horas)
      openHour = 8;
      closeHour = 12;
    } else {
      // Segunda a Sexta: das 08:00 às 18:00 (10 horas)
      openHour = 8;
      closeHour = 18;
    }

    if (isWorkDay) {
      const windowStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), openHour, 0, 0, 0).getTime();
      const windowEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), closeHour, 0, 0, 0).getTime();

      const effectiveStart = Math.max(windowStart, start.getTime());
      const effectiveEnd = Math.min(windowEnd, end.getTime());

      if (effectiveEnd > effectiveStart) {
        totalWorkMs += (effectiveEnd - effectiveStart);
      }
    }

    // Avançar para o próximo dia
    current.setDate(current.getDate() + 1);
  }

  const totalMinutes = Math.floor(totalWorkMs / (1000 * 60));
  const hoursDecimal = Number((totalMinutes / 60).toFixed(1));
  const displayHours = Math.floor(totalMinutes / 60);
  const displayMins = totalMinutes % 60;
  const formattedTime = `${displayHours}h ${displayMins.toString().padStart(2, '0')}m`;

  const SLA_LIMIT_HOURS = 24.0;
  const isAtrasado = hoursDecimal > SLA_LIMIT_HOURS;
  const horasExcedentes = isAtrasado ? Number((hoursDecimal - SLA_LIMIT_HOURS).toFixed(1)) : 0;

  let statusSla: 'no_prazo' | 'atrasado' | 'concluido_no_prazo' | 'concluido_atrasado';
  let mensagemSla = '';

  if (isConcluido) {
    if (isAtrasado) {
      statusSla = 'concluido_atrasado';
      mensagemSla = `Concluído com atraso (+${horasExcedentes}h acima do limite de 24h úteis)`;
    } else {
      statusSla = 'concluido_no_prazo';
      mensagemSla = `Concluído no prazo (${formattedTime} de jornada útil)`;
    }
  } else {
    if (isAtrasado) {
      statusSla = 'atrasado';
      mensagemSla = `ATRASADO: ${formattedTime} úteis decorridas (+${horasExcedentes}h acima do limite de 24h)`;
    } else {
      statusSla = 'no_prazo';
      const restantes = Number((SLA_LIMIT_HOURS - hoursDecimal).toFixed(1));
      mensagemSla = `No prazo: ${formattedTime} úteis decorridas (${restantes}h restantes)`;
    }
  }

  return {
    workingHours: hoursDecimal,
    workingHoursFormatted: formattedTime,
    isAtrasado,
    horasExcedentes,
    statusSla,
    mensagemSla
  };
}

/**
 * Exporta os dados de Fechamentos de Turno para um arquivo CSV estruturado.
 */
export function exportPassagensToCSV(passagens: any[], filename = 'fechamentos_de_turno.csv') {
  if (!passagens || passagens.length === 0) {
    alert('Nenhum fechamento de turno disponível para exportação.');
    return;
  }

  const headers = [
    'ID',
    'Data de Referência',
    'Supervisor Responsável',
    'O Que Funcionou Bem',
    'O Que Ficou Pendente',
    'Data/Hora de Criação',
    'Status',
    'Data/Hora de Conclusão',
    'Horas Úteis de Trabalho',
    'Situação do SLA (Limite 24h)',
    'Solução / Conclusão Aplicada',
    'Responsável pela Conclusão'
  ];

  const rows = passagens.map((p) => {
    const isConcluido = p.status === 'Concluído' || Boolean(p.dataHoraConclusao);
    const sla = calculateWorkingHoursSla(p.dataHoraCriacao, p.dataHoraConclusao, isConcluido);

    return [
      `"${p.id}"`,
      `"${p.data}"`,
      `"${(p.supervisor || '').replace(/"/g, '""')}"`,
      `"${(p.oQueFuncionou || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(p.oQueFicaPendente || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${formatBrazilianDate(p.dataHoraCriacao)}"`,
      `"${isConcluido ? 'Concluído' : 'Pendente'}"`,
      `"${p.dataHoraConclusao ? formatBrazilianDate(p.dataHoraConclusao) : 'Não concluído'}"`,
      `"${sla.workingHoursFormatted} (${sla.workingHours}h úteis)"`,
      `"${sla.mensagemSla.replace(/"/g, '""')}"`,
      `"${(p.observacaoConclusao || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(p.responsavelConclusao || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
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
