import { NavLink } from 'react-router-dom';

// Grouped panel navigation — instead of one overwhelming row of 14 pills, tabs
// are clustered under small captions so owners find things by task, not by
// scanning every label.
export default function PanelNav({ groups }) {
  return (
    <nav className="glass rounded-3xl shadow-card p-4 mb-6 space-y-3">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-ink/35 w-16 shrink-0">{group.title}</span>
          {group.tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button ring-1 ring-accent-300/70'
                    : 'bg-surface-2/60 text-ink/60 hover:text-ink hover:bg-white'
                }`
              }
            >
              {Icon && <Icon size={15} />}
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
