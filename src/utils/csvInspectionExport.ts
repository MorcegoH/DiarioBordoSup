/**
 * @file src/utils/csvInspectionExport.ts
 * @description Utilitário de exportação para Excel/CSV dos registros de Solicitações de Vistoria.
 */

import { SolicitacaoVistoria } from '../types';

export function exportarVistoriasCSV(vistorias: SolicitacaoVistoria[]): void {
  if (!vistorias || vistorias.length === 0) {
    alert('Nenhuma solicitação de vistoria disponível para exportação.');
    return;
  }

  const cabecalhos = [
    'ID',
    'Data/Hora Solicitação',
    'Data Agendada',
    'Horário Agendado',
    'Vistoriador',
    'Nome do Associado',
    'Contato / Telefone',
    'Modelo do Carro',
    'Placa',
    'Padrão Placa',
    'Valor Adesão (R$)',
    'Status Adesão',
    'Status Vistoria',
    'Localização Google Maps',
    'Link Vistoria',
    'Link Pagamento',
    'Solicitante',
    'Data/Hora Conclusão/Decisão',
    'Aprovador / Vistoriador',
    'Parecer Técnico / Motivo'
  ];

  const linhas = vistorias.map((item) => {
    const dataSol = item.dataHoraSolicitacao 
      ? new Date(item.dataHoraSolicitacao).toLocaleString('pt-BR') 
      : '';
    const dataDec = item.dataHoraAprovacao 
      ? new Date(item.dataHoraAprovacao).toLocaleString('pt-BR') 
      : '—';
    const parecerOuMotivo = item.status === 'Reprovado'
      ? (item.motivoReprovacao || item.parecer || '—')
      : (item.parecer || '—');

    return [
      `"${item.id}"`,
      `"${dataSol}"`,
      `"${item.dataVistoria}"`,
      `"${item.horarioVistoria}"`,
      `"${item.vistoriador}"`,
      `"${(item.nomeAssociado || '').replace(/"/g, '""')}"`,
      `"${item.contato}"`,
      `"${(item.modeloCarro || '').replace(/"/g, '""')}"`,
      `"${item.placa}"`,
      `"${item.tipoPlaca || '—'}"`,
      item.valorAdesao.toFixed(2).replace('.', ','),
      `"${item.adesaoPaga ? 'Paga' : 'A receber pelo vistoriador'}"`,
      `"${item.status}"`,
      `"${(item.localizacaoMaps || '').replace(/"/g, '""')}"`,
      `"${(item.linkVistoria || '').replace(/"/g, '""')}"`,
      `"${(item.linkPagamento || '').replace(/"/g, '""')}"`,
      `"${(item.solicitante || '—').replace(/"/g, '""')}"`,
      `"${dataDec}"`,
      `"${(item.aprovador || '—').replace(/"/g, '""')}"`,
      `"${parecerOuMotivo.replace(/"/g, '""')}"`
    ].join(';');
  });

  const conteudoCSV = '\uFEFF' + [cabecalhos.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_solicitacoes_vistoria_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
