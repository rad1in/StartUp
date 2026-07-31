export default function Card({ className = '', interactive = false, children, ...props }) {
  return (
    <div
      className={`glass rounded-3xl shadow-card p-5 ${
        interactive ? 'hover-lift cursor-pointer hover:border-accent-300/40' : 'transition-all duration-300'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
