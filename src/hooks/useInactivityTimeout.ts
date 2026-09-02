/**
 * @file src/hooks/useInactivityTimeout.ts
 * @description Hook React para monitoramento de inatividade do usuário com encerramento automático
 * de sessão após 10 minutos sem interação (clique, rolagem, teclado ou toque).
 */

import { useEffect, useRef, useCallback } from 'react';
import { authService, SESSION_INACTIVITY_TIMEOUT_MS } from '../services/authService';
import { AuthUser } from '../types';

interface UseInactivityTimeoutOptions {
  user: AuthUser | null;
  onTimeoutLogout: () => void;
  timeoutMs?: number;
}

export function useInactivityTimeout({
  user,
  onTimeoutLogout,
  timeoutMs = SESSION_INACTIVITY_TIMEOUT_MS
}: UseInactivityTimeoutOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<number | null>(null);

  // Registra atividade atualizando memória e persistência
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Aplica throttling de 2 segundos para evitar gravações excessivas no localStorage
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = window.setTimeout(() => {
        authService.recordActivity();
        throttleTimerRef.current = null;
      }, 2000);
    }
  }, []);

  // Verifica se o tempo de inatividade excedeu o limite
  const checkInactivity = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const lastActivityTime = authService.getLastActivityTime() || lastActivityRef.current;
    const timeElapsed = now - lastActivityTime;

    if (timeElapsed >= timeoutMs) {
      console.warn(`[Segurança] Sessão encerrada por inatividade (${Math.round(timeElapsed / 1000)}s sem interação).`);
      authService.logout('inactivity');
      onTimeoutLogout();
    }
  }, [user, timeoutMs, onTimeoutLogout]);

  useEffect(() => {
    if (!user) return;

    // Registra a atividade inicial no momento do login
    authService.recordActivity();
    lastActivityRef.current = Date.now();

    // Eventos monitorados para registrar atividade do usuário
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel'
    ];

    const activityListener = () => {
      handleUserActivity();
    };

    // Adiciona ouvintes globais com passive: true para máxima performance
    events.forEach(eventName => {
      window.addEventListener(eventName, activityListener, { passive: true });
    });

    // Verificação periódica a cada 5 segundos
    const intervalId = window.setInterval(checkInactivity, 5000);

    // Verificação imediata ao retomar o foco da janela ou aba
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        checkInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, activityListener);
      });
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [user, handleUserActivity, checkInactivity]);
}
