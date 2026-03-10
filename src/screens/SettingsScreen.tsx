import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

export default function SettingsScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { isPro, setTier, tier } = useSubscription();
  const styles = createStyles(colors);
  const [tapCount, setTapCount] = useState(0);

  const handleVersionTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setTapCount(0);
      Alert.alert(
        'Developer Options',
        `Current plan: ${tier.toUpperCase()}\n\nSwitch subscription tier for testing?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Free', onPress: () => setTier('free') },
          { text: 'Set Pro', onPress: () => setTier('pro') },
        ]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile Card */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.7} onPress={() => {
          Alert.alert('Edit Profile', `Name: ${user?.fullName || 'N/A'}\nEmail: ${user?.email || 'N/A'}`, [
            { text: 'OK' },
          ]);
        }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Subscription */}
        <Text style={styles.sectionLabel}>Plan</Text>
        <TouchableOpacity
          style={styles.subCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Subscription')}
        >
          <View style={[styles.subIcon, isPro && styles.subIconPro]}>
            <Ionicons name="diamond" size={18} color={isPro ? '#FF9500' : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subTitle}>{isPro ? 'Pro Plan' : 'Free Plan'}</Text>
            <Text style={styles.subDesc}>
              {isPro ? '500 min/month · All features' : '30 min/month · Basic features'}
            </Text>
          </View>
          {!isPro && (
            <View style={styles.upgradePill}>
              <Text style={styles.upgradePillText}>Upgrade</Text>
            </View>
          )}
          {isPro && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
        </TouchableOpacity>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          <Row colors={colors} icon="person-outline" label="Edit Profile" onPress={() => {
            Alert.alert('Edit Profile', `Name: ${user?.fullName || 'N/A'}\nEmail: ${user?.email || 'N/A'}`, [
              { text: 'OK' },
            ]);
          }} />
          <Sep colors={colors} />
          <Row colors={colors} icon="business-outline" label="Business Info" onPress={() => {
            Alert.alert('Business Info', `Business: ${user?.businessName || 'N/A'}\nType: ${user?.businessType || 'N/A'}`, [
              { text: 'OK' },
            ]);
          }} />
          <Sep colors={colors} />
          <Row colors={colors} icon="notifications-outline" label="Notifications" onPress={() => {
            Linking.openSettings();
          }} />
          <Sep colors={colors} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.rowLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.switchTrack, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.group}>
          <Row colors={colors} icon="help-circle-outline" label="Help Center" onPress={() => {
            Linking.openURL('https://holdplease.ai/help');
          }} />
          <Sep colors={colors} />
          <Row colors={colors} icon="chatbubble-outline" label="Contact Support" onPress={() => {
            Linking.openURL('mailto:support@holdplease.ai');
          }} />
          <Sep colors={colors} />
          <Row colors={colors} icon="document-text-outline" label="Terms of Service" onPress={() => {
            Linking.openURL('https://holdplease.ai/terms');
          }} />
          <Sep colors={colors} />
          <Row colors={colors} icon="shield-outline" label="Privacy Policy" onPress={() => {
            Linking.openURL('https://holdplease.ai/privacy');
          }} />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1}>
          <Text style={styles.version}>Hold Please v1.0.0</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, colors, onPress }: { icon: string; label: string; colors: ColorScheme; onPress?: () => void }) {
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon as any} size={18} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function Sep({ colors }: { colors: ColorScheme }) {
  const styles = createStyles(colors);
  return <View style={styles.sep} />;
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  /* Profile */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.black,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Subscription card */
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  subIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  subIconPro: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
  },
  subTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  upgradePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  upgradePillText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Section Labels */
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },

  /* Groups */
  group: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },

  /* Rows */
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '400',
  },

  /* Separator */
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 18 + spacing.md, // align with text, past icon
  },

  /* Sign Out */
  signOut: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  signOutText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '500',
  },

  /* Version */
  version: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.lg,
  },
});
