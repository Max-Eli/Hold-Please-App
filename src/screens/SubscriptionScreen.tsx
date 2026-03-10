import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Subscription'>;
};

const PRO_FEATURES = [
  { icon: 'create-outline', title: 'Custom System Prompts', desc: 'Edit how your agent handles calls' },
  { icon: 'sparkles-outline', title: 'AI Prompt Builder', desc: 'Auto-generate prompts for any business' },
  { icon: 'people-outline', title: 'Lead Capture', desc: 'Extract caller details automatically' },
  { icon: 'time-outline', title: 'Business Hours', desc: 'Schedule when your agent is active' },
  { icon: 'calendar-outline', title: 'Smart Scheduling', desc: 'Let your agent book appointments' },
  { icon: 'timer-outline', title: '500 min/month', desc: '16x more talk time than the free plan' },
  { icon: 'shield-checkmark-outline', title: 'Priority Support', desc: 'Get help when you need it' },
];

const FREE_INCLUDES = [
  '1 AI voice agent',
  'Pre-built industry prompts',
  'Call logs & analytics',
  'Push notifications',
  '30 min/month',
];

export default function SubscriptionScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { isPro, setTier } = useSubscription();
  const s = createStyles(colors);

  const handleSubscribe = () => {
    // TODO: Replace with RevenueCat / Stripe integration
    Alert.alert(
      'Coming Soon',
      'In-app subscriptions are being set up. Contact support@holdplease.ai for early Pro access.',
      [{ text: 'OK' }]
    );
  };

  const handleRestore = () => {
    Alert.alert('Restore', 'No previous purchases found.', [{ text: 'OK' }]);
  };

  // Already Pro — show plan status
  if (isPro) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <View style={{ width: 32 }} />
          <Text style={s.topBarTitle}>Subscription</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.activeCard}>
            <View style={s.activeBadge}>
              <Ionicons name="diamond" size={20} color="#FF9500" />
            </View>
            <Text style={s.activeTitle}>Pro Plan</Text>
            <Text style={s.activeDesc}>You have access to all premium features</Text>
            <View style={s.activeFeatures}>
              {PRO_FEATURES.map((f) => (
                <View key={f.title} style={s.activeRow}>
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                  <Text style={s.activeRowText}>{f.title}</Text>
                </View>
              ))}
            </View>
          </View>
          <TouchableOpacity style={s.manageBtn} onPress={() => Alert.alert('Manage', 'Contact support@holdplease.ai to manage your subscription.')}>
            <Text style={s.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Free tier — show upgrade paywall
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <View style={{ width: 32 }} />
        <Text style={s.topBarTitle}>Subscription</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="diamond" size={26} color="#FF9500" />
          </View>
          <Text style={s.heroTitle}>Go Pro</Text>
          <Text style={s.heroSub}>Unlock the full power of your AI agent</Text>
        </View>

        {/* Features */}
        <View style={s.featuresCard}>
          <Text style={s.featuresLabel}>EVERYTHING IN PRO</Text>
          {PRO_FEATURES.map((f, i) => (
            <View key={f.title} style={[s.featureRow, i === PRO_FEATURES.length - 1 && { marginBottom: 0 }]}>
              <View style={s.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color={colors.textPrimary} />
              </View>
              <View style={s.featureText}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Current plan */}
        <View style={s.currentPlan}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={s.currentPlanText}>Your plan: Free (30 min/month)</Text>
        </View>

        {/* Free includes */}
        <View style={s.freeCard}>
          <Text style={s.freeLabel}>FREE PLAN INCLUDES</Text>
          {FREE_INCLUDES.map((item) => (
            <View key={item} style={s.freeRow}>
              <Ionicons name="checkmark" size={14} color={colors.textMuted} />
              <Text style={s.freeRowText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <Text style={s.priceAmount}>$49</Text>
            <Text style={s.pricePeriod}>/month</Text>
          </View>
          <Text style={s.priceNote}>500 minutes included</Text>
          <Text style={s.priceCancel}>Cancel anytime. No contracts.</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.cta} onPress={handleSubscribe} activeOpacity={0.8}>
          <Text style={s.ctaText}>Subscribe to Pro</Text>
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={s.restore} onPress={handleRestore}>
          <Text style={s.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Fine print */}
        <Text style={s.finePrint}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Hero
  hero: { alignItems: 'center', marginTop: 12, marginBottom: 32 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // Features card
  featuresCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  featuresLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { marginLeft: 14, flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Current plan
  currentPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  currentPlanText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Free includes
  freeCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  freeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  freeRowText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Pricing
  priceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  priceCancel: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  // CTA
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '600',
  },

  // Restore
  restore: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Fine print
  finePrint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 8,
  },

  // Active plan (Pro state)
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  activeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activeDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  activeFeatures: { alignSelf: 'stretch' },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  activeRowText: {
    fontSize: 15,
    color: colors.textPrimary,
  },

  manageBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manageBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
