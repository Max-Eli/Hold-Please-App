import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { agentsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;
const APP_REDIRECT_URI = 'holdplease://calendar-connected';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AppointmentSettings'>;
  route: { params: { agentId: string } };
};

interface InfoField {
  key: string;
  label: string;
  enabled: boolean;
  toggleable: boolean;
}

interface AppointmentSettings {
  enabled: boolean;
  duration: number;
  availabilityNote: string;
  infoFields: InfoField[];
  confirmationMessage: string;
}

const DURATION_OPTIONS = [15, 30, 45, 60];

const DEFAULT_INFO_FIELDS: InfoField[] = [
  { key: 'full_name', label: 'Full name', enabled: true, toggleable: false },
  { key: 'phone_number', label: 'Phone number', enabled: true, toggleable: false },
  { key: 'email', label: 'Email address', enabled: false, toggleable: true },
  { key: 'preferred_time', label: 'Preferred date & time', enabled: true, toggleable: false },
  { key: 'reason', label: 'Reason for appointment', enabled: true, toggleable: true },
  { key: 'address', label: 'Address', enabled: false, toggleable: true },
];

const DEFAULT_CONFIRMATION =
  "I've scheduled your appointment. The business owner will confirm the details with you shortly.";

function storageKey(agentId: string) {
  return `@holdplease_appointments_${agentId}`;
}

const APPOINTMENT_SECTION_HEADER = 'Appointment Booking:';

