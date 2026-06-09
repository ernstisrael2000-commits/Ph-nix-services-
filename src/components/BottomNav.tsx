import React, { useState, useRef, useEffect } from 'react';
import { Package, Globe, Wallet, Lock, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '../types';
import { useSettings } from '../services/parcelService';

interface BottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  loggedClient: Client | null;
  onOpenWallet: () => void;
  onOpenWalletDeposit?: () => void;
  onOpenWalletWithdrawal?: () => void;
  onRequestAuth: () => void;
}

const NAV_ITEMS = [
  { key: 'services', icon: Globe,   label: 'Services' },
  { key: 'tracking', icon: Package, label: 'Colis'    },
];

export default function BottomNav({ currentView, onViewChange, loggedClient, onOpenWallet, onOpenWalletDeposit, onOpenWalletWithdrawal, onRequestAuth }: BottomNavProps) {
  const { settings } = useSettings();
  const rate = settings?.exchangeRate || 146;
  const balanceHTG = loggedClient ? Math.round((loggedClient.balance ?? 0) * rate) : 0;
  const balanceLabel = balanceHTG > 9999
    ? `${(balanceHTG / 1000).toFixed(1)}k`
    : balanceHTG > 999
      ? `${(balanceHTG / 1000).toFixed(0)}k`
      : String(balanceHTG);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleWalletClick = () => {
    if (!loggedClient) { onRequestAuth(); return; }
    setMenuOpen(v => !v);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[300] bg-white/97 backdrop-blur-2xl border-t border-gray-100"
      style={{
        boxShadow: '0 -8px 40px rgba(0,0,0,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch justify-around max-w-2xl mx-auto">

        {/* Services & Colis tabs */}
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = currentView === key;
          return (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className="relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[58px] group"
            >
              {active && (
                <motion.span
                  layoutId="bnav-bg"
                  className="absolute inset-x-2 top-1.5 bottom-1.5 bg-primary/8 rounded-2xl"
                  transition={{ type: 'spring', bounce: 0.22, duration: 0.38 }}
                />
              )}
              <Icon
                className={`relative z-10 h-[22px] w-[22px] transition-all duration-200 ${
                  active ? 'text-primary scale-110' : 'text-gray-400 group-hover:text-gray-600'
                }`}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className={`relative z-10 text-[9.5px] font-bold leading-none tracking-tight transition-colors ${
                active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
              }`}>
                {label}
              </span>
              {active && (
                <motion.span
                  layoutId="bnav-dot"
                  className="absolute bottom-0 w-5 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', bounce: 0.22, duration: 0.38 }}
                />
              )}
            </button>
          );
        })}

        {/* Wallet tab */}
        <div ref={menuRef} className="relative flex-1 flex flex-col items-center justify-center">
          {/* Wallet quick-action popup */}
          <AnimatePresence>
            {menuOpen && loggedClient && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.3 }}
                className="absolute bottom-[68px] left-1/2 -translate-x-1/2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-10"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
              >
                {/* Balance row */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-primary/5 to-indigo-50 border-b border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Solde</p>
                  <p className="text-sm font-black text-primary leading-tight">
                    ${(loggedClient.balance ?? 0).toFixed(2)} USD
                  </p>
                </div>
                {/* Actions */}
                <button
                  onClick={() => { setMenuOpen(false); onOpenWalletDeposit ? onOpenWalletDeposit() : onOpenWallet(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors group"
                >
                  <div className="h-7 w-7 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                    <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-black text-gray-700">Dépôt</span>
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onOpenWalletWithdrawal ? onOpenWalletWithdrawal() : onOpenWallet(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors group border-t border-gray-50"
                >
                  <div className="h-7 w-7 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 group-hover:bg-rose-200 transition-colors">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-rose-600" />
                  </div>
                  <span className="text-sm font-black text-gray-700">Retrait</span>
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onOpenWallet(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <div className="h-7 w-7 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Wallet className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <span className="text-xs font-black text-gray-500">Voir le wallet</span>
                </button>
                {/* Arrow pointer */}
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleWalletClick}
            className="relative flex flex-col items-center justify-center py-2 gap-0.5 min-h-[58px] w-full group"
          >
            {/* Raised pill for logged-in users */}
            <div className={`relative h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              loggedClient
                ? `bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:-translate-y-0.5 scale-105 ${menuOpen ? 'ring-2 ring-primary/30' : ''}`
                : 'bg-gray-100 group-hover:bg-gray-200'
            }`}>
              {menuOpen && loggedClient
                ? <X className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
                : <Wallet className={`h-[18px] w-[18px] ${loggedClient ? 'text-white' : 'text-gray-400'}`} strokeWidth={2.2} />
              }
            </div>

            {/* Balance badge */}
            {loggedClient && balanceHTG > 0 && !menuOpen && (
              <span className="absolute top-1 right-2 min-w-[20px] h-[15px] px-1 bg-emerald-500 text-white text-[7.5px] font-black rounded-full flex items-center justify-center leading-none shadow-sm">
                {balanceLabel}
              </span>
            )}

            <span className={`text-[9.5px] font-bold leading-none tracking-tight transition-colors ${
              loggedClient ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
            }`}>
              Wallet
            </span>
          </button>
        </div>

      </div>
    </nav>
  );
}
