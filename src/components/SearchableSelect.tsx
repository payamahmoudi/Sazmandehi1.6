import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableOption {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
}

export default function SearchableSelect({ value, options, onChange, placeholder = 'جستجو و انتخاب...', disabled, emptyText = 'موردی یافت نشد' }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);
  const [query, setQuery] = useState(selected?.label || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label || '');
  }, [selected?.label]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || selected?.label === query) return options;
    return options.filter(option =>
      `${option.label} ${option.description || ''}`.toLowerCase().includes(term)
    );
  }, [options, query, selected?.label]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange('');
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-100 disabled:text-gray-400"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 disabled:hidden"
      >
        ▼
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {filteredOptions.length > 0 ? filteredOptions.map(option => (
            <button
              type="button"
              key={option.value}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setQuery(option.label);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-right text-sm hover:bg-indigo-50 ${option.value === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
            >
              <div className="font-medium">{option.label}</div>
              {option.description && <div className="mt-0.5 text-xs text-gray-400">{option.description}</div>}
            </button>
          )) : (
            <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}