import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
const TWILIO_ACCOUNT_SID = process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN!;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

// --- Organizations ---

export const organizationsApi = {
  list: () => apiRequest<any[]>('/api/organizations/'),

  create: (data: { name: string; owner_id: string }) =>
    apiRequest<any>('/api/organizations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// --- Agents ---

export const agentsApi = {
  list: (organizationId: string) =>
    apiRequest<any[]>(`/api/agents/?organization_id=${organizationId}`),

  get: (agentId: string) => apiRequest<any>(`/api/agents/${agentId}`),

  create: (data: {
    organization_id: string;
    name: string;
    system_prompt: string;
    first_message: string;
    voice_provider?: string;
    voice_id?: string;
    model?: string;
    temperature?: number;
  }) =>
    apiRequest<any>('/api/agents/', {
      method: 'POST',
      body: JSON.stringify({
        voice_provider: 'minimax',
        voice_id: 'English_CalmWoman',
        voice_architecture: 'realtime',
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 150,
        ...data,
      }),
    }),

  update: (agentId: string, data: Record<string, any>) =>
    apiRequest<any>(`/api/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (agentId: string) =>
    apiRequest<any>(`/api/agents/${agentId}`, {
      method: 'DELETE',
    }),
};

// --- Phone Numbers ---

export const phoneNumbersApi = {
  list: (organizationId: string) =>
    apiRequest<any[]>(
      `/api/phone-numbers/?organization_id=${organizationId}`
    ),

  getAvailableTwilioNumbers: (organizationId: string) =>
    apiRequest<any[]>(
      `/api/phone-numbers/twilio-numbers/${organizationId}`
    ),

  connectTwilio: (organizationId: string) =>
    apiRequest<any>('/api/phone-numbers/connect-twilio', {
      method: 'POST',
      body: JSON.stringify({
        organization_id: organizationId,
        account_sid: TWILIO_ACCOUNT_SID,
        auth_token: TWILIO_AUTH_TOKEN,
      }),
    }),

  assignToAgent: (data: {
    phone_number: string;
    agent_id: string;
    organization_id: string;
    twilio_friendly_name?: string;
  }) =>
    apiRequest<any>('/api/phone-numbers/', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        twilio_account_sid: TWILIO_ACCOUNT_SID,
        twilio_auth_token: TWILIO_AUTH_TOKEN,
      }),
    }),

  update: (phoneNumberId: string, data: Record<string, any>) =>
    apiRequest<any>(`/api/phone-numbers/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  unassign: (phoneNumberId: string) =>
    apiRequest<any>(`/api/phone-numbers/${phoneNumberId}`, {
      method: 'DELETE',
    }),
};

// --- Usage / Analytics ---

export const usageApi = {
  summary: (organizationId: string, days = 30) =>
    apiRequest<any>(
      `/api/usage/organizations/${organizationId}/summary?days=${days}`
    ),

  calls: (organizationId: string) =>
    apiRequest<any>(
      `/api/usage/organizations/${organizationId}/calls`
    ),

  callDetail: (callId: string) =>
    apiRequest<any>(`/api/usage/calls/${callId}`),
};
