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

// Items: 2 left | center (Services) | 2 right
const LEFT_ITEMS  = [
  { key: 'tracking',    icon: Package,        label: 'Colis'      },
  { key: 'formations',  icon: GraduationCap,  label: 'Formations' },
];
const RIGHT_ITEMS = [
  { key: 'promotion',   icon: Wifi,           label: 'Promotion'  },
  { key: 'wallet',      icon: Wallet,         label: 'Wallet'     },
];
const CENTER_ITEM = { key: 'services', icon: Globe, label: 'Services' };

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

  const filterId = useId().replace(/:/g, '');

  const handlePress = (key: string) => {
    if (key === 'wallet') {
      if (!loggedClient) { onRequestAuth(); return; }
      onViewChange('wallet');
    } else {
      onViewChange(key);
    }
  };

  const SideItem = ({ item }: { item: typeof LEFT_ITEMS[0] }) => {
    const active = currentView === item.key;
    return (
      <button
        onClick={() => handlePress(item.key)}
        className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full group"
      >
        <AnimatePresence>
          {active && (
            <motion.span
              key="dot"
              layoutId="bnav-dot"
              className="absolute top-1.5 w-1 h-1 rounded-full bg-primary"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.35 }}
            />
          )}
        </AnimatePresence>

        {item.key === 'wallet' && loggedClient && balanceHTG > 0 && (
          <span className="absolute top-1.5 right-3 min-w-[18px] h-[14px] px-1 bg-emerald-500 text-white text-[7px] font-black rounded-full flex items-center justify-center leading-none shadow-sm z-10">
            {balanceLabel}
          </span>
        )}

        <motion.div
          animate={{ scale: active ? 1.15 : 1 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className={`p-1.5 rounded-xl transition-colors ${active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'}`}
        >
          <item.icon
            className="h-[22px] w-[22px]"
            strokeWidth={active ? 2.4 : 1.6}
          />
        </motion.div>
        <span className={`text-[9px] font-bold leading-none tracking-tight transition-colors ${
          active ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600'
        }`}>
          {item.label}
        </span>
      </button>
    );
  };

  const centerActive = currentView === CENTER_ITEM.key;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[300]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="relative mx-4 mb-3">

        {/* ── Elevated center button ─────────────────────────────────── */}
        <button
          onClick={() => handlePress(CENTER_ITEM.key)}
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ top: '-22px' }}
          aria-label={CENTER_ITEM.label}
        >
          {/* Glow aura */}
          <span
            className="absolute inset-0 rounded-full blur-xl opacity-60 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6366f1 0%, #818cf8 40%, transparent 70%)' }}
          />
          {/* Gradient circle */}
          <motion.span
            animate={{ scale: centerActive ? 1.08 : 1 }}
            transition={{ type: 'spring', bounce: 0.35 }}
            className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-indigo-400/40"
            style={{ background: 'linear-gradient(145deg, #6366f1 0%, #818cf8 50%, #a78bfa 100%)' }}
          >
            <CENTER_ITEM.icon
              className="h-6 w-6 text-white drop-shadow-sm"
              strokeWidth={centerActive ? 2.5 : 2}
            />
          </motion.span>
        </button>

        {/* ── Bar with SVG notch ─────────────────────────────────────── */}
        <div className="relative h-[62px]">
          {/* SVG background — notched white bar */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 375 62"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id={`shadow-${filterId}`} x="-10%" y="-40%" width="120%" height="180%">
                <feDropShadow dx="0" dy="-3" stdDeviation="8" floodColor="rgba(0,0,0,0.07)" />
                <feDropShadow dx="0" dy="4" stdDeviation="12" floodColor="rgba(0,0,0,0.06)" />
              </filter>
            </defs>
            {/*
              Path: rounded corners at all 4 corners, smooth concave notch at top-center.
              Notch is at x=157.5..217.5 (center 187.5), 22px deep.
            */}
            <path
              d="
                M 24 0
                L 152 0
                C 162 0 165 22 187.5 22
                C 210 22 213 0 223 0
                L 351 0
                Q 375 0 375 24
                L 375 62
                L 0 62
                L 0 24
                Q 0 0 24 0
                Z
              "
              fill="white"
              filter={`url(#shadow-${filterId})`}
            />
          </svg>

          {/* Tab items */}
          <div className="relative z-10 flex h-full items-center">
            {/* Left items */}
            {LEFT_ITEMS.map(item => (
              <SideItem key={item.key} item={item} />
            ))}

            {/* Center spacer (for elevated button) */}
            <div className="w-16 shrink-0" />

            {/* Right items */}
            {RIGHT_ITEMS.map(item => (
              <SideItem key={item.key} item={item} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
