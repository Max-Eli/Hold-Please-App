export type BusinessType =
  | 'real_estate'
  | 'plumbing'
  | 'electrical'
  | 'mobile_carwash'
  | 'hvac'
  | 'landscaping'
  | 'cleaning'
  | 'general';

export interface User {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  businessType: BusinessType;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  phoneNumber: string;
  businessType: BusinessType;
  greeting: string;
  isActive: boolean;
  callsHandled: number;
  createdAt: string;
}

export interface CallLog {
  id: string;
  agentId: string;
  agentName: string;
  callerNumber: string;
  direction: 'inbound' | 'outbound';
  duration: number; // seconds
  status: string;
  startedAt: string;
  endedAt: string;
  transcript?: string;
  summary?: string;
  sentiment?: string;
  recordingUrl?: string;
}

// Subscription
export type SubscriptionTier = 'free' | 'pro';

export type PremiumFeature =
  | 'edit_system_prompt'
  | 'ai_custom_prompt'
  | 'lead_extraction'
  | 'business_hours'
  | 'appointment_setting';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  CreateAgent: undefined;
  AgentDetail: { agentId: string };
  CallDetail: { call: any };
  Subscription: undefined;
  Leads: undefined;
  BusinessHours: { agentId: string };
  AgentKnowledge: { agentId: string };
  AppointmentSettings: { agentId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Agents: undefined;
  Calls: undefined;
  Settings: undefined;
};
