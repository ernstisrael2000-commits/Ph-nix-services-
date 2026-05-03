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

export const useAnalytics = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll use multiple snapshot listeners to aggregate data
    const salesQ = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(1000));
    const parcelsQ = query(collection(db, 'parcels'), orderBy('updatedAt', 'desc'));
    const withdrawalsQ = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const affiliatesQ = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
    const productsQ = query(collection(db, 'products'));
    const cardsQ = query(collection(db, 'card_topups'));

    const unsubscribeSales = onSnapshot(salesQ, (salesSnap) => {
      const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      onSnapshot(parcelsQ, (parcelsSnap) => {
        const parcels = parcelsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Parcel[];
        
        onSnapshot(withdrawalsQ, (withdrawalsSnap) => {
          const withdrawals = withdrawalsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as WithdrawalRequest[];
          
          onSnapshot(affiliatesQ, (affiliatesSnap) => {
            const affiliates = affiliatesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Affiliate[];
            
            onSnapshot(productsQ, (productsSnap) => {
              const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
              
              onSnapshot(cardsQ, (cardsSnap) => {
                const cards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

                // Process aggregated data
                const now = new Date();
                
                // 1. Revenue & Profit Calculations
                const totalRevenue = sales.reduce((sum, s) => sum + (s.price || 0), 0);
                const totalProfit = totalRevenue * 0.4; // 40% margin estimate
                const adminBudget = totalProfit * 0.3; // 30% of profit for admins
                
                // Daily Revenue (Last 7 days)
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

                // Monthly Revenue (Last 6 months)
                const last6Months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
                const monthlyRevenue = last6Months.map(month => {
                  const monthSales = sales.filter(s => {
                    const sDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
                    return format(sDate, 'yyyy-MM') === format(month, 'yyyy-MM');
                  });
                  return {
                    name: format(month, 'MMM'),
                    value: monthSales.reduce((sum, s) => sum + (s.price || 0), 0)
                  };
                });

                // 2. Top Products
                const productCounts: Record<string, number> = {};
                sales.forEach(s => {
                  productCounts[s.itemName] = (productCounts[s.itemName] || 0) + 1;
                });
                const topProducts = Object.entries(productCounts)
                  .map(([name, value]) => ({ name, value }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 5);

                // 3. Peak Hours
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

                // 4. Stuck Parcels (Not 'Livré' and updated > 5 days ago)
                const fiveDaysAgo = subDays(now, 5);
                const stuckParcels = parcels.filter(p => {
                  const updatedAt = p.updatedAt?.toDate ? p.updatedAt.toDate() : new Date();
                  return p.status !== 'Livré' && updatedAt < fiveDaysAgo;
                });

                // 5. Suspicious Withdrawals (More than 3 requests from same affiliate in same day)
                const affiliateDailyWithdrawals: Record<string, number> = {};
                const today = startOfDay(now);
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

                // 6. Total Affiliate Balances (Total à payer)
                const totalAffiliateBalances = affiliates.reduce((sum, a) => sum + (a.balance || 0), 0);

                // 7. Low Stock items
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
                  monthlyRevenue,
                  topProducts,
                  peakHours,
                  stuckParcels,
                  suspiciousWithdrawals,
                  lowStockItems
                });
                setLoading(false);
              });
            });
          });
        });
      });
    });

    return () => {
      unsubscribeSales();
    };
  }, []);

  return { stats, loading };
};
