/**
 * @file src/hooks/useNetworkStatus.ts
 * @description Hook para monitoramento em tempo real do estado de conexão com a Internet
 * e disparo automático de revalidação de sincronização quando a rede é restabelecida.
 */

import { useState, useEffect } from 'react';

interface UseNetworkStatusOptions {
  onReconnect?: () => void;
}

export function useNetworkStatus(options?: UseNetworkStatusOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' 
      ? navigator.onLine 
      : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (options?.onReconnect) {
        options.onReconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options?.onReconnect]);

  return { isOnline, wasOffline };
}
