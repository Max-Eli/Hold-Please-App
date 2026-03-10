import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Input from '../components/Input';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, BusinessType } from '../types';
import { useAgents } from '../context/AgentContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getSystemPrompt, generateCustomPrompt } from '../constants/systemPrompts';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateAgent'>;
};

const businessTypes: { value: BusinessType; label: string; icon: string }[] = [
  { value: 'real_estate', label: 'Real Estate', icon: 'home-outline' },
  { value: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
  { value: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { value: 'mobile_carwash', label: 'Carwash', icon: 'car-outline' },
  { value: 'hvac', label: 'HVAC', icon: 'thermometer-outline' },
  { value: 'landscaping', label: 'Landscaping', icon: 'leaf-outline' },
  { value: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
  { value: 'general', label: 'Other', icon: 'briefcase-outline' },
];

export default function CreateAgentScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { agents, createAgent, refreshAgents } = useAgents();
  const { isPro } = useSubscription();
  const [step, setStep] = useState(1);

  // Enforce single agent limit
  useEffect(() => {
    if (agents.length > 0) {
      Alert.alert('Limit Reached', 'You can only have one agent per account. Go to the Agent tab to manage yours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, []);
  const [agentName, setAgentName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [businessDescription, setBusinessDescription] = useState('');
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(false);
  const styles = createStyles(colors);

  const handleNext = () => {
    if (!agentName) {
      Alert.alert('Error', 'Please give your agent a name');
      return;
    }
    if (!businessType) {
      Alert.alert('Error', 'Please select a business type');
      return;
    }
    if (businessType === 'general' && !businessDescription.trim()) {
      Alert.alert('Error', 'Please describe your business');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!greeting) {
      Alert.alert('Error', 'Please set a greeting for your agent');
      return;
    }
    setLoading(true);
    try {
      const systemPrompt =
        businessType === 'general' && businessDescription.trim() && isPro
          ? generateCustomPrompt(agentName, businessDescription.trim())
          : getSystemPrompt(businessType!, agentName);
      const newAgent = await createAgent({
        name: agentName,
        system_prompt: systemPrompt,
        first_message: greeting,
      });
      // Refresh from backend to ensure phone number mapping is synced
      await refreshAgents();
      const phoneMsg = newAgent.phoneNumber
        ? `A phone number (${newAgent.phoneNumber}) has been automatically assigned.`
        : 'A phone number will be assigned shortly.';
      Alert.alert(
        'Agent Created',
        `Your AI voice agent is live! ${phoneMsg}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create agent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => (step > 1 ? setStep(1) : navigation.goBack())}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.stepText}>Step {step} of 2</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progress}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={[styles.bar, step === 2 && styles.barActive]} />
          </View>

          {step === 1 && (
            <>
              <Text style={styles.title}>Name your agent</Text>
              <Text style={styles.subtitle}>
                Give your agent a name and select what type of business it will handle calls for
              </Text>

              <Input
                label="Agent Name"
                placeholder="e.g. Front Desk, Sales Line"
                value={agentName}
                onChangeText={setAgentName}
              />

              <Text style={styles.typeLabel}>Business Type</Text>
              <View style={styles.typeGrid}>
                {businessTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeCard, businessType === type.value && styles.typeCardActive]}
                    onPress={() => setBusinessType(type.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={22}
                      color={businessType === type.value ? colors.primaryLight : colors.textSecondary}
                    />
                    <Text style={[styles.typeText, businessType === type.value && styles.typeTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {businessType === 'general' && (
                <>
                  <Input
                    label="Describe your business"
                    placeholder="e.g. Pet grooming salon offering grooming, boarding, and daycare services"
                    value={businessDescription}
                    onChangeText={setBusinessDescription}
                    multiline
                    numberOfLines={3}
                    style={{ height: 90, textAlignVertical: 'top', paddingTop: 14, marginTop: spacing.md }}
                  />
                  {!isPro && (
                    <TouchableOpacity
                      style={styles.proHint}
                      onPress={() => navigation.navigate('Subscription')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.proHintBadge}>
                        <Text style={styles.proHintBadgeText}>PRO</Text>
                      </View>
                      <Text style={styles.proHintText}>
                        Upgrade for an AI-customized prompt tailored to your business
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </>
              )}

              <Button title="Continue" onPress={handleNext} style={{ marginTop: spacing.lg }} />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>Set your greeting</Text>
              <Text style={styles.subtitle}>
                This is the first thing callers will hear when your agent picks up
              </Text>

              <Input
                label="Greeting Message"
                placeholder="e.g. Hi, thank you for calling Smith's Plumbing! How can I help you today?"
                value={greeting}
                onChangeText={setGreeting}
                multiline
                numberOfLines={4}
                style={{ height: 120, textAlignVertical: 'top', paddingTop: 14 }}
              />

              {/* Live preview */}
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Live Preview</Text>
                <View style={styles.previewBubble}>
                  <View style={styles.previewDot}>
                    <Ionicons name="mic" size={14} color={colors.primaryLight} />
                  </View>
                  <Text style={styles.previewText}>
                    {greeting || 'Your greeting will appear here...'}
                  </Text>
                </View>
              </View>

              <Button
                title="Create Agent"
                onPress={handleCreate}
                loading={loading}
                style={{ marginTop: spacing.lg }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  stepText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '500' },
  progress: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  bar: { height: 3, flex: 1, borderRadius: 2, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.primary },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  typeLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500' },
  typeTextActive: { color: colors.primaryLight },
  preview: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewBubble: {
    flexDirection: 'row',
    backgroundColor: colors.cardLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  previewDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { color: colors.textPrimary, fontSize: fontSize.sm, flex: 1, lineHeight: 20 },
  proHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 8,
  },
  proHintBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proHintBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9500',
    letterSpacing: 0.5,
  },
  proHintText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },
});
