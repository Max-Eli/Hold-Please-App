import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ColorScheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function ContactSupportScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="chatbubble-ellipses" size={28} color={colors.textPrimary} />
          </View>
          <Text style={styles.heroTitle}>We're here to help</Text>
          <Text style={styles.heroSubtitle}>
            Our team typically responds within 24 hours
          </Text>
        </View>

        {/* Contact Options Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.6}
            onPress={() => Linking.openURL('mailto:support@holdplease.ai')}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="mail-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Email Us</Text>
              <Text style={styles.rowValue}>support@holdplease.ai</Text>
              <Text style={styles.rowSubtitle}>For general inquiries and account help</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.6}
            onPress={() =>
              Linking.openURL('mailto:bugs@holdplease.ai?subject=Bug Report - Hold Please v1.0.0')
            }
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="bug-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Report a Bug</Text>
              <Text style={styles.rowValue}>Found an issue?</Text>
              <Text style={styles.rowSubtitle}>Help us improve by reporting bugs</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Links Card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.linkRow}
            activeOpacity={0.6}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={styles.linkLabel}>FAQ & Help Center</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.linkRow}
            activeOpacity={0.6}
            onPress={() =>
              Linking.openURL('mailto:feedback@holdplease.ai?subject=Feature Request')
            }
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="bulb-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={styles.linkLabel}>Feature Request</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Hold Please v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
    },
    headerTitle: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },

    /* Hero */
    hero: {
      alignItems: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: spacing.md,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },

    /* Cards */
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },

    /* Contact rows */
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
    },
    rowIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    rowContent: {
      flex: 1,
    },
    rowTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rowValue: {
      fontSize: fontSize.md,
      fontWeight: '500',
      color: colors.textPrimary,
      marginTop: 2,
    },
    rowSubtitle: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },

    /* Link rows */
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
    },
    linkLabel: {
      flex: 1,
      fontSize: fontSize.md,
      fontWeight: '400',
      color: colors.textPrimary,
    },

    /* Separator */
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: spacing.md + 36 + 14,
    },

    /* Footer */
    footer: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: fontSize.xs,
      marginTop: spacing.lg,
    },
  });
