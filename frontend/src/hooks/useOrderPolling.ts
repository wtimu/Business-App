import { useEffect, useRef, useState } from 'react';
import { fetchOrder, type OrderResponse } from '../lib/api';

export const useOrderPolling = (orderId: string | null, enabled: boolean) => {
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!orderId || !enabled) {
      return;
    }

    const poll = async () => {
      try {
        const data = await fetchOrder(orderId);
        setOrder(data);
        attempts.current += 1;
        if (data.status === 'PAID' || data.status === 'FAILED' || attempts.current >= 60) {
          setIsDone(true);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
        setIsDone(true);
        return;
      }

      const delay = Math.min(3000 + attempts.current * 250, 5000);
      timer.current = setTimeout(poll, delay);
    };

    poll();

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [orderId, enabled]);

  return { order, error, isDone };
};
