import { useId } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
};

export const PhoneInput = ({ value, onChange, error }: Props) => {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        Mobile number
      </label>
      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <span className="text-sm font-semibold text-slate-500">+256</span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="7XXXXXXXX"
          className="ml-2 w-full border-none text-sm focus:outline-none"
          inputMode="tel"
          maxLength={9}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
