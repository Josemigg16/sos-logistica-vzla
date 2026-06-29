import { useState, useEffect } from 'react';

interface ProgressBarProps {
  pct: number;
  barColor: string;
  barBg: string;
}

export function ProgressBar({ pct, barColor, barBg }: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className={`relative w-full h-1.5 rounded-full overflow-hidden ${barBg}`}>
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
