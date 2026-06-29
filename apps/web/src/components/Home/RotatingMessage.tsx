import { useState, useEffect } from 'react';
import { MENSAJES_ACTIVOS, MENSAJES_CUBIERTOS } from '@/lib/home/homeConstants';

interface RotatingMessageProps {
  hasCovered: boolean;
}

export function RotatingMessage({ hasCovered }: RotatingMessageProps) {
  const pool = hasCovered
    ? [...MENSAJES_ACTIVOS, ...MENSAJES_CUBIERTOS]
    : MENSAJES_ACTIVOS;
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % pool.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(iv);
  }, [pool.length]);

  return (
    <div className="min-h-[3rem] flex items-center justify-center max-w-md mx-auto">
      <p
        className="text-sm text-white/60 text-center italic leading-relaxed transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        "{pool[idx % pool.length]}"
      </p>
    </div>
  );
}
