import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { organizationsApi } from '../lib/api';
import { agentsApi } from '../lib/api';
import { User, BusinessType } from '../types';
import { Session } from '@supabase/supabase-js';

interface SignUpResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextType {
  user: User | null;
  organizationId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (data: {
    fullName: string;
    email: string;
    password: string;
    businessName: string;
    businessType: BusinessType;
  }) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);

  // Load session on app start
  useEffect(() => {
    // Only use onAuthStateChange — it fires on initial load too
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadUserFromSession(session);
        } else {
          setUser(null);
          setOrganizationId(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserFromSession = async (session: Session) => {
    // Prevent duplicate concurrent calls
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const supaUser = session.user;
      const metadata = supaUser.user_metadata || {};
      console.log('[AUTH] loadUserFromSession called for:', supaUser.email);

      // Fetch existing organizations
      let orgId: string | null = null;
      try {
        const orgs = await organizationsApi.list();
        console.log('[AUTH] orgs response:', JSON.stringify(orgs));

        if (orgs && orgs.length > 0) {
          if (orgs.length === 1) {
            orgId = orgs[0].id;
          } else {
            // Multiple orgs — find the one that has agents
            for (const org of orgs) {
              try {
                const agents = await agentsApi.list(org.id);
                if (agents && agents.length > 0) {
                  orgId = org.id;
                  console.log('[AUTH] Found org with agents:', org.id);
                  break;
                }
              } catch {
                // skip
              }
            }
            // If none had agents, use the first one
            if (!orgId) {
              orgId = orgs[0].id;
            }
          }
        } else {
          // No org exists — create one
          const org = await organizationsApi.create({
            name: metadata.business_name || 'My Business',
            owner_id: supaUser.id,
          });
          orgId = org.id;
        }
      } catch (err) {
        console.error('[AUTH] Org fetch/create failed:', err);
      }

      console.log('[AUTH] Setting orgId:', orgId);
      setUser({
        id: supaUser.id,
        email: supaUser.email || '',
        fullName: metadata.full_name || '',
        businessName: metadata.business_name || '',
        businessType: metadata.business_type || 'general',
        createdAt: supaUser.created_at,
      });
      setOrganizationId(orgId);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const signUp = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
      businessName: string;
      businessType: BusinessType;
    }): Promise<SignUpResult> => {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            business_name: data.businessName,
            business_type: data.businessType,
            source: 'mobile_app',
          },
        },
      });

      if (error) throw error;
      if (!authData.user) throw new Error('Sign up failed');

      const needsEmailConfirmation = !authData.session;

      if (authData.session) {
        try {
          const org = await organizationsApi.create({
            name: data.businessName,
            owner_id: authData.user.id,
          });
          setOrganizationId(org.id);
        } catch {
          // Org creation may fail if it already exists, continue
        }
      }

      return { needsEmailConfirmation };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // onAuthStateChange will fire and call loadUserFromSession
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganizationId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organizationId,
        isAuthenticated: !!user,
        isLoading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
