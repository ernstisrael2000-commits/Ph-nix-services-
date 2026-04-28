export type ParcelStatus = 'En route' | 'En transit' | 'Arrivé' | 'Livré';
export type PaymentStatus = 'Payé' | 'Non payé';

export interface Parcel {
  id?: string;
  trackingNumber: string;
  status: ParcelStatus;
  currentLocation: string;
  estimatedArrival?: string;
  proofOfDelivery?: string;
  paymentStatus: PaymentStatus;
  createdAt: any;
  updatedAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'agent';
}

export interface Product {
  id?: string;
  name: string;
  image: string;
  description: string;
  price: string;
  stock?: number;
  whatsappMessage?: string;
  createdAt: any;
}

export interface CardTopup {
  id?: string;
  name: string;
  image: string;
  description: string;
  price: string;
  stock?: number;
  whatsappMessage?: string;
  createdAt: any;
  updatedAt?: any;
}

export type AffiliateLevel = 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'VIP';

export type SponsorType = 'direct' | 'indirect';

export interface AdditionalSponsor {
  id: string;
  type: SponsorType;
}

export interface Affiliate {
  id?: string;
  username: string;
  password: string; 
  name: string;
  balance: number;
  referredClients: number;
  monthlyReferredClients: number;
  monthlySales: number;
  points: number;
  isMonthlyWinner?: boolean;
  code: string;
  level: AffiliateLevel;
  parentAffiliateId?: string;
  grandparentAffiliateId?: string;
  additionalSponsors?: AdditionalSponsor[];
  directRevenue: number;
  indirectRevenue: number;
  totalEarnings: number;
  totalWithdrawn?: number;
  walletId?: string;
  info?: any; // Stores registration data
  createdAt: any;
  updatedAt: any;
}

export interface WithdrawalRequest {
  id?: string;
  affiliateId: string;
  affiliateName: string;
  affiliateCode: string;
  amount: number;
  method: 'MonCash' | 'NatCash' | 'Physical';
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: any;
  updatedAt: any;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'agent_deposit';
export type TransactionStatus = 'pending' | 'completed' | 'approved' | 'rejected' | 'pending_agent';

export interface Agent {
  id?: string;
  uid?: string; // Optional: if agents login via email
  agentCode: string; // 8 digits
  name: string;
  phone: string;
  balance: number;
  status: 'active' | 'inactive';
  walletId: string;
  createdAt: any;
  updatedAt: any;
}

export interface WalletTransaction {
  id?: string;
  affiliateId: string;
  agentId?: string; // For agent deposits
  agentCode?: string; // For agent deposits
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description?: string;
  relatedAffiliateId?: string; // recipientId or senderId
  relatedAffiliateName?: string;
  recipientWalletId?: string; // For transfers
  method?: string;
  accountNumber?: string;
  rejectionReason?: string;
  createdAt: any;
  updatedAt: any;
}

export interface AffiliateNotification {
  id?: string;
  affiliateId: string;
  title: string;
  message: string;
  type: 'level_up' | 'bonus' | 'referral' | 'purchase' | 'revenue' | 'prize' | 'system';
  read: boolean;
  createdAt: any;
}

export interface AppSettings {
  logoUrl?: string;
  whatsappAdminNumber?: string;
  lockAffiliateEdits?: boolean;
  lockAffiliateEditsCode?: string;
  withdrawalsEnabled?: boolean;
  globalAnnouncement?: string;
  showGlobalAnnouncement?: boolean;
  officialWinners?: {
    id: string;
    name: string;
    points: number;
    prize: number;
    monthlySales: number;
    monthlyReferredClients: number;
  }[];
}

export interface Game {
  id?: string;
  name: string;
  image: string;
  description: string;
  priceRange: string;
  whatsappMessage?: string;
  catalog?: { id: string; name: string; price: string; whatsappMessage?: string }[];
  createdAt: any;
  updatedAt?: any;
}

export interface ShippingConfig {
  id?: string;
  type: 'online_purchase' | 'dropshipping';
  addresses: { text: string; id: string; city?: string }[];
  websites: { url: string; name: string; id: string }[];
  videos: { url: string; title: string; id: string }[];
  whatsappNumber?: string;
  whatsappMessage?: string;
  updatedAt: any;
}

export interface AffiliateRequest {
  id?: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
}

export interface Client {
  id?: string;
  name: string;
  phone: string;
  directSponsorId?: string;
  indirectSponsorId?: string;
  createdAt: any;
  updatedAt: any;
}

export interface NavButton {
  id?: string;
  label: string;
  iconName: string;
  targetUrl: string;
  redirectionInstruction?: string;
  color: string;
  order: number;
  createdAt: any;
  updatedAt?: any;
}

export interface AdminAccount {
  id?: string;
  uid?: string;
  fullName: string;
  password: string;
  photoUrl?: string;
  loginCode?: string; // Only for super admin
  isSuperAdmin: boolean;
  permissions: string[];
  failedAttempts: number;
  lockUntil?: any;
  createdAt: any;
  updatedAt: any;
}

export interface AdminLog {
  id?: string;
  adminName: string;
  success: boolean;
  timestamp: any;
  ip?: string;
  userAgent?: string;
}

export interface Sale {
  id?: string;
  itemId: string;
  itemName: string;
  itemType: 'product' | 'game' | 'card';
  price: number;
  affiliateId?: string;
  affiliateName?: string;
  createdAt: any;
}
