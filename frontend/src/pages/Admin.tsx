import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { adminLogin, fetchAdminOrders, type OrderResponse } from '../lib/api';
import { formatCurrency } from '../lib/format';

type FilterState = {
  status: string;
  provider: string;
  from: string;
  to: string;
};

const defaultFilters: FilterState = {
  status: '',
  provider: '',
  from: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
  to: dayjs().format('YYYY-MM-DD')
};

const statusColors: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-200 text-slate-600'
};

const loadToken = () => localStorage.getItem('adminToken');

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => loadToken());
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (authToken: string, params: FilterState) => {
    setLoading(true);
    try {
      const data = await fetchAdminOrders(authToken, params);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchOrders(token, filters);
  }, [token, filters]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await adminLogin(email, password);
      localStorage.setItem('adminToken', response.token);
      setToken(response.token);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setOrders([]);
  };

  const totals = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + order.amountUgx, 0);
    const paid = orders.filter((order) => order.status === 'PAID').length;
    return { total, paid, count: orders.length };
  }, [orders]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-900">Admin Login</h1>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders Dashboard</h1>
          <p className="text-sm text-slate-600">Monitor packages purchased via Mobile Money.</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
        >
          Log out
        </button>
      </header>

      <main className="mx-auto mt-6 max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
              <p className="text-2xl font-semibold text-slate-900">{totals.count}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
              <p className="text-2xl font-semibold text-slate-900">{totals.paid}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Volume</p>
              <p className="text-2xl font-semibold text-slate-900">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">Provider</label>
              <select
                value={filters.provider}
                onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="MTN">MTN</option>
                <option value="AIRTEL">Airtel</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => fetchOrders(token, filters)}
                className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Refresh
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Order ID</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">MSISDN</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Package</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Provider</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">{order.id}</td>
                    <td className="px-4 py-2 text-slate-700">{order.msisdn}</td>
                    <td className="px-4 py-2 text-slate-700">{order.package.name}</td>
                    <td className="px-4 py-2 text-slate-900">{formatCurrency(order.amountUgx)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status] ?? 'bg-slate-200 text-slate-600'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{order.provider}</td>
                    <td className="px-4 py-2 text-slate-700">{order.voucherCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          {error && <p className="p-4 text-sm text-red-500">{error}</p>}
          {!loading && orders.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No orders found for the selected filters.</p>
          )}
        </section>
      </main>
    </div>
  );
}
