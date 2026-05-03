import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  limit, 
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, Parcel, WithdrawalRequest, Affiliate } from '../types';
import { subDays, startOfDay, endOfDay, format, isWithinInterval, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  adminBudget: number;
  totalParcels: number;
  totalWithdrawals: number;
  totalAffiliates: number;
  totalAffiliateBalances: number;
  dailyRevenue: { name: string; value: number }[];
  monthlyRevenue: { name: string; value: number }[];
  topProducts: { name: string; value: number }[];
  peakHours: { name: string; value: number }[];
  stuckParcels: Parcel[];
  suspiciousWithdrawals: WithdrawalRequest[];
  lowStockItems: { name: string; stock: number; type: string }[];
}

export const useAnalytics = (isAdmin: boolean) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !auth.currentUser) {
      setLoading(false);
      return;
    }

    let sales: any[] = [];
    let parcels: Parcel[] = [];
    let withdrawals: WithdrawalRequest[] = [];
    let affiliates: Affiliate[] = [];
    let products: any[] = [];
    let cards: any[] = [];

    const updateStats = () => {
      const now = new Date();
      
      // Calculate stats using available data
      // (Only update when all critical data is loaded if desired, or partial updates)
      const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);
      const totalProfit = totalRevenue * 0.4;
      const adminBudget = totalProfit * 0.3;
      
      const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(now, 6 - i));
      const dailyRevenue = last7Days.map(day => {
        const daySales = sales.filter(s => {
          const sDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
          return format(sDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });
        return {
          name: format(day, 'EEE'),
          value: daySales.reduce((sum, s) => sum + (s.price || 0), 0)
        };
      });

      const productCounts: Record<string, number> = {};
      sales.forEach(s => {
        if (s.itemName) productCounts[s.itemName] = (productCounts[s.itemName] || 0) + 1;
      });
      const topProducts = Object.entries(productCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const hourCounts: Record<number, number> = {};
      sales.forEach(s => {
        const sDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
        const hour = sDate.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHours = Array.from({ length: 24 }).map((_, i) => ({
        name: `${i}h`,
        value: hourCounts[i] || 0
      }));

      const fiveDaysAgo = subDays(now, 5);
      const stuckParcels = parcels.filter(p => {
        const updatedAt = p.updatedAt?.toDate ? p.updatedAt.toDate() : new Date();
        return p.status !== 'Livré' && updatedAt < fiveDaysAgo;
      });

      const today = startOfDay(now);
      const affiliateDailyWithdrawals: Record<string, number> = {};
      withdrawals.forEach(w => {
        const wDate = w.createdAt?.toDate ? w.createdAt.toDate() : new Date();
        if (wDate >= today) {
          affiliateDailyWithdrawals[w.affiliateId] = (affiliateDailyWithdrawals[w.affiliateId] || 0) + 1;
        }
      });
      const suspiciousAffiliateIds = Object.keys(affiliateDailyWithdrawals)
        .filter(id => affiliateDailyWithdrawals[id] >= 3);
      const suspiciousWithdrawals = withdrawals.filter(w => 
        suspiciousAffiliateIds.includes(w.affiliateId) && 
        w.status === 'pending'
      );

      const totalAffiliateBalances = affiliates.reduce((sum, a) => sum + (a.balance || 0), 0);

      const lowStockItems = [
        ...products.filter(p => p.stock !== undefined && p.stock <= 5).map(p => ({ name: p.name, stock: p.stock, type: 'Produit' })),
        ...cards.filter(c => c.stock !== undefined && c.stock <= 5).map(c => ({ name: c.name, stock: c.stock, type: 'Carte' }))
      ];

      setStats({
        totalRevenue,
        totalProfit,
        adminBudget,
        totalParcels: parcels.length,
        totalWithdrawals: withdrawals.length,
        totalAffiliates: affiliates.length,
        totalAffiliateBalances,
        dailyRevenue,
        monthlyRevenue: [], // Simplified for now
        topProducts,
        peakHours,
        stuckParcels,
        suspiciousWithdrawals,
        lowStockItems
      });
      setLoading(false);
    };

    const listeners = [
      onSnapshot(query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(1000)), (snap) => {
        sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
      }, (err) => console.error("Sales listener error", err)),
      
      onSnapshot(query(collection(db, 'parcels')), (snap) => {
        parcels = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Parcel[];
        updateStats();
      }),
      
      onSnapshot(query(collection(db, 'withdrawals')), (snap) => {
        withdrawals = snap.docs.map(d => ({ id: d.id, ...d.data() })) as WithdrawalRequest[];
        updateStats();
      }),
      
      onSnapshot(query(collection(db, 'affiliates')), (snap) => {
        affiliates = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Affiliate[];
        updateStats();
      }),
      
      onSnapshot(query(collection(db, 'products')), (snap) => {
        products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
      }),
      
      onSnapshot(query(collection(db, 'card_topups')), (snap) => {
        cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
      })
    ];

    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, [isAdmin]);

  return { stats, loading };
};
