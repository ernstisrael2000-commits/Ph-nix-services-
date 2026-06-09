import React from 'react';
import { Package, Globe, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
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

export default function BottomNav({ currentView, onViewChange, loggedClient, onOpenWallet, onRequestAuth }: BottomNavProps) {
  const { settings } = useSettings();
  const rate = settings?.exchangeRate || 146;
  const balanceHTG = loggedClient ? Math.round((loggedClient.balance ?? 0) * rate) : 0;
  const balanceLabel = balanceHTG > 9999
    ? `${(balanceHTG / 1000).toFixed(1)}k`
    : balanceHTG > 999
      ? `${(balanceHTG / 1000).toFixed(0)}k`
      : String(balanceHTG);

  const handleWalletClick = () => {
    if (!loggedClient) { onRequestAuth(); return; }
    onViewChange('wallet');
  };

  const walletActive = currentView === 'wallet';

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
        <button
          onClick={handleWalletClick}
          className="relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[58px] group"
        >
          {walletActive && (
            <motion.span
              layoutId="bnav-bg"
              className="absolute inset-x-2 top-1.5 bottom-1.5 bg-primary/8 rounded-2xl"
              transition={{ type: 'spring', bounce: 0.22, duration: 0.38 }}
            />
          )}

          <div className={`relative z-10 h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            loggedClient
              ? `bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:-translate-y-0.5 ${walletActive ? 'scale-110' : 'scale-105'}`
              : 'bg-gray-100 group-hover:bg-gray-200'
          }`}>
            <Wallet className={`h-[18px] w-[18px] ${loggedClient ? 'text-white' : 'text-gray-400'}`} strokeWidth={2.2} />
          </div>

          {/* Balance badge */}
          {loggedClient && balanceHTG > 0 && (
            <span className="absolute top-1 right-2 min-w-[20px] h-[15px] px-1 bg-emerald-500 text-white text-[7.5px] font-black rounded-full flex items-center justify-center leading-none shadow-sm">
              {balanceLabel}
            </span>
          )}

          <span className={`relative z-10 text-[9.5px] font-bold leading-none tracking-tight transition-colors ${
            walletActive ? 'text-primary' : loggedClient ? 'text-primary/70' : 'text-gray-400 group-hover:text-gray-600'
          }`}>
            Wallet
          </span>

          {walletActive && (
            <motion.span
              layoutId="bnav-dot"
              className="absolute bottom-0 w-5 h-0.5 bg-primary rounded-full"
              transition={{ type: 'spring', bounce: 0.22, duration: 0.38 }}
            />
          )}
        </button>

      </div>
    </nav>
  );
}
