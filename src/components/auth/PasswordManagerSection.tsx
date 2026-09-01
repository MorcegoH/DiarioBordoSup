/**
 * @file src/components/auth/PasswordManagerSection.tsx
 * @description Seção de Gerenciamento e Reset de Senhas (Exclusiva para o Gerente Heder Santos).
 * Permite cadastrar e alterar senhas tanto do Gerente quanto da Supervisão.
 */

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, User, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Save, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser } from '../../types';

interface PasswordManagerSectionProps {
  currentUser: AuthUser | null;
}

export const PasswordManagerSection: React.FC<PasswordManagerSectionProps> = ({ currentUser }) => {
  const [selectedTarget, setSelectedTarget] = useState<'heder.santos' | 'debora.rodrigues'>('heder.santos');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const isManager = currentUser?.role === 'manager';

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!isManager) {
      setFeedback({
        type: 'error',
        message: 'Apenas o Gerente (Heder Santos) possui permissão para redefinir ou cadastrar novas senhas.'
      });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({
        type: 'error',
        message: 'A nova senha deve ter no mínimo 6 caracteres.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: 'A confirmação de senha não coincide com a nova senha digitada.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.updatePassword(selectedTarget, newPassword);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: result.message
        });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setFeedback({
          type: 'error',
          message: result.message
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao atualizar a senha.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySql = () => {
    const script = authService.getSqlSetupScript();
    navigator.clipboard.writeText(script);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isManager) {
    return (
      <div className="p-4 sm:p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Acesso Restrito ao Perfil de Gerência</span>
        </div>
        <p>
          O gerenciamento e redefinição de senhas de acesso é exclusivo do usuário <strong>Heder Santos (Gerente)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Informativo */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
        <div className="p-2 bg-[#005b2e] text-white rounded-lg shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">
            Gestão de Credenciais e Senhas de Operadores
          </h4>
          <p className="text-xs text-gray-600 mt-0.5">
            Como Gerente, você pode definir e redefinir as senhas de acesso do seu usuário e da Supervisão com criptografia SHA-256.
          </p>
        </div>
      </div>

      {/* Formulário de Alteração de Senha */}
      <form onSubmit={handleUpdatePassword} className="space-y-4 bg-white p-5 border border-gray-200 rounded-xl shadow-xs">
        
        {/* Escolha do Usuário Alvo */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Selecione a Conta para Redefinir a Senha:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedTarget('heder.santos');
                setFeedback(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                selectedTarget === 'heder.santos'
                  ? 'border-[#005b2e] bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-600/20'
                  : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div>
                <div className="text-xs font-bold">Heder Santos</div>
                <div className="text-[11px] text-emerald-800 font-medium">Conta: heder.santos (Gerente)</div>
              </div>
              {selectedTarget === 'heder.santos' && (
                <CheckCircle2 className="w-4 h-4 text-[#005b2e]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTarget('debora.rodrigues');
                setFeedback(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                selectedTarget === 'debora.rodrigues'
                  ? 'border-[#005b2e] bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-600/20'
                  : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div>
                <div className="text-xs font-bold">Débora Rodrigues</div>
                <div className="text-[11px] text-emerald-800 font-medium">Conta: debora.rodrigues (Supervisora)</div>
              </div>
              {selectedTarget === 'debora.rodrigues' && (
                <CheckCircle2 className="w-4 h-4 text-[#005b2e]" />
              )}
            </button>
          </div>
        </div>

        {/* Campo Nova Senha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="new-pass-input">
              Nova Senha para {selectedTarget === 'heder.santos' ? 'Heder Santos' : 'Débora Rodrigues'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="new-pass-input"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden bg-white text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="confirm-pass-input">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="confirm-pass-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden bg-white text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Feedback visual */}
        {feedback && (
          <div
            className={`p-3 rounded-xl flex items-start gap-2 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Botão de Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#005b2e] hover:bg-[#004a25] text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Nova Senha de {selectedTarget === 'heder.santos' ? 'Heder Santos' : 'Débora Rodrigues'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Script SQL para a Tabela de Credenciais */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#005b2e]" />
            <span className="text-xs font-bold text-gray-900">
              Estrutura de Tabela no Banco Supabase (app_users_auth)
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedSql ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-600">
          Para que as senhas alteradas fiquem salvas permanentemente no banco Supabase na nuvem, execute o script SQL acima no <strong>SQL Editor do Supabase</strong>.
        </p>
      </div>

    </div>
  );
};
