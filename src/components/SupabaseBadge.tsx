/**
 * @file src/components/SupabaseBadge.tsx
 * @description Badge e Modal de Informação sobre a integração com o Banco de Dados Supabase.
 */

import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check, Server } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { dbService } from '../services/dbService';
import { Ocorrencia, ResumoPassagem } from '../types';

interface SupabaseBadgeProps {
  ocorrencias: Ocorrencia[];
  passagens: ResumoPassagem[];
  onDataSynced?: () => void;
}

export const SupabaseBadge: React.FC<SupabaseBadgeProps> = ({
  ocorrencias,
  passagens,
  onDataSynced
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const sqlScript = `-- SCRIPT COMPLETO SQL PARA SUPABASE (POSTGRESQL)
-- DIÁRIO DE BORDO - SUPERVISÃO INSIDE SALES

-- 1. Tabela de Ocorrências Operacionais
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id TEXT PRIMARY KEY,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    supervisor TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN (
        'Sistemas & Ferramentas',
        'Qualidade de Leads & Mídia',
        'Processos & SLA',
        'Pessoas & Performance',
        'Comercial & Objeções'
    )),
    descricao TEXT NOT NULL,
    impacto TEXT NOT NULL CHECK (impacto IN ('Baixo', 'Médio', 'Crítico')),
    acao_tomada TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pendente', 'Em Análise', 'Resolvido')),
    duracao_minutos INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Passagem de Bastão / Fechamento de Turno
CREATE TABLE IF NOT EXISTS public.resumos_passagem (
    id TEXT PRIMARY KEY,
    data DATE NOT NULL,
    supervisor TEXT NOT NULL,
    o_que_funcionou TEXT NOT NULL,
    o_que_fica_pendente TEXT NOT NULL,
    data_hora_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices de Alta Performance para Buscas e Relatórios
CREATE INDEX IF NOT EXISTS idx_ocorrencias_data_hora ON public.ocorrencias(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON public.ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_categoria ON public.ocorrencias(categoria);
CREATE INDEX IF NOT EXISTS idx_resumos_passagem_data ON public.resumos_passagem(data DESC);

-- 4. Habilitar Row Level Security (RLS) e Criar Políticas Permissivas para Leitura/Escrita
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumos_passagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura publica de ocorrencias" ON public.ocorrencias FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica de ocorrencias" ON public.ocorrencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica de ocorrencias" ON public.ocorrencias FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusao publica de ocorrencias" ON public.ocorrencias FOR DELETE USING (true);

CREATE POLICY "Permitir leitura publica de passagens" ON public.resumos_passagem FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica de passagens" ON public.resumos_passagem FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica de passagens" ON public.resumos_passagem FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusao publica de passagens" ON public.resumos_passagem FOR DELETE USING (true);
`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSeedSupabase = async () => {
    setIsSeeding(true);
    setSeedMessage(null);
    const result = await dbService.seedSupabase(ocorrencias, passagens);
    setIsSeeding(false);
    setSeedMessage(result.message);
    if (result.success && onDataSynced) {
      onDataSynced();
    }
  };

  return (
    <>
      {/* Badge de Status */}
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all shadow-xs cursor-pointer ${
          isSupabaseConfigured
            ? 'bg-emerald-900/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-800'
            : 'bg-amber-950/80 text-amber-200 border-amber-600/50 hover:bg-amber-900'
        }`}
        title="Clique para ver o status e instruções do Banco de Dados Supabase"
      >
        <Database className="w-3.5 h-3.5" />
        <span>
          {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Local (Supabase Guia)'}
        </span>
        {isSupabaseConfigured ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
        )}
      </button>

      {/* Modal de Configuração e Guia do Supabase */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden text-gray-800">
            
            {/* Modal Header */}
            <div className="bg-[#005b2e] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Server className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Banco de Dados Supabase</h3>
                  <p className="text-xs text-emerald-100">
                    Estrutura de Tabelas & Passo a Passo de Conexão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-600">
              
              {/* Status Atual */}
              <div className={`p-4 rounded-lg border ${
                isSupabaseConfigured 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-start gap-3">
                  {isSupabaseConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">
                      {isSupabaseConfigured 
                        ? 'Variáveis do Supabase identificadas e ativas!' 
                        : 'A aplicação está operando em Modo Local (LocalStorage).'
                      }
                    </p>
                    <p className="text-xs leading-relaxed">
                      {isSupabaseConfigured
                        ? 'Sua aplicação está conectada ao Supabase. Todos os registros novos e atualizações serão salvos em nuvem.'
                        : 'Você pode usar a aplicação normalmente em modo offline/local. Para salvar na nuvem com o Supabase, siga as etapas abaixo.'
                      }
                    </p>
                  </div>
                </div>

                {isSupabaseConfigured && (
                  <div className="mt-4 pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-emerald-800 font-medium">
                      Deseja sincronizar os dados atuais da tela para o banco Supabase?
                    </span>
                    <button
                      onClick={handleSeedSupabase}
                      disabled={isSeeding}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Database className="w-3.5 h-3.5" />
                      {isSeeding ? 'Enviando...' : 'Popular Dados no Supabase'}
                    </button>
                  </div>
                )}

                {seedMessage && (
                  <p className="mt-2 text-xs font-medium text-emerald-800 bg-emerald-100 p-2 rounded-md">
                    {seedMessage}
                  </p>
                )}
              </div>

              {/* Passo a Passo */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <span>🚀</span> Passo a Passo para Criar e Configurar no Supabase
                </h4>
                
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-gray-700">
                  <li>Crie uma conta gratuita em <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3"/></a> e crie um novo projeto.</li>
                  <li>No menu lateral esquerdo do Supabase, clique em <strong>SQL Editor</strong>.</li>
                  <li>Cole e execute o código SQL fornecido no painel abaixo.</li>
                  <li>Vá em <strong>Project Settings → API</strong> no painel do Supabase.</li>
                  <li>Copie a <strong>Project URL</strong> e a <strong>anon / public key</strong>.</li>
                  <li>Insira as chaves no seu arquivo <code className="bg-gray-100 px-1 py-0.5 rounded border text-gray-800">.env</code> com as variáveis <code className="bg-gray-100 px-1 py-0.5 rounded border text-gray-800">VITE_SUPABASE_URL</code> e <code className="bg-gray-100 px-1 py-0.5 rounded border text-gray-800">VITE_SUPABASE_ANON_KEY</code>.</li>
                </ol>
              </div>

              {/* Script SQL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-sm">
                    📜 Script SQL DDL (Cole no SQL Editor do Supabase)
                  </h4>
                  <button
                    onClick={handleCopySQL}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium flex items-center gap-1 transition-colors border border-gray-300"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>Copiar Código SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono max-h-56 overflow-y-auto leading-relaxed border border-gray-800">
                  <pre>{sqlScript}</pre>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs rounded-lg transition-colors"
              >
                Fechar Guia
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
