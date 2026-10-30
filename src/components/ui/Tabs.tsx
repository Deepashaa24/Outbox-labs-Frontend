export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Email status">
      {items.map((item) => (
        <button
          key={item.id}
          id={`tab-${item.id}`}
          role="tab"
          type="button"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
            value === item.id
              ? "border-slate-950 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-xs ${value === item.id ? "bg-slate-100 text-slate-800" : "bg-slate-100 text-slate-500"}`}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
