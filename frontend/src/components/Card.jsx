export default function Card({ className = '', interactive = false, children, ...props }) {
  return (
    <div
      className={`glass rounded-2xl shadow-card p-4 transition-all duration-300 ${
        interactive ? 'hover:shadow-lift hover:-translate-y-1 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
