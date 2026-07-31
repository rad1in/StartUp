const variants = {
  // Deep charcoal with a soft sheen — the workhorse CTA.
  primary:
    'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button hover:shadow-[0_10px_30px_rgba(20,18,16,0.32)] hover:-translate-y-px',
  // Caramel gradient — reserved for the single most important action on a page.
  accent:
    'bg-gradient-to-b from-accent-400 to-accent-600 text-white shadow-accent-glow hover:shadow-[0_12px_32px_rgba(214,138,46,0.45)] hover:-translate-y-px',
  secondary: 'glass text-ink hover:bg-surface-2/90 hover:shadow-soft',
  danger:
    'bg-transparent text-red-600 border-2 border-red-300 font-bold hover:bg-red-500 hover:border-red-500 hover:text-white',
  ghost: 'bg-transparent text-ink/60 hover:bg-black/5 hover:text-ink',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`px-5 py-2.5 rounded-full font-bold transition-all duration-200 ease-spring active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
