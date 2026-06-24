import React, { useId } from 'react';
import { Package, Globe, Wallet, GraduationCap, Wifi } from 'lucide-react';
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
  { key: 'tracking',    icon: Package,        label: 'Colis'      },
  { key: 'formations',  icon: GraduationCap,  label: 'Formations' },
  { key: 'services',    icon: Globe,          label: 'Services'   },
  { key: 'promotion',   icon: Wifi,           label: 'Promotion'  },
  { key: 'wallet',      icon: Wallet,         label: 'Wallet'     },
];

export default function BottomNav({
  currentView, onViewChange, loggedClient, onOpenWallet, onRequestAuth,
}: BottomNavProps) {
  const { settings } = useSettings();
  const rate = settings?.exchangeRate || 146;
  const balanceHTG = loggedClient ? Math.round((loggedClient.balance ?? 0) * rate) : 0;
  const balanceLabel = balanceHTG > 9999
    ? `${(balanceHTG / 1000).toFixed(1)}k`
    : balanceHTG > 999
      ? `${(balanceHTG / 1000).toFixed(0)}k`
      : String(balanceHTG);

  const handlePress = (key: string) => {
    if (key === 'wallet') {
      if (!loggedClient) { onRequestAuth(); return; }
      onViewChange('wallet');
    } else {
      onViewChange(key);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[300]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Outer container — extra top padding to accommodate elevated bubble */}
      <div className="relative mx-4 mb-3 pt-8">

        {/* White rounded bar */}
        <div className="h-[58px] bg-white rounded-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06)]" />

        {/* Tabs overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[58px] flex items-center">
          {NAV_ITEMS.map((item) => {
            const active = currentView === item.key;
            const isWallet = item.key === 'wallet';
            const showBadge = isWallet && loggedClient && balanceHTG > 0;

            return (
              <button
                key={item.key}
                onClick={() => handlePress(item.key)}
                className="relative flex-1 flex flex-col items-center justify-center h-full group"
                aria-label={item.label}
              >
                {/* Elevated active bubble — moves between tabs via layoutId */}
                {active && (
                  <motion.div
                    layoutId="active-nav-bubble"
                    className="absolute flex items-center justify-center w-14 h-14 rounded-full shadow-lg"
                    style={{
                      top: '-28px',
                      background: 'linear-gradient(145deg, #6366f1 0%, #818cf8 55%, #a78bfa 100%)',
                      boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
                    }}
                    transition={{ type: 'spring', bounce: 0.28, duration: 0.42 }}
                  >
                    {/* Inner glow ring */}
                    <span className="absolute inset-1 rounded-full border border-white/20" />
                    <item.icon className="h-[22px] w-[22px] text-white drop-shadow-sm" strokeWidth={2.2} />
                  </motion.div>
                )}

                {/* Badge (wallet balance) */}
                {showBadge && !active && (
                  <span className="absolute top-1.5 right-3 min-w-[18px] h-[14px] px-1 bg-emerald-500 text-white text-[7px] font-black rounded-full flex items-center justify-center leading-none shadow-sm z-10 pointer-events-none">
                    {balanceLabel}
                  </span>
                )}

                {/* Inactive state: icon + label */}
                <AnimatePresence>
                  {!active && (
                    <motion.div
                      key="inactive"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <item.icon
                        className="h-[20px] w-[20px] text-gray-400 group-hover:text-gray-600 transition-colors"
                        strokeWidth={1.65}
                      />
                      <span className="text-[9px] font-bold text-gray-400 group-hover:text-gray-600 leading-none transition-colors">
                        {item.label}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
