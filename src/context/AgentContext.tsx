import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { agentsApi, phoneNumbersApi } from '../lib/api';
import { useAuth } from './AuthContext';
import { Agent } from '../types';

interface AgentContextType {
  agents: Agent[];
  isLoading: boolean;
  refreshAgents: () => Promise<void>;
  createAgent: (data: {
    name: string;
    system_prompt: string;
    first_message: string;
    voice_provider?: string;
    voice_id?: string;
  }) => Promise<Agent>;
  updateAgent: (id: string, updates: Record<string, any>) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { organizationId, isAuthenticated } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshAgents = useCallback(async () => {
    console.log('[AGENTS] refreshAgents called, orgId:', organizationId);
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const data = await agentsApi.list(organizationId);
      console.log('[AGENTS] agents response:', JSON.stringify(data));
      const mapped: Agent[] = (data || []).map((a: any) => ({
        id: a.id,
        name: a.name || 'Unnamed Agent',
        phoneNumber: '',
        businessType: a.business_type || 'general',
        greeting: a.first_message || '',
        isActive: a.is_active !== false,
        callsHandled: 0,
        createdAt: a.created_at || new Date().toISOString(),
      }));

      // Fetch phone numbers to match with agents
      try {
        const phones = await phoneNumbersApi.list(organizationId);
        console.log('[AGENTS] phones response:', JSON.stringify(phones));
        if (phones && phones.length > 0) {
          for (const phone of phones) {
            const agent = mapped.find((a) => a.id === phone.agent_id);
            if (agent) {
              agent.phoneNumber = phone.phone_number || '';
            }
          }
        }
      } catch {
        // Phone number fetch can fail if none exist yet
      }

      setAgents(mapped);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Auto-refresh when org changes
  useEffect(() => {
    if (isAuthenticated && organizationId) {
      refreshAgents();
    }
  }, [isAuthenticated, organizationId, refreshAgents]);

  const createAgent = useCallback(
    async (data: {
      name: string;
      system_prompt: string;
      first_message: string;
      voice_provider?: string;
      voice_id?: string;
    }): Promise<Agent> => {
      if (!organizationId) throw new Error('No organization');

      // First, ensure Twilio is connected for this org
      try {
        await phoneNumbersApi.connectTwilio(organizationId);
      } catch {
        // May already be connected, that's fine
      }

      // Create the agent on the backend
      const created = await agentsApi.create({
        organization_id: organizationId,
        ...data,
      });

      // Try to auto-assign a phone number
      let assignedPhone = '';
      try {
        const availableNumbers =
          await phoneNumbersApi.getAvailableTwilioNumbers(organizationId);
        if (availableNumbers && availableNumbers.length > 0) {
          // Find a number not already assigned
          const existingPhones = await phoneNumbersApi.list(organizationId);
          const usedNumbers = new Set(
            (existingPhones || []).map((p: any) => p.phone_number)
          );
          const freeNumber = availableNumbers.find(
            (n: any) => !usedNumbers.has(n.phone_number)
          );

          if (freeNumber) {
            await phoneNumbersApi.assignToAgent({
              phone_number: freeNumber.phone_number,
              agent_id: created.id,
              organization_id: organizationId,
              twilio_friendly_name: freeNumber.friendly_name,
            });
            assignedPhone = freeNumber.phone_number;
          }
        }
      } catch (err) {
        console.warn('Auto phone assignment failed:', err);
      }

      const newAgent: Agent = {
        id: created.id,
        name: created.name,
        phoneNumber: assignedPhone,
        businessType: created.business_type || 'general',
        greeting: created.first_message || '',
        isActive: true,
        callsHandled: 0,
        createdAt: created.created_at || new Date().toISOString(),
      };

      setAgents((prev) => [...prev, newAgent]);
      return newAgent;
    },
    [organizationId]
  );

  const updateAgent = useCallback(
    async (id: string, updates: Record<string, any>) => {
      console.log('[AGENTS] updateAgent called:', id, JSON.stringify(updates));
      // PUT requires full object — fetch current, merge, then send
      const current = await agentsApi.get(id);
      const merged = { ...current, ...updates };
      // Remove read-only fields the backend won't accept
      delete merged.id;
      delete merged.created_at;
      delete merged.organization_id;
      console.log('[AGENTS] updateAgent sending merged:', JSON.stringify(merged));
      const result = await agentsApi.update(id, merged);
      console.log('[AGENTS] updateAgent response:', JSON.stringify(result));
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    []
  );

  const removeAgent = useCallback(
    async (id: string) => {
      console.log('[AGENTS] deleteAgent called:', id);
      // Unassign any phone numbers before deleting the agent
      if (organizationId) {
        try {
          const phones = await phoneNumbersApi.list(organizationId);
          const agentPhones = (phones || []).filter((p: any) => p.agent_id === id);
          for (const phone of agentPhones) {
            await phoneNumbersApi.unassign(phone.id);
          }
        } catch {
          // Continue with deletion even if unassign fails
        }
      }
      await agentsApi.delete(id);
      console.log('[AGENTS] deleteAgent success');
      setAgents((prev) => prev.filter((a) => a.id !== id));
    },
    [organizationId]
  );

  return (
    <AgentContext.Provider
      value={{
        agents,
        isLoading,
        refreshAgents,
        createAgent,
        updateAgent,
        removeAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
}