export default function AppointmentSettingsScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const { agentId } = route.params;
  const { organizationId } = useAuth();

  const [settings, setSettings] = useState<AppointmentSettings>({
    enabled: false,
    duration: 30,
    availabilityNote: '',
    infoFields: DEFAULT_INFO_FIELDS.map((f) => ({ ...f })),
    confirmationMessage: DEFAULT_CONFIRMATION,
  });
  const [saving, setSaving] = useState(false);

  // Google Calendar OAuth
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  const checkCalendarConnection = async (): Promise<{ connected: boolean; email: string; connectionId: string }> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !organizationId) return { connected: false, email: '', connectionId: '' };

    const res = await fetch(
      `${API_BASE}/api/connections/?organization_id=${organizationId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return { connected: false, email: '', connectionId: '' };

    const connections = await res.json();
    const gcal = connections.find(
      (c: any) => c.provider === 'google_calendar' && c.status === 'active',
    );
    if (gcal) {
      return { connected: true, email: gcal.account_identifier || '', connectionId: gcal.id };
    }
    return { connected: false, email: '', connectionId: '' };
  };

  const connectCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // 1. Get the OAuth authorization URL from existing backend endpoint
      const res = await fetch(
        `${API_BASE}/api/connections/oauth/initiate/google_calendar?organization_id=${organizationId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) throw new Error(await res.text());
      const { authorize_url } = await res.json();

      // 2. Open full browser for OAuth — user closes browser when done.
      await WebBrowser.openBrowserAsync(authorize_url);

      // 3. After browser closes, check if a google_calendar connection was created
      const result = await checkCalendarConnection();
      if (result.connected) {
        setCalendarConnected(true);
        setCalendarEmail(result.email);
        await AsyncStorage.setItem(`@holdplease_gcal_${agentId}`, JSON.stringify({
          connected: true,
          email: result.email,
          connection_id: result.connectionId,
        }));
        Alert.alert('Connected', 'Google Calendar has been connected successfully.');
      }
    } catch (err: any) {
      console.error('[GCAL] Connect error:', err);
      Alert.alert('Error', err?.message || 'Failed to connect Google Calendar.');
    } finally {
      setConnectingCalendar(false);
    }
  };

  // Load appointment settings + check backend for existing calendar connection
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey(agentId));
        if (stored) {
          const parsed = JSON.parse(stored) as AppointmentSettings;
          setSettings(parsed);
        }

        // Check backend for active google_calendar connection
        const result = await checkCalendarConnection();
        if (result.connected) {
          setCalendarConnected(true);
          setCalendarEmail(result.email);
          await AsyncStorage.setItem(`@holdplease_gcal_${agentId}`, JSON.stringify({
            connected: true,
            email: result.email,
            connection_id: result.connectionId,
          }));
        } else {
          // No active connection — clear local cache
          setCalendarConnected(false);
          setCalendarEmail('');
          await AsyncStorage.removeItem(`@holdplease_gcal_${agentId}`);
        }
      } catch {}
    })();
  }, [agentId]);

  const disconnectCalendar = async () => {
    Alert.alert('Disconnect Calendar', 'This will remove the Google Calendar connection for this agent.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            // Get connection ID from local cache or backend
            const cached = await AsyncStorage.getItem(`@holdplease_gcal_${agentId}`);
            let connectionId = cached ? JSON.parse(cached).connection_id : null;

            if (!connectionId) {
              const result = await checkCalendarConnection();
              connectionId = result.connectionId;
            }

            // Delete connection on backend
            if (connectionId && token) {
              await fetch(`${API_BASE}/api/connections/${connectionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch (err) {
            console.error('[GCAL] Disconnect error:', err);
          }

          setCalendarConnected(false);
          setCalendarEmail('');
          await AsyncStorage.removeItem(`@holdplease_gcal_${agentId}`);
        },
      },
    ]);
  };

  const updateField = <K extends keyof AppointmentSettings>(
    key: K,
    value: AppointmentSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInfoField = (fieldKey: string) => {
    setSettings((prev) => ({
      ...prev,
      infoFields: prev.infoFields.map((f) =>
        f.key === fieldKey && f.toggleable ? { ...f, enabled: !f.enabled } : f,
      ),
    }));
  };

  const buildAppointmentBlock = (): string => {
    const enabledFields = settings.infoFields
      .filter((f) => f.enabled)
      .map((f) => f.label)
      .join(', ');

    return [
      `${APPOINTMENT_SECTION_HEADER}`,
      'You can schedule appointments for callers. When a caller wants to book an appointment:',
      `- Offer available times: ${settings.availabilityNote || 'Use your best judgment based on typical business hours'}`,
      `- Collect: ${enabledFields}`,
      `- Appointment duration: ${settings.duration} minutes`,
      `- After booking, say: ${settings.confirmationMessage}`,
      '- Always confirm the appointment details before ending the call',
    ].join('\n');
  };

  const removeAppointmentBlock = (prompt: string): string => {
    const startIdx = prompt.indexOf(APPOINTMENT_SECTION_HEADER);
    if (startIdx === -1) return prompt;

    // Find the end of the appointment block - look for the next major section
    // or end of string. The block ends at the next double newline followed by
    // a non-indented line, or end of string.
    const afterHeader = prompt.substring(startIdx);
    const nextSectionMatch = afterHeader.match(
      /\n\n(?![-\s])[A-Z]/,
    );

    let endIdx: number;
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      endIdx = startIdx + nextSectionMatch.index;
    } else {
      endIdx = prompt.length;
    }

    const before = prompt.substring(0, startIdx).replace(/\n+$/, '');
    const after = prompt.substring(endIdx).replace(/^\n+/, '');

    return [before, after].filter(Boolean).join('\n\n');
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      // 1. Save to AsyncStorage
      await AsyncStorage.setItem(storageKey(agentId), JSON.stringify(settings));

      // 2. Fetch the current agent to get the system prompt
      const agent = await agentsApi.get(agentId);
      let currentPrompt: string = agent.system_prompt || '';

      // 3. Remove any existing appointment block
      let updatedPrompt = removeAppointmentBlock(currentPrompt);

      // 4. If enabled, append the new appointment block
      if (settings.enabled) {
        const block = buildAppointmentBlock();
        updatedPrompt = updatedPrompt
          ? `${updatedPrompt.trimEnd()}\n\n${block}`
          : block;
      }

      // 5. PATCH the agent
      await agentsApi.update(agentId, { system_prompt: updatedPrompt });

      Alert.alert('Saved', 'Appointment settings have been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [settings, agentId, navigation]);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Appointments</Text>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[s.saveText, saving && s.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. Enable Appointments */}
        <View style={s.card}>
          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Text style={s.toggleLabel}>Enable Appointments</Text>
              <Text style={s.toggleSubtitle}>
                Let your agent schedule appointments with callers.
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(val) => updateField('enabled', val)}
              trackColor={{ false: colors.switchTrack, true: colors.success }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* 2. Appointment Duration */}
        <Text style={s.sectionLabel}>Appointment Duration</Text>
        <View style={s.card}>
          <View style={s.durationRow}>
            {DURATION_OPTIONS.map((dur) => {
              const selected = settings.duration === dur;
              return (
                <TouchableOpacity
                  key={dur}
                  style={[s.durationPill, selected && s.durationPillSelected]}
                  onPress={() => updateField('duration', dur)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      s.durationPillText,
                      selected && s.durationPillTextSelected,
                    ]}
                  >
                    {dur} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Availability Note */}
        <Text style={s.sectionLabel}>Availability</Text>
        <View style={s.card}>
          <TextInput
            style={s.textInput}
            value={settings.availabilityNote}
            onChangeText={(val) => updateField('availabilityNote', val)}
            placeholder="e.g. Available weekdays 9am-5pm, no weekends"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            selectionColor={colors.primary}
          />
        </View>

        {/* 4. Information to Collect */}
        <Text style={s.sectionLabel}>Information to Collect</Text>
        <View style={s.card}>
          {settings.infoFields.map((field, i) => (
            <React.Fragment key={field.key}>
              {i > 0 && <View style={s.sep} />}
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{field.label}</Text>
                {field.toggleable ? (
                  <Switch
                    value={field.enabled}
                    onValueChange={() => toggleInfoField(field.key)}
                    trackColor={{ false: colors.switchTrack, true: colors.success }}
                    thumbColor={colors.white}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                ) : (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* 5. Calendar Connection */}
        <Text style={s.sectionLabel}>Calendar</Text>
        <View style={s.card}>
          {calendarConnected ? (
            <View style={s.calendarConnected}>
              <View style={s.calendarConnectedLeft}>
                <View style={s.calendarIcon}>
                  <Ionicons name="calendar" size={20} color="#4285F4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.calendarConnectedTitle}>Google Calendar</Text>
                  <Text style={s.calendarConnectedEmail}>{calendarEmail || 'Connected'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={disconnectCalendar} activeOpacity={0.6}>
                <Text style={s.calendarDisconnect}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.calendarEmpty}>
              <Ionicons name="calendar-outline" size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={s.calendarEmptyText}>
                Connect your Google Calendar so your agent can check availability and book appointments in real time.
              </Text>
              <TouchableOpacity
                style={[s.calendarBtn, connectingCalendar && { opacity: 0.5 }]}
                onPress={connectCalendar}
                disabled={connectingCalendar}
                activeOpacity={0.7}
              >
                {connectingCalendar ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={16} color={colors.background} style={{ marginRight: 8 }} />
                    <Text style={s.calendarBtnText}>Connect Google Calendar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Confirmation Message */}
        <Text style={s.sectionLabel}>Confirmation message</Text>
        <View style={s.card}>
          <TextInput
            style={s.textInput}
            value={settings.confirmationMessage}
            onChangeText={(val) => updateField('confirmationMessage', val)}
            placeholder="e.g. Great, I've noted your appointment. You'll receive a confirmation shortly."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            selectionColor={colors.primary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    saveText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    saveTextDisabled: {
      opacity: 0.4,
    },

    scroll: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    // Section label
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 2,
    },

    // Card
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },

    // Enable toggle
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    toggleLeft: {
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    toggleSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    // Duration pills
    durationRow: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
    },
    durationPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    durationPillSelected: {
      backgroundColor: colors.primary,
    },
    durationPillText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    durationPillTextSelected: {
      color: colors.background,
      fontWeight: '600',
    },

    // Text inputs
    textInput: {
      fontSize: 15,
      color: colors.textPrimary,
      padding: 14,
      minHeight: 56,
      lineHeight: 21,
    },

    // Info fields
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      minHeight: 48,
    },
    infoLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },

    // Calendar connection
    calendarConnected: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    calendarConnectedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    calendarIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: 'rgba(66, 133, 244, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    calendarConnectedTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    calendarConnectedEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },
    calendarDisconnect: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.error,
    },
    calendarEmpty: {
      padding: 20,
      alignItems: 'center',
    },
    calendarEmptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    calendarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4285F4',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
    },
    calendarBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
  });
