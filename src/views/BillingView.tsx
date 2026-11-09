import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  CreditCard,
  Zap,
  Check,
  Sparkles,
  Shield,
  ArrowRight,
  History,
  Star,
  Crown,
} from 'lucide-react';
import { CreditTransaction } from '../types';

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$29',
    tagline: 'Get interview-ready fast',
    icon: Sparkles,
    color: 'emerald',
    features: [
      'Real-time grounded answers',
      '500 credits / month',
      'AI debrief notes',
      '1 device (desktop or mobile)',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$79',
    tagline: 'For the full interview loop',
    icon: Star,
    color: 'cyan',
    popular: true,
    features: [
      'Everything in Starter',
      '2,000 credits / month',
      'Coding sandbox + mock interviews',
      'Screenshot & photo answers',
      'Priority model routing',
    ],
  },
  {
    id: 'executive' as const,
    name: 'Executive',
    price: '$199',
    tagline: 'Senior & staff-level roles',
    icon: Crown,
    color: 'purple',
    features: [
      'Everything in Pro',
      '6,000 credits / month',
      'Custom copilot instructions',
      'Admin analytics & token graphs',
      'Priority AI failover lane',
    ],
  },
];

const PACKS = [
  { credits: 100, price: '$9', label: 'Top-up Pack' },
  { credits: 500, price: '$39', label: 'Practice Pack' },
  { credits: 1000, price: '$69', label: 'Bootcamp Pack' },
];

const TX_BADGE: Record<string, { label: string; cls: string }> = {
  purchase: { label: 'Purchase', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  session_deduction: { label: 'Session use', cls: 'bg-slate-800 text-slate-300 border-slate-700' },
  admin_grant: { label: 'Admin grant', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  refund: { label: 'Refund', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
};

export const BillingView: React.FC = () => {
  const { wallet, subscription, refreshState, showToast } = useApp();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTransactions()
      .then(setTransactions)
      .catch((e) => console.warn('Transactions load failed:', e));
  }, []);

  const handlePlan = async (tier: 'starter' | 'pro' | 'executive') => {
    if (subscription?.planTier === tier) {
      showToast(`You are already on the ${tier} plan`, 'info');
      return;
    }
    setBusy(tier);
    try {
      await api.updateSubscription(tier);
      await refreshState();
      showToast(`${tier.charAt(0).toUpperCase() + tier.slice(1)} plan activated`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Plan change failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handlePack = async (credits: number, label: string) => {
    setBusy(`pack-${credits}`);
    try {
      await api.purchaseCredits(credits, label);
      await refreshState();
      const fresh = await api.getTransactions().catch(() => null);
      if (fresh) setTransactions(fresh);
      showToast(`${credits} credits added to your wallet`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Purchase failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Wallet summary */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 lg:p-7 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30">
              <Zap className="h-6 w-6 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credit Wallet</span>
              <div className="text-3xl font-extrabold text-white font-mono">
                {wallet?.balanceCredits ?? '—'} <span className="text-base font-normal text-slate-400">credits</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div>
              <span className="block text-[10px] uppercase tracking-wider">Plan</span>
              <span className="text-sm font-bold text-emerald-400 uppercase">{subscription?.planTier || 'starter'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider">Lifetime bought</span>
              <span className="text-sm font-bold text-white font-mono">{wallet?.lifetimePurchased ?? 0}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider">Lifetime used</span>
              <span className="text-sm font-bold text-white font-mono">{wallet?.lifetimeSpent ?? 0}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 border-t border-slate-800/80 pt-3">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          Open-source build — checkout is simulated end to end. No payment details are ever collected, and the demo
          wallet never runs dry.
        </p>
      </div>

      {/* Subscription plans */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-emerald-400" /> Subscription Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const active = subscription?.planTier === plan.id;
            const accent =
              plan.color === 'purple'
                ? 'border-purple-500/40'
                : plan.color === 'cyan'
                ? 'border-cyan-500/40'
                : 'border-emerald-500/40';
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border bg-slate-900/70 p-6 space-y-4 shadow-lg transition-all ${
                  active ? `${accent} ring-1 ring-inset ring-current` : 'border-slate-800'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      plan.color === 'purple'
                        ? 'bg-purple-500/15 text-purple-300'
                        : plan.color === 'cyan'
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {plan.price}
                    <span className="text-xs font-normal text-slate-400">/mo</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                  <p className="text-[11px] text-slate-400">{plan.tagline}</p>
                </div>

                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlan(plan.id)}
                  disabled={busy !== null}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                    active
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 hover:opacity-90'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {busy === plan.id ? 'Activating…' : active ? 'Current Plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit packs */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-amber-400" /> Credit Packs <span className="text-xs font-normal text-slate-500">(one-time)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PACKS.map((pack) => (
            <div
              key={pack.credits}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex items-center justify-between gap-4 shadow-md"
            >
              <div>
                <div className="text-xl font-extrabold text-white font-mono">
                  {pack.credits.toLocaleString()} <span className="text-xs font-normal text-slate-400">cr</span>
                </div>
                <span className="text-[11px] text-slate-400">{pack.label}</span>
              </div>
              <div className="text-right space-y-1.5">
                <div className="text-lg font-bold text-emerald-400 font-mono">{pack.price}</div>
                <button
                  onClick={() => handlePack(pack.credits, pack.label)}
                  disabled={busy !== null}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors disabled:opacity-50"
                >
                  {busy === `pack-${pack.credits}` ? 'Adding…' : 'Buy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" /> Transaction History
          </h2>
          <button
            onClick={() => {
              api
                .getTransactions()
                .then(setTransactions)
                .catch(() => showToast('Could not refresh transactions', 'error'));
            }}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Refresh <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No transactions yet — buy a pack or run a session to see the ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {transactions.slice(0, 25).map((tx) => {
                  const badge = TX_BADGE[tx.type] || TX_BADGE.purchase;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-[22rem] truncate">{tx.description}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-semibold ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-300'
                        }`}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {tx.amount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{tx.balanceAfter}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[10px]">
                        {new Date(tx.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
