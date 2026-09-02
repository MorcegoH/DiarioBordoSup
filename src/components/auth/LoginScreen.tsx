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
    <div className="relative min-h-screen bg-linear-to-br from-[#012211] via-[#004222] to-[#01140a] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans overflow-hidden">
      
      {/* Elementos de Iluminação Atmosférica para Refração de Vidro (Glass Caustics) */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-500/15 blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

      {/* Textura Geométrica Sutil de Fundo (Grid Analítico Conceitual) */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px'
        }}
      />

      {/* Card Principal em Vidro Lapidado com Bisel (Beveled Glass Card) */}
      <div 
        className="relative w-full max-w-md rounded-3xl overflow-hidden transition-all duration-300 z-10 backdrop-blur-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          boxShadow: `
            0 30px 70px -15px rgba(0, 0, 0, 0.55),
            inset 0 1.5px 1.5px rgba(255, 255, 255, 0.9),
            inset 0 -1.5px 1.5px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(255, 255, 255, 0.4)
          `,
          border: '1px solid rgba(255, 255, 255, 0.6)'
        }}
      >
        
        {/* Top Header Card - Vidro Esmeralda Escuro com Bisel Prismático */}
        <div 
          className="relative text-white px-6 pt-9 pb-8 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 99, 51, 0.96) 0%, rgba(0, 72, 37, 0.96) 55%, rgba(0, 52, 27, 0.98) 100%)',
            borderBottom: '1px solid rgba(0, 40, 20, 0.5)',
            boxShadow: 'inset 0 1.5px 1px rgba(255, 255, 255, 0.45), 0 6px 16px -4px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Fita de Reflexo Superior de Bisel Especular */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent pointer-events-none" />
          
          {/* Brilho Radial Central */}
          <div className="absolute inset-0 bg-radial from-emerald-300/15 via-transparent to-transparent pointer-events-none" />

          {/* Medalhão do Ícone - Efeito Joia Vítrea Lapidada com Bisel Interno */}
          <div 
            className="inline-flex items-center justify-center p-3.5 rounded-2xl mb-3.5 transition-transform duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.07) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              boxShadow: `
                inset 0 2px 2px rgba(255, 255, 255, 0.8),
                inset 0 -1.5px 2px rgba(0, 0, 0, 0.25),
                0 10px 25px -4px rgba(0, 0, 0, 0.3)
              `
            }}
          >
            <ShieldCheck className="w-10 h-10 text-emerald-300 drop-shadow-[0_2px_8px_rgba(110,231,183,0.45)]" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Diário de Bordo - I.S
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1 tracking-wide">
            Gestão Operacional do Departamento Inside Sales
          </p>

          {/* Tag Cápsula Biselada */}
          <div 
            className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold text-emerald-100"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.5), 0 2px 6px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Controle Inteligente</span>
          </div>
        </div>

        {/* Form Body - Vidro Acetinado com Relevo Esculpido */}
        <div 
          className="p-6 sm:p-8 space-y-6"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.92) 100%)'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo de Usuário / Login */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-username">
                Usuário de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700/60">
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
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm outline-hidden font-medium text-slate-800 placeholder:text-slate-400 transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(203, 213, 225, 0.8)',
                    boxShadow: 'inset 0 1.5px 2px rgba(0, 0, 0, 0.04), 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#005b2e';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 91, 46, 0.15), inset 0 1.5px 2px rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 0.8)';
                    e.currentTarget.style.boxShadow = 'inset 0 1.5px 2px rgba(0, 0, 0, 0.04), 0 1px 0 rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                  }}
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="login-password">
                  Senha de Segurança
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700/60">
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-hidden font-medium text-slate-800 placeholder:text-slate-400 transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid rgba(203, 213, 225, 0.8)',
                    boxShadow: 'inset 0 1.5px 2px rgba(0, 0, 0, 0.04), 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#005b2e';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 91, 46, 0.15), inset 0 1.5px 2px rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 0.8)';
                    e.currentTarget.style.boxShadow = 'inset 0 1.5px 2px rgba(0, 0, 0, 0.04), 0 1px 0 rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <div 
                className="p-3 bg-red-50/90 border border-red-200/90 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in backdrop-blur-xs"
                style={{
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(239, 68, 68, 0.08)'
                }}
              >
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Botão de Entrar com Acabamento Biselado (Beveled Button) */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full py-3 px-4 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-2 active:scale-[0.985] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #006e37 0%, #005b2e 50%, #004422 100%)',
                borderTop: '1px solid rgba(167, 243, 208, 0.75)',
                borderBottom: '1.5px solid rgba(1, 30, 15, 0.85)',
                borderLeft: '1px solid rgba(5, 120, 60, 0.6)',
                borderRight: '1px solid rgba(5, 120, 60, 0.6)',
                boxShadow: `
                  inset 0 1.5px 1px rgba(255, 255, 255, 0.45),
                  0 12px 24px -5px rgba(0, 91, 46, 0.45),
                  0 2px 4px rgba(0, 0, 0, 0.15)
                `
              }}
            >
              {/* Efeito de Reflexo de Luz no Hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="relative z-10">Validando credenciais...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 relative z-10 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="relative z-10 tracking-wide font-semibold">Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 ml-1 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé com Divisor de Vidro Translúcido */}
          <div className="pt-2 text-center relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-3" />
            <p className="text-[11px] text-slate-500 font-medium">
              O sistema identifica automaticamente o operador e suas permissões pelo login de acesso.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
