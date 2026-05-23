interface Props {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

const sizes = {
  sm: { pulse: 'text-lg',  by: 'text-[10px]', bar: 'h-[2px] w-8' },
  md: { pulse: 'text-2xl', by: 'text-xs',     bar: 'h-[2px] w-10' },
  lg: { pulse: 'text-4xl', by: 'text-sm',     bar: 'h-[3px] w-14' },
};

export default function PulseLogo({ size = 'md', showTagline = false }: Props) {
  const s = sizes[size];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-extrabold tracking-tight text-navy ${s.pulse}`}>
        PULSE
      </span>
      <div className={`${s.bar} bg-teal rounded-full`} />
      <span className={`text-slate-400 font-normal mt-1 ${s.by}`}>
        by Poonawalla Fincorp
      </span>
      {showTagline && (
        <span className="text-slate-400 text-xs mt-0.5 tracking-wide uppercase">
          Work Nervous System
        </span>
      )}
    </div>
  );
}
