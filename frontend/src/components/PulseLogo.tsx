interface Props {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

const sizes = {
  sm: { text: 'text-lg',  by: 'text-[10px]', bar: 'h-[2px] w-8' },
  md: { text: 'text-2xl', by: 'text-xs',     bar: 'h-[2px] w-10' },
  lg: { text: 'text-4xl', by: 'text-sm',     bar: 'h-[3px] w-14' },
};

export default function AppLogo({ size = 'md', showTagline = false }: Props) {
  const s = sizes[size];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-serif italic tracking-tight text-white ${s.text}`}>
        theory
      </span>
      <div className={`${s.bar} bg-teal rounded-full`} />
      {showTagline && (
        <span className="text-slate-400 text-xs mt-0.5 tracking-wide uppercase">
          Work Intelligence
        </span>
      )}
    </div>
  );
}
