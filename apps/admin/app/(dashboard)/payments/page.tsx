'use client';

import { useState, useEffect, useCallback } from 'react';

import {
    Wallet,
    Clock,
    CheckCircle2,
    Banknote,
    CalendarDays,
    X,
    ArrowUpRight,
    RefreshCcw,
    TrendingUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Balance {
    processing: number;
    available: number;
    paidOutThisMonth: number;
    nextSettlementEta: string | null;
}

interface Transaction {
    id: string;
    orderNumber: string | null;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
    razorpaySettlementId: string | null;
    grossAmount: number;
    platformFee: number;
    razorpayFee: number;
    netAmount: number;
    status: string;
    settlementEta: string | null;
    capturedAt: string;
    settledAt: string | null;
    paidOutAt: string | null;
    payoutId: string | null;
}

interface TransactionsResponse {
    data: Transaction[];
    meta: { total: number; page: number; totalPages: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    CAPTURED: {
        label: 'Processing',
        className:
            'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    },
    SETTLED: {
        label: 'Available',
        className:
            'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
    },
    PAID_OUT: {
        label: 'Paid',
        className:
            'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    },
    REFUNDED: {
        label: 'Refunded',
        className:
            'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
    },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        className: 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30',
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${cfg.className}`}
        >
            {cfg.label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE STEP
// ─────────────────────────────────────────────────────────────────────────────

function TimelineStep({
    label,
    date,
    done,
}: {
    label: string;
    date: string | null;
    done: boolean;
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
                <div
                    className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${done ? 'bg-emerald-400' : 'bg-slate-600 border border-slate-500'
                        }`}
                />
                <div className="w-px flex-1 bg-slate-700 mt-1" />
            </div>
            <div className="pb-5">
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {date ?? 'Pending'}
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION MODAL
// ─────────────────────────────────────────────────────────────────────────────

function TransactionModal({
    txn,
    onClose,
}: {
    txn: Transaction;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Transaction</p>
                        <h2 className="text-lg font-bold text-white mt-0.5">
                            {txn.orderNumber ?? txn.razorpayOrderId.slice(-10)}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                        { label: 'Gross Amount', value: formatINR(txn.grossAmount) },
                        { label: 'Razorpay Fee (2%)', value: formatINR(txn.razorpayFee) },
                        { label: 'Platform Fee (0.7%)', value: formatINR(txn.platformFee) },
                        { label: 'Net (Yours)', value: formatINR(txn.netAmount) },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            className="bg-slate-800 rounded-xl p-3 text-center"
                        >
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="text-sm font-bold text-white mt-1">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-slate-400">Current Status</span>
                    <StatusBadge status={txn.status} />
                </div>

                {/* Settlement Timeline */}
                <div className="border-t border-slate-700/50 pt-5">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">
                        Settlement Timeline
                    </p>
                    <div>
                        <TimelineStep
                            label="Customer Paid"
                            date={formatDateTime(txn.capturedAt)}
                            done={true}
                        />
                        <TimelineStep
                            label="Payment Captured"
                            date={formatDate(txn.capturedAt)}
                            done={true}
                        />
                        <TimelineStep
                            label={`Settlement ETA${txn.settlementEta ? ' (T+3 estimate)' : ''}`}
                            date={txn.settlementEta ? formatDate(txn.settlementEta) : null}
                            done={!!txn.settledAt}
                        />
                        <TimelineStep
                            label="Settlement Confirmed"
                            date={txn.settledAt ? formatDateTime(txn.settledAt) : null}
                            done={!!txn.settledAt}
                        />
                        <TimelineStep
                            label="Payout"
                            date={txn.paidOutAt ? formatDateTime(txn.paidOutAt) : null}
                            done={!!txn.paidOutAt}
                        />
                    </div>
                </div>

                {/* Razorpay IDs */}
                <div className="border-t border-slate-700/50 pt-4 mt-1 space-y-2">
                    {[
                        { label: 'Razorpay Order', value: txn.razorpayOrderId },
                        { label: 'Payment ID', value: txn.razorpayPaymentId },
                        { label: 'Settlement ID', value: txn.razorpaySettlementId },
                    ].map(({ label, value }) =>
                        value ? (
                            <div key={label} className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">{label}</span>
                                <span className="text-xs font-mono text-slate-300 truncate max-w-[180px]">
                                    {value}
                                </span>
                            </div>
                        ) : null
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARD
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
    icon: Icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub?: string;
    accent?: string;
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    {label}
                </span>
                <Icon className={`w-4 h-4 ${accent ?? 'text-slate-500'}`} />
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
    const [balance, setBalance] = useState<Balance | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
    const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use native fetch to bypass the global axios 401-logout interceptor.
    // A 401 here should show an inline error, NOT redirect to /login.
    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const base = process.env.NEXT_PUBLIC_API_URL ?? '';
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            const [balRes, txRes] = await Promise.all([
                fetch(`${base}/payments/balance`, { headers }),
                fetch(`${base}/payments/transactions?page=${page}&limit=20`, { headers }),
            ]);

            if (balRes.status === 401 || txRes.status === 401) {
                setError('Session expired — please log out and log back in.');
                return;
            }

            if (!balRes.ok || !txRes.ok) {
                setError('Failed to load payment data. Please try again.');
                return;
            }

            const balData = await balRes.json();
            const txData = await txRes.json();

            setBalance(balData.data);
            setTransactions(txData.data);
            setMeta(txData.meta);
        } catch {
            setError('Network error — check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    async function handlePayout() {
        if (!confirm('Trigger a payout for all available (settled) transactions?')) return;
        setPayoutLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const base = process.env.NEXT_PUBLIC_API_URL ?? '';
            const res = await fetch(`${base}/payments/payout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data?.error ?? 'Payout failed. Please try again.');
                return;
            }
            await fetchData(meta.page);
        } catch {
            alert('Network error — payout request failed.');
        } finally {
            setPayoutLoading(false);
        }
    }

    async function handleSyncSettlements() {
        setSyncLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const base = process.env.NEXT_PUBLIC_API_URL ?? '';
            const res = await fetch(`${base}/payments/sync-settlements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data?.error ?? 'Settlement sync failed. Please try again.');
                return;
            }
            // Refresh data after sync
            await fetchData(meta.page);
            alert('Settlement sync completed successfully!');
        } catch {
            alert('Network error — settlement sync failed.');
        } finally {
            setSyncLoading(false);
        }
    }

    // ── LOADING ──
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCcw className="w-6 h-6 text-slate-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Loading payments…</p>
                </div>
            </div>
        );
    }

    // ── ERROR ──
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-rose-400 font-medium">{error}</p>
                    <button
                        onClick={() => fetchData(1)}
                        className="mt-4 text-sm text-slate-400 underline hover:text-white transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const nextDate = balance?.nextSettlementEta
        ? formatDate(balance.nextSettlementEta)
        : '—';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* ── MODAL ── */}
            {selectedTxn && (
                <TransactionModal
                    txn={selectedTxn}
                    onClose={() => setSelectedTxn(null)}
                />
            )}

            {/* ── PAGE SHELL ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Wallet className="w-6 h-6 text-indigo-400" />
                            Payments
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Your real-time settlement ledger
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSyncSettlements}
                            disabled={syncLoading}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition"
                            title="Sync settlements from Razorpay"
                        >
                            <RefreshCcw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                            Sync
                        </button>
                        <button
                            onClick={handlePayout}
                            disabled={payoutLoading || (balance?.available ?? 0) === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition"
                        >
                            {payoutLoading ? (
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowUpRight className="w-4 h-4" />
                            )}
                            Request Payout
                        </button>
                    </div>
                </div>

                {/* ── SUMMARY CARDS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <SummaryCard
                        icon={Clock}
                        label="Processing Balance"
                        value={formatINR(balance?.processing ?? 0)}
                        sub={`Settling ~${nextDate}`}
                        accent="text-amber-400"
                    />
                    <SummaryCard
                        icon={CheckCircle2}
                        label="Available for Payout"
                        value={formatINR(balance?.available ?? 0)}
                        sub="Ready to withdraw"
                        accent="text-blue-400"
                    />
                    <SummaryCard
                        icon={CalendarDays}
                        label="Next Settlement"
                        value={nextDate}
                        sub="T+3 estimate, cron confirmed"
                        accent="text-indigo-400"
                    />
                    <SummaryCard
                        icon={TrendingUp}
                        label="Paid Out This Month"
                        value={formatINR(balance?.paidOutThisMonth ?? 0)}
                        sub="Current calendar month"
                        accent="text-emerald-400"
                    />
                </div>

                {/* ── TRANSACTION TABLE ── */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {/* Table header */}
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-slate-400" />
                            Transactions
                            <span className="ml-1 text-xs text-slate-500 font-normal">
                                ({meta.total} total)
                            </span>
                        </h2>
                        <button
                            onClick={() => fetchData(meta.page)}
                            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
                            title="Refresh"
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                            <Wallet className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm">No transactions yet</p>
                            <p className="text-xs mt-1 text-slate-700">
                                Transactions appear here after a customer&#39;s payment is captured.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800">
                                            {['Order', 'Gross', 'Rzp Fee (2%)', 'Platform (0.7%)', 'Net (Yours)', 'Status', 'Settlement Date', 'Payout Date'].map(
                                                (h) => (
                                                    <th
                                                        key={h}
                                                        className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                                                    >
                                                        {h}
                                                    </th>
                                                )
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {transactions.map((txn) => (
                                            <tr
                                                key={txn.id}
                                                onClick={() => setSelectedTxn(txn)}
                                                className="cursor-pointer hover:bg-slate-800/40 transition group"
                                            >
                                                <td className="px-6 py-4 font-mono text-slate-300 text-xs group-hover:text-white transition">
                                                    {txn.orderNumber ?? txn.razorpayOrderId.slice(-12)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-200 font-medium">
                                                    {formatINR(txn.grossAmount)}
                                                </td>
                                                <td className="px-6 py-4 text-rose-400/80">
                                                    {formatINR(txn.razorpayFee)}
                                                </td>
                                                <td className="px-6 py-4 text-amber-400/80">
                                                    {formatINR(txn.platformFee)}
                                                </td>
                                                <td className="px-6 py-4 text-emerald-400 font-semibold">
                                                    {formatINR(txn.netAmount)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={txn.status} />
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {txn.settledAt
                                                        ? formatDate(txn.settledAt)
                                                        : txn.settlementEta
                                                            ? `~${formatDate(txn.settlementEta)}`
                                                            : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {formatDate(txn.paidOutAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden divide-y divide-slate-800/60">
                                {transactions.map((txn) => (
                                    <div
                                        key={txn.id}
                                        onClick={() => setSelectedTxn(txn)}
                                        className="px-4 py-4 cursor-pointer hover:bg-slate-800/30 transition"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-xs font-mono text-slate-400">
                                                {txn.orderNumber ?? txn.razorpayOrderId.slice(-12)}
                                            </p>
                                            <StatusBadge status={txn.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-slate-200 font-medium">
                                                    {formatINR(txn.grossAmount)}
                                                </p>
                                                <p className="text-xs text-emerald-400 mt-0.5">
                                                    Net: {formatINR(txn.netAmount)} &nbsp;
                                                    <span className="text-slate-600">| Rzp: {formatINR(txn.razorpayFee)} | Plat: {formatINR(txn.platformFee)}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">
                                                    {txn.settledAt
                                                        ? formatDate(txn.settledAt)
                                                        : `ETA ${formatDate(txn.settlementEta)}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {meta.totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                        Page {meta.page} of {meta.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={meta.page <= 1}
                                            onClick={() => fetchData(meta.page - 1)}
                                            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={meta.page >= meta.totalPages}
                                            onClick={() => fetchData(meta.page + 1)}
                                            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
