import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionTier, PremiumFeature } from '../types';

const STORAGE_KEY = '@holdplease_tier';

const PRO_FEATURES: PremiumFeature[] = [
  'edit_system_prompt',
  'ai_custom_prompt',
  'lead_extraction',
  'business_hours',
  'appointment_setting',
];

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isPro: boolean;
  canUse: (feature: PremiumFeature) => boolean;
  minutesLimit: number;
  isLoading: boolean;
  // Called by payment integration when purchase completes
  setTier: (tier: SubscriptionTier) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'pro') setTierState('pro');
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const setTier = useCallback(async (newTier: SubscriptionTier) => {
    setTierState(newTier);
    await AsyncStorage.setItem(STORAGE_KEY, newTier);
  }, []);

  const isPro = tier === 'pro';

  const canUse = useCallback(
    (feature: PremiumFeature): boolean => {
      if (isPro) return true;
      return !PRO_FEATURES.includes(feature);
    },
    [isPro]
  );

  const minutesLimit = isPro ? 500 : 30;

  return (
    <SubscriptionContext.Provider value={{ tier, isPro, canUse, minutesLimit, isLoading, setTier }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
