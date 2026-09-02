/**
 * @file src/components/InspectionRequestsSection.tsx
 * @description Aba principal "Solicitação de Vistoria", gerenciando agendamentos,
 * dados veiculares, laudos dos vistoriadores (Danilo & Lucas), taxas de adesão,
 * exportação CSV e governança com persistência híbrida (LocalStorage + Supabase).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SolicitacaoVistoria, AuthUser } from '../types';
import { inspectionService } from '../services/inspectionService';
import { exportarVistoriasCSV } from '../utils/csvInspectionExport';
import { InspectionRequestForm } from './inspections/InspectionRequestForm';
import { InspectionRequestsTable } from './inspections/InspectionRequestsTable';
import { InspectionApprovalModal } from './inspections/InspectionApprovalModal';
import { InspectionRejectionModal } from './inspections/InspectionRejectionModal';
import { InspectionDetailsModal } from './inspections/InspectionDetailsModal';
import { InspectionDeleteModal } from './inspections/InspectionDeleteModal';
import {
  Car,
  Download,
  RotateCcw,
  ShieldCheck,
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  Plus
} from 'lucide-react';

interface InspectionRequestsSectionProps {
  currentUser?: AuthUser | null;
}

export const InspectionRequestsSection: React.FC<InspectionRequestsSectionProps> = React.memo(({
  currentUser
}) => {
  const [vistorias, setVistorias] = useState<SolicitacaoVistoria[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modais de Operação
  const [selectedForApproval, setSelectedForApproval] = useState<SolicitacaoVistoria | null>(null);
  const [selectedForRejection, setSelectedForRejection] = useState<SolicitacaoVistoria | null>(null);
  const [selectedForDetails, setSelectedForDetails] = useState<SolicitacaoVistoria | null>(null);
  const [selectedForDelete, setSelectedForDelete] = useState<SolicitacaoVistoria | null>(null);

  // Carregamento de dados assíncrono
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const dados = await inspectionService.getVistoriasAsync();
      setVistorias(dados);
    } catch (e) {
      console.error('Erro ao carregar solicitações de vistoria:', e);
      setVistorias(inspectionService.getVistorias());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handlers de Ações
  const handleAddVistoria = useCallback(async (nova: SolicitacaoVistoria) => {
    const atualizadas = await inspectionService.addVistoria(nova);
    setVistorias(atualizadas);
  }, []);

  const handleConfirmAprovacao = useCallback(async (
    id: string,
    parecer: string,
    aprovador: string,
    adesaoRecebida: boolean
  ) => {
    const atualizadas = await inspectionService.aprovarVistoria(id, parecer, aprovador, adesaoRecebida);
    setVistorias(atualizadas);
  }, []);

  const handleConfirmReprovacao = useCallback(async (
    id: string,
    motivo: string,
    aprovador: string
  ) => {
    const atualizadas = await inspectionService.reprovarVistoria(id, motivo, aprovador);
    setVistorias(atualizadas);
  }, []);

  const handleToggleAdesao = useCallback(async (id: string, paga: boolean) => {
    const atualizadas = await inspectionService.toggleStatusAdesao(id, paga);
    setVistorias(atualizadas);
  }, []);

  const handleConfirmDelete = useCallback(async (id: string) => {
    const atualizadas = await inspectionService.deleteVistoria(id);
    setVistorias(atualizadas);
  }, []);

  const handleResetData = useCallback(async () => {
    if (window.confirm('Tem certeza que deseja limpar todas as solicitações de vistoria?')) {
      const resetadas = await inspectionService.clearAllData();
      setVistorias(resetadas);
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    exportarVistoriasCSV(vistorias);
  }, [vistorias]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. FORMULÁRIO DE CADASTRO DE VISTORIA */}
      <InspectionRequestForm
        onAddVistoria={handleAddVistoria}
        currentUser={currentUser ? { name: currentUser.nome, role: currentUser.cargo } : undefined}
      />

      {/* 3. TABELA DE SOLICITAÇÕES COM FILTROS E MÉTRICAS */}
      <InspectionRequestsTable
        vistorias={vistorias}
        onOpenAprovar={(item) => setSelectedForApproval(item)}
        onOpenReprovar={(item) => setSelectedForRejection(item)}
        onOpenDetalhes={(item) => setSelectedForDetails(item)}
        onOpenDelete={(item) => setSelectedForDelete(item)}
        onToggleAdesao={handleToggleAdesao}
      />

      {/* MODAIS DE DECISÃO E AUDITORIA */}
      {/* Modal de Aprovação */}
      <InspectionApprovalModal
        vistoria={selectedForApproval}
        onClose={() => setSelectedForApproval(null)}
        onConfirmAprovacao={handleConfirmAprovacao}
        defaultAprovador={currentUser?.nome || 'Vistoriador'}
      />

      {/* Modal de Reprovação */}
      <InspectionRejectionModal
        vistoria={selectedForRejection}
        onClose={() => setSelectedForRejection(null)}
        onConfirmReprovacao={handleConfirmReprovacao}
        defaultAprovador={currentUser?.nome || 'Vistoriador'}
      />

      {/* Modal de Detalhes Completos */}
      <InspectionDetailsModal
        vistoria={selectedForDetails}
        onClose={() => setSelectedForDetails(null)}
        onOpenAprovar={(item) => setSelectedForApproval(item)}
        onOpenReprovar={(item) => setSelectedForRejection(item)}
      />

      {/* Modal de Exclusão Segura */}
      <InspectionDeleteModal
        vistoria={selectedForDelete}
        onClose={() => setSelectedForDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />

    </div>
  );
});
