import type { Package } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { clsx } from 'clsx';

type Props = {
  pkg: Package;
  selected: boolean;
  onSelect: (pkg: Package) => void;
};

export const PackageCard = ({ pkg, selected, onSelect }: Props) => {
  return (
    <button
      onClick={() => onSelect(pkg)}
      className={clsx(
        'w-full rounded-xl border p-4 text-left shadow-sm transition hover:shadow-md',
        selected ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
        <span className="text-brand-600 font-bold">{formatCurrency(pkg.priceUgx)}</span>
      </div>
      {pkg.durationMinutes && (
        <p className="mt-2 text-sm text-slate-600">Valid for {pkg.durationMinutes} minutes</p>
      )}
      {pkg.dataMb && (
        <p className="mt-1 text-sm text-slate-600">{pkg.dataMb} MB bundle</p>
      )}
    </button>
  );
};
