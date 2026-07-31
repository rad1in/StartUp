// Full-area loader: a rotating caramel halo with words that breathe in sequence.
// Words (not letters) animate individually — Persian script is cursive, so
// splitting letters would visually disconnect the glyphs.
export default function Loader({ text = 'در حال بارگذاری', className = '' }) {
  const words = text.split(' ');
  return (
    <div className={`flex items-center justify-center py-14 ${className}`}>
      <div className="relative flex items-center justify-center w-44 h-44 select-none">
        <div className="loader-halo" />
        <span className="relative z-10 flex gap-1.5 text-ink/80 font-medium text-sm">
          {words.map((word, i) => (
            <span key={i} className="loader-word" style={{ animationDelay: `${i * 0.22}s` }}>
              {word}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
