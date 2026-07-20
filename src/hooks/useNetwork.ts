import { useState, useEffect } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Verificar estado inicial
    Network.getStatus().then((status: ConnectionStatus) => {
      setIsOnline(status.connected);
    });

    // Escuchar cambios
    const listener = Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      setIsOnline(status.connected);
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  return { isOnline };
}
