import { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { useAuth } from './AuthProvider';

export type Plan = 'free' | 'premium';

export interface UserRevenue {
  plan: Plan;
  listingCredits: number;
  isPremium: boolean;
  totalSpent: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'listing_fee' | 'subscription' | 'refund';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  method: 'gcash_sim' | 'reward';
}

interface RevenueContextType {
  revenue: UserRevenue;
  isPremium: boolean;
  canPostListing: boolean;
  payListingFee: () => Promise<boolean>;
  subscribeToPremium: () => Promise<boolean>;
  deductListingCredit: () => void;
  cancelPremium: () => void;
  isPaymentLoading: boolean;
  showPaymentModal: boolean;
  setShowPaymentModal: (v: boolean) => void;
  paymentModalType: 'listing' | 'premium' | null;
  setPaymentModalType: (v: 'listing' | 'premium' | null) => void;
  refreshRevenue: () => void;
  // NEW: grant a token from external source (gamified tracker)
  grantListingToken: (reason: string) => void;
}

const RevenueContext = createContext<RevenueContextType | null>(null);

export const STORAGE_KEY = 'agricool_revenue';

export function loadRevenue(userId: string): UserRevenue {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    plan: 'free',
    listingCredits: 3,
    isPremium: false,
    totalSpent: 0,
    transactions: [],
  };
}

export function saveRevenue(userId: string, data: UserRevenue) {
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
}

function makeId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function RevenueProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [revenue, setRevenue] = useState<UserRevenue>({
    plan: 'free',
    listingCredits: 3,
    isPremium: false,
    totalSpent: 0,
    transactions: [],
  });
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<'listing' | 'premium' | null>(null);

  useEffect(() => {
    if (user?.id) {
      const loaded = loadRevenue(user.id);
      setRevenue(loaded);
    }
  }, [user?.id]);

  const save = (updated: UserRevenue) => {
    if (user?.id) saveRevenue(user.id, updated);
    setRevenue(updated);
  };

  const refreshRevenue = () => {
    if (user?.id) setRevenue(loadRevenue(user.id));
  };

  const simulateGCashPayment = async (): Promise<boolean> => {
    setIsPaymentLoading(true);
    await new Promise((r) => setTimeout(r, 2200));
    setIsPaymentLoading(false);
    return Math.random() > 0.05;
  };

  const payListingFee = async (): Promise<boolean> => {
    const success = await simulateGCashPayment();
    if (!success) return false;
    const tx: Transaction = {
      id: makeId(),
      type: 'listing_fee',
      amount: 20,
      description: 'Crop listing fee',
      status: 'completed',
      createdAt: new Date().toISOString(),
      method: 'gcash_sim',
    };
    const updated: UserRevenue = {
      ...revenue,
      totalSpent: revenue.totalSpent + 20,
      transactions: [tx, ...revenue.transactions],
    };
    save(updated);
    return true;
  };

  const subscribeToPremium = async (): Promise<boolean> => {
    const success = await simulateGCashPayment();
    if (!success) return false;
    const tx: Transaction = {
      id: makeId(),
      type: 'subscription',
      amount: 99,
      description: 'AgriCool Premium — 1 month',
      status: 'completed',
      createdAt: new Date().toISOString(),
      method: 'gcash_sim',
    };
    const updated: UserRevenue = {
      ...revenue,
      plan: 'premium',
      isPremium: true,
      listingCredits: 999,
      totalSpent: revenue.totalSpent + 99,
      transactions: [tx, ...revenue.transactions],
    };
    save(updated);
    return true;
  };

  const cancelPremium = () => {
    const updated: UserRevenue = {
      ...revenue,
      plan: 'free',
      isPremium: false,
      listingCredits: 3,
    };
    save(updated);
  };

  const deductListingCredit = () => {
    if (revenue.listingCredits <= 0) return;
    const updated: UserRevenue = {
      ...revenue,
      listingCredits: revenue.listingCredits - 1,
    };
    save(updated);
  };

  // NEW: called by GamifiedDashboard when a milestone token is earned
  const grantListingToken = (reason: string) => {
    const tx: Transaction = {
      id: makeId(),
      type: 'listing_fee',
      amount: 0,
      description: `🎟️ Free Listing Token — ${reason}`,
      status: 'completed',
      createdAt: new Date().toISOString(),
      method: 'reward',
    };
    const updated: UserRevenue = {
      ...revenue,
      listingCredits: revenue.listingCredits + 1,
      transactions: [tx, ...revenue.transactions],
    };
    save(updated);
  };

  const canPostListing = revenue.isPremium || revenue.listingCredits > 0;

  return (
    <RevenueContext.Provider
      value={{
        revenue,
        isPremium: revenue.isPremium,
        canPostListing,
        payListingFee,
        subscribeToPremium,
        deductListingCredit,
        cancelPremium,
        isPaymentLoading,
        showPaymentModal,
        setShowPaymentModal,
        paymentModalType,
        setPaymentModalType,
        refreshRevenue,
        grantListingToken,
      }}
    >
      {children}
    </RevenueContext.Provider>
  );
}

export function useRevenue() {
  const ctx = useContext(RevenueContext);
  if (!ctx) throw new Error('useRevenue must be used within RevenueProvider');
  return ctx;
}