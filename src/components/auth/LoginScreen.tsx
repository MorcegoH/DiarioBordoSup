/**
 * @file src/components/auth/LoginScreen.tsx
 * @description Tela de Login moderna, segura e responsiva para o Diário de Bordo.
 * Permite autenticação individualizada com identificação de cargo (Gerente / Supervisão).
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, LogIn, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser } from '../../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await authService.login(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#003b1e] via-[#005b2e] to-[#042817] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-emerald-800/30 transition-all duration-300">
        
        {/* Top Header Card */}
        <div className="bg-[#005b2e] text-white px-6 pt-8 pb-7 text-center relative overflow-hidden">
          {/* Background pattern decor */}
          <div className="absolute inset-0 bg-radial from-emerald-400/10 via-transparent to-transparent opacity-60 pointer-events-none" />
          
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl border border-white/20 shadow-inner backdrop-blur-md mb-3">
            <ShieldCheck className="w-10 h-10 text-emerald-300" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            Diário de Bordo
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1">
            Inside Sales
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-semibold text-emerald-200 border border-white/15">
            <Sparkles className="w-3 h-3 text-emerald-300" />
            <span>Controle Inteligente</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo de Usuário / Login */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5" htmlFor="login-username">
                Usuário de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden bg-white text-gray-900 font-medium"
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider" htmlFor="login-password">
                  Senha de Segurança
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha de acesso"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden bg-white text-gray-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#005b2e] hover:bg-[#004a25] active:bg-[#003d1e] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-2 active:scale-98"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé de Informação e Auditoria */}
          <div className="pt-2 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500">
              O sistema identifica automaticamente o operador e suas permissões pelo login de acesso.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
