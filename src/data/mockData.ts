/**
 * @file src/data/mockData.ts
 * @description Dados iniciais realistas de simulação para a operação de Supervisão de Inside Sales.
 * Permite que a aplicação inicie imediatamente com histórico e indicadores populados no localStorage.
 */

import { Ocorrencia, ResumoPassagem } from '../types';

export const INITIAL_MOCK_OCORRENCIAS: Ocorrencia[] = [
  {
    id: 'oc-101',
    dataHora: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 horas atrás
    supervisor: 'Debora Rodrigues',
    categoria: 'Sistemas & Ferramentas',
    descricao: 'Instabilidade generalizada na API do discador automático VoIP (PABX). Vendedores relataram quedas sucessivas nas ligações ativas entre 09:30 e 10:15.',
    impacto: 'Crítico',
    acaoTomada: 'Acionada equipe de TI/Infra. Chamado #TI-8842 aberto com SLA de emergência. Roteado tráfego para canal de contingência às 10:20.',
    status: 'Em Análise',
    duracaoMinutos: 45
  },
  {
    id: 'oc-102',
    dataHora: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 horas atrás
    supervisor: 'Marilia Farias',
    categoria: 'Qualidade de Leads & Mídia',
    descricao: 'Lote de 350 leads vindos da campanha "Landing Page Promoção Q3" sem preenchimento do campo DDD no telefone.',
    impacto: 'Médio',
    acaoTomada: 'Solicitada correção imediata para a equipe de Growth/Marketing. Script temporário rodado no CRM para enriquecimento via dados do e-mail.',
    status: 'Resolvido',
    duracaoMinutos: 30
  },
  {
    id: 'oc-103',
    dataHora: new Date(Date.now() - 3600000 * 18).toISOString(), // Ontem
    supervisor: 'Debora Rodrigues',
    categoria: 'Comercial & Objeções',
    descricao: 'Aumento expressivo na objeção referente ao novo reajuste de preços da assinatura anual no segmento Enterprise.',
    impacto: 'Médio',
    acaoTomada: 'Realizado alinhamento de 15 minutos com os Inside Sales repassando a nova matriz de valor e tabela de descontos pré-aprovada pela Gerência (Heder Santos).',
    status: 'Resolvido',
    duracaoMinutos: 20
  },
  {
    id: 'oc-104',
    dataHora: new Date(Date.now() - 3600000 * 26).toISOString(),
    supervisor: 'Debora Rodrigues',
    categoria: 'Sistemas & Ferramentas',
    descricao: 'Lentidão no carregamento das fichas de contato dentro do CRM no início do expediente.',
    impacto: 'Médio',
    acaoTomada: 'Notificado suporte técnico do sistema de CRM. Realizada limpeza de cache nos navegadores da equipe.',
    status: 'Resolvido',
    duracaoMinutos: 15
  },
  {
    id: 'oc-105',
    dataHora: new Date(Date.now() - 3600000 * 30).toISOString(),
    supervisor: 'Marilia Farias',
    categoria: 'Pessoas & Performance',
    descricao: 'Ausência não planejada de 2 vendedores juniores devido a consulta médica.',
    impacto: 'Baixo',
    acaoTomada: 'Reagendada a fila de contatos prioritários de leads inbound para os vendedores sêniores da equipe.',
    status: 'Resolvido',
    duracaoMinutos: 10
  },
  {
    id: 'oc-106',
    dataHora: new Date(Date.now() - 3600000 * 42).toISOString(),
    supervisor: 'Marilia Farias',
    categoria: 'Processos & SLA',
    descricao: 'Divergência no fluxo de passagem de oportunidade para o time de Closers (Account Executives).',
    impacto: 'Baixo',
    acaoTomada: 'Reforçada a obrigatoriedade do checklist BANT antes do agendamento da reunião de demonstração.',
    status: 'Resolvido',
    duracaoMinutos: 15
  },
  {
    id: 'oc-107',
    dataHora: new Date(Date.now() - 3600000 * 1).toISOString(),
    supervisor: 'Debora Rodrigues',
    categoria: 'Sistemas & Ferramentas',
    descricao: 'Falha de integração Webhook do formulário do site principal com o pipeline de Inside Sales.',
    impacto: 'Crítico',
    acaoTomada: 'Infraestrutura e Gerência (Heder Santos) informadas. Backup manual de contatos sendo extraído em CSV a cada 30 minutos.',
    status: 'Pendente',
    duracaoMinutos: 0
  }
];

export const INITIAL_MOCK_PASSAGENS: ResumoPassagem[] = [
  {
    id: 'pass-01',
    data: new Date().toISOString().split('T')[0],
    supervisor: 'Debora Rodrigues',
    oQueFuncionou: 'Volume de agendamentos alto (14 demos marcadas no dia). Bateu a meta de chamadas antes do esperado.',
    oQueFicaPendente: 'Acompanhar chamado TI-8842 referente à instabilidade no discador e validar se o webhook de cadastros no site foi reestabelecido com Marilia Farias.',
    dataHoraCriacao: new Date(Date.now() - 3600000).toISOString()
  }
];
