/**
 * @file src/components/DiscountRequestsSection.tsx
 * @description Aba principal "Solicitações de Desconto", integrando Painel de Budget,
 * Formulário de Nova Solicitação, Tabela com monitoramento de SLA e Modais de Decisão Gerencial.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SolicitacaoDesconto } from '../types';
import { discountService } from '../services/discountService';
import { BudgetPanel } from './discounts/BudgetPanel';
import { DiscountRequestForm } from './discounts/DiscountRequestForm';
import { DiscountRequestsTable } from './discounts/DiscountRequestsTable';
import { ApprovalModal } from './discounts/ApprovalModal';
import { RejectionModal } from './discounts/RejectionModal';
import { ManagerDirectReleaseModal } from './discounts/ManagerDirectReleaseModal';

export const DiscountRequestsSection: React.FC = React.memo(() => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDesconto[]>([]);
  const [selectedForApproval, setSelectedForApproval] = useState<SolicitacaoDesconto | null>(null);
  const [selectedForRejection, setSelectedForRejection] = useState<SolicitacaoDesconto | null>(null);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState<boolean>(false);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');

  // Carregar dados na montagem
  useEffect(() => {
    let isMounted = true;
    discountService.getSolicitacoesAsync().then((dados) => {
      if (isMounted) {
        setSolicitacoes(dados);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Lista de meses disponíveis com solicitações
  const mesesDisponiveis = useMemo(() => {
    return discountService.getMesesDisponiveis(solicitacoes);
  }, [solicitacoes]);

  // Recalcular budget automaticamente para o mês selecionado
  const budget = useMemo(() => {
    return discountService.calcularBudget(solicitacoes, mesSelecionado || undefined);
  }, [solicitacoes, mesSelecionado]);

  // Handler para adicionar nova solicitação
  const handleAddSolicitacao = useCallback(async (nova: SolicitacaoDesconto) => {
    const atualizadas = await discountService.addSolicitacao(nova);
    setSolicitacoes(atualizadas);
  }, []);

  // Handler para registrar liberação direta do Gerente
  const handleManagerDirectRelease = useCallback(async (novaLiberacao: SolicitacaoDesconto) => {
    const atualizadas = await discountService.addSolicitacao(novaLiberacao);
    setSolicitacoes(atualizadas);
  }, []);

  // Handler para confirmar aprovação
  const handleConfirmAprovacao = useCallback(async (id: string, parecer: string, aprovador: string) => {
    const atualizadas = await discountService.aprovarSolicitacao(id, parecer, aprovador);
    setSolicitacoes(atualizadas);
  }, []);

  // Handler para confirmar reprovação
  const handleConfirmReprovacao = useCallback(async (id: string, parecer: string, aprovador: string) => {
    const atualizadas = await discountService.reprovarSolicitacao(id, parecer, aprovador);
    setSolicitacoes(atualizadas);
  }, []);

  // Resetar dados para estado limpo
  const handleResetMockData = useCallback(async () => {
    if (window.confirm('Deseja limpar todos os registros de solicitações de desconto?')) {
      const resetadas = await discountService.clearAllData();
      setSolicitacoes(resetadas);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Painel Fixo de Orçamento Mensal (Budget) com Indicador de Período e Renovação */}
      <BudgetPanel 
        budget={budget} 
        onOpenManagerRelease={() => setIsManagerModalOpen(true)}
        mesesDisponiveis={mesesDisponiveis}
        mesSelecionado={mesSelecionado}
        onChangeMes={setMesSelecionado}
      />

      {/* 2. Formulário de Nova Solicitação de Desconto */}
      <DiscountRequestForm
        budget={budget}
        onAddSolicitacao={handleAddSolicitacao}
      />

      {/* 3. Tabela com SLA de 4 horas, Filtros e Ações Gerenciais */}
      <DiscountRequestsTable
        solicitacoes={solicitacoes}
        onOpenAprovarModal={(item) => setSelectedForApproval(item)}
        onOpenReprovarModal={(item) => setSelectedForRejection(item)}
        onResetMockData={handleResetMockData}
        onOpenManagerRelease={() => setIsManagerModalOpen(true)}
      />

      {/* Modal de Registro de Desconto Liberado pelo Gerente (com autenticação por senha) */}
      <ManagerDirectReleaseModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        onConfirmRegistro={handleManagerDirectRelease}
        saldoReservaGerente={budget.reservaGerente}
        ciclo={budget.ciclo}
      />

      {/* Modal de Aprovação com Senha e Parecer */}
      <ApprovalModal
        solicitacao={selectedForApproval}
        isOpen={!!selectedForApproval}
        onClose={() => setSelectedForApproval(null)}
        onConfirmAprovacao={handleConfirmAprovacao}
      />

      {/* Modal de Reprovação com Parecer Obrigatório */}
      <RejectionModal
        solicitacao={selectedForRejection}
        isOpen={!!selectedForRejection}
        onClose={() => setSelectedForRejection(null)}
        onConfirmReprovacao={handleConfirmReprovacao}
      />

    </div>
  );
});
