import React, { useState, useEffect } from 'react';
import {
  Search, Loader2, MapPin, CheckCircle2, Package, Home,
  Truck, Clock, ChevronRight, ArrowRight, CircleDot,
} from 'lucide-react';
import { searchParcel } from '../services/parcelService';
import { Parcel } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

const RECENT_KEY = 'rena_recent_tracking';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecent(num: string) {
  const list = [num, ...getRecent().filter(n => n !== num)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

type Step = { key: string; label: string; icon: React.ReactNode };

const STEPS: Step[] = [
  { key: 'En route',   label: 'En route',   icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: 'En transit', label: 'En transit', icon: <Package className="h-4 w-4" /> },
  { key: 'Arrivé',     label: 'Arrivé',     icon: <Truck className="h-4 w-4" /> },
  { key: 'Livré',      label: 'Livré',      icon: <Home className="h-4 w-4" /> },
];

function getStepIndex(status: string): number {
  return STEPS.findIndex(s => s.key === status);
}

function buildTimeline(parcel: Parcel) {
  const lines: { label: string; sub: string; time: string; active: boolean }[] = [];
  const now = new Date();

  const fmtDate = (d: any) => {
    if (!d) return '';
    const date = d?.toDate ? d.toDate() : new Date(d);
    return isValid(date) ? format(date, 'dd MMM, HH:mm', { locale: fr }) : '';
  };

  const si = getStepIndex(parcel.status);

  if (si >= 3) lines.push({ label: 'Colis livré', sub: parcel.currentLocation || '', time: fmtDate(parcel.updatedAt), active: true });
  if (si >= 2) lines.push({ label: 'Arrivé à destination', sub: parcel.currentLocation || '', time: fmtDate(parcel.updatedAt), active: si === 2 });
  if (si >= 1) lines.push({ label: 'En transit', sub: parcel.currentLocation || 'En cours de transport', time: fmtDate(parcel.createdAt), active: si === 1 });
  lines.push({ label: 'Colis pris en charge', sub: 'Rena Logistics', time: fmtDate(parcel.createdAt), active: si === 0 });

  return lines;
}

export default function TrackingView() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<string[]>(getRecent());

  const handleSearch = async (num?: string) => {
    const query = (num ?? trackingNumber).trim();
    if (!query) return;
    setTrackingNumber(query);
    setLoading(true);
    setError('');
    setParcel(null);
    try {
      const result = await searchParcel(query);
      if (result) {
        setParcel(result);
        pushRecent(query);
        setRecent(getRecent());
      } else {
        setError('Aucun colis trouvé avec ce numéro de suivi.');
      }
    } catch {
      setError('Une erreur est survenue lors de la recherche.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = parcel ? getStepIndex(parcel.status) : -1;
  const timeline = parcel ? buildTimeline(parcel) : [];

  const fmtArrival = (d: any) => {
    if (!d) return 'Non spécifiée';
    const date = new Date(d);
    return isValid(date) ? format(date, 'EEEE, d MMM', { locale: fr }) : 'Non spécifiée';
  };

  const statusColor = (status: string) => {
    if (status === 'Livré') return 'text-emerald-600 bg-emerald-50';
    if (status === 'Arrivé') return 'text-blue-600 bg-blue-50';
    if (status === 'En transit') return 'text-amber-600 bg-amber-50';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-[#EEF2FF] pb-28">
      {/* ── Header ── */}
      <div className="bg-white px-4 pt-5 pb-5 shadow-sm">
        <div className="max-w-xl mx-auto">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="N° de suivi (ex: RNA-001234)"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !trackingNumber.trim()}
              className="px-5 py-3 rounded-2xl bg-primary text-white font-black text-sm shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Suivre'}
            </button>
          </div>

          {/* Recent searches */}
          {recent.length > 0 && !parcel && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {recent.map(r => (
                <button
                  key={r}
                  onClick={() => handleSearch(r)}
                  className="px-3 py-1 rounded-full bg-primary/8 text-primary text-[11px] font-black hover:bg-primary/15 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-red-600 text-xs font-bold bg-red-50 px-3 py-2 rounded-xl"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {error}
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <AnimatePresence mode="wait">
          {/* ── Empty state ── */}
          {!parcel && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-20 w-20 rounded-3xl bg-white shadow-md flex items-center justify-center mb-5">
                <Package className="h-10 w-10 text-primary/40" />
              </div>
              <p className="text-gray-700 font-black text-lg">Suivez votre colis</p>
              <p className="text-gray-400 text-sm mt-1 max-w-[240px]">Entrez votre numéro de suivi Rena pour connaître le statut de votre livraison.</p>
            </motion.div>
          )}

          {/* ── Active Shipment ── */}
          {parcel && (
            <motion.div
              key="parcel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Section label */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-gray-900">Expédition active</h2>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
                  {parcel.paymentStatus === 'Payé' ? '✓ Payé' : 'Paiement requis'}
                </span>
              </div>

              {/* Main card */}
              <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-white/50">
                {/* Delivery info */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Livraison estimée</p>
                      <p className="text-xl font-black text-gray-900 mt-1 capitalize">{fmtArrival(parcel.estimatedArrival)}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`h-2 w-2 rounded-full ${stepIndex === 3 ? 'bg-emerald-500' : 'bg-primary'} animate-pulse`} />
                        <span className={`text-xs font-black ${stepIndex === 3 ? 'text-emerald-600' : 'text-primary'}`}>{parcel.status}</span>
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  {/* Progress steps */}
                  <div className="mt-5 flex items-center gap-1">
                    {STEPS.map((step, i) => {
                      const done = i < stepIndex;
                      const active = i === stepIndex;
                      const upcoming = i > stepIndex;
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className={`h-9 w-9 rounded-2xl flex items-center justify-center transition-all ${
                              done ? 'bg-primary text-white' :
                              active ? 'bg-primary text-white ring-4 ring-primary/20' :
                              'bg-gray-100 text-gray-300'
                            }`}>
                              {step.icon}
                            </div>
                            <span className={`text-[9px] font-bold text-center leading-none ${
                              done || active ? 'text-primary' : 'text-gray-300'
                            }`}>{step.label}</span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 mb-4 rounded-full transition-all ${done ? 'bg-primary' : 'bg-gray-100'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Map / Location strip */}
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-50 to-blue-200">
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(99,102,241,0.3) 20px, rgba(99,102,241,0.3) 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(99,102,241,0.3) 20px, rgba(99,102,241,0.3) 21px)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <MapPin className="h-8 w-8 text-primary drop-shadow-lg" fill="white" />
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1 shadow-md">
                        <p className="text-xs font-black text-gray-700 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          {parcel.currentLocation || 'Localisation en cours…'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-5">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Chronologie</p>
                  <div className="space-y-4">
                    {timeline.map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center">
                          <div className={`h-2.5 w-2.5 rounded-full mt-0.5 ${item.active ? 'bg-primary' : 'bg-gray-200'}`} />
                          {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[20px]" />}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-black ${item.active ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                            {item.time && <p className="text-[10px] text-gray-400 font-semibold shrink-0">{item.time}</p>}
                          </div>
                          {item.sub && <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking number + action */}
                <div className="px-5 pb-5">
                  <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold">Numéro de suivi</p>
                      <p className="text-sm font-black text-gray-800 font-mono">#{parcel.trackingNumber}</p>
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${statusColor(parcel.status)}`}>
                      {parcel.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Other shipments — recent searches */}
              {recent.filter(r => r !== parcel.trackingNumber).length > 0 && (
                <div>
                  <h3 className="text-base font-black text-gray-900 mb-3">Autres colis</h3>
                  <div className="space-y-2">
                    {recent.filter(r => r !== parcel.trackingNumber).map(r => (
                      <button
                        key={r}
                        onClick={() => handleSearch(r)}
                        className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-all group"
                      >
                        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-black text-gray-800 font-mono">#{r}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Cliquer pour suivre</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
