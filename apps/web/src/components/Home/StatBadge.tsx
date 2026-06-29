import { Link } from '@tanstack/react-router';

interface StatBadgeProps {
  value: string | number;
  label: string;
  highlight?: boolean;
  to?: string;
}

export function StatBadge({ value, label, highlight, to }: StatBadgeProps) {
  const base = `flex flex-col items-center px-4 py-3 rounded-xl border ${
    highlight
      ? 'bg-[#2B5F8E] border-[#4A89C0]/50 shadow-[0_4px_16px_rgba(43,95,142,0.4)]'
      : 'bg-[#152D46] border-[#2B5F8E]/30'
  }`;

  const inner = (
    <>
      <span
        className="font-black tabular-nums text-white leading-none"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.5rem' }}
      >
        {value}
      </span>
      <span className="text-[10px] text-white/50 font-medium mt-1 text-center">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={() => {
          if (to === "/map") localStorage.setItem("map_intro_force", "1");
        }}
        className={`${base} group cursor-pointer hover:border-[#4A89C0]/70 hover:bg-[#1E4A6E] hover:shadow-[0_4px_16px_rgba(74,137,192,0.3)] active:scale-[0.97] transition-[transform,background-color,border-color,box-shadow] duration-200`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
