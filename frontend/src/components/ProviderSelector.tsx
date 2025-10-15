import { clsx } from 'clsx';

const providers = [
  { id: 'MTN', label: 'MTN MoMo' },
  { id: 'AIRTEL', label: 'Airtel Money' }
] as const;

type Props = {
  value: 'MTN' | 'AIRTEL' | null;
  onChange: (value: 'MTN' | 'AIRTEL') => void;
};

export const ProviderSelector = ({ value, onChange }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => onChange(provider.id)}
          className={clsx(
            'rounded-lg border px-4 py-3 text-sm font-medium transition',
            value === provider.id ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200'
          )}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );
};
