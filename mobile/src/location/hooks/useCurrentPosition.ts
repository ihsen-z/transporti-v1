import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import { Coordinates } from '../types';

export const useCurrentPosition = () => {
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchPosition = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pos = await locationService.getCurrentPosition();
      if (pos) {
        setPosition(pos);
      } else {
        setError('Permission de localisation non accordée.');
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la position.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosition();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return { position, error, isLoading, refetch: fetchPosition };
};
