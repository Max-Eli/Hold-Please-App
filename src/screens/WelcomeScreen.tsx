import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../components/Button';
import { ColorScheme, spacing, fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/holdpleasev1 (2).png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>Hold Please</Text>
        <Text style={styles.subtitle}>
          AI voice agents for your business.{'\n'}Set up in minutes.
        </Text>

        <View style={styles.features}>
          <Feature text="24/7 call handling" colors={colors} />
          <Feature text="5 minute setup" colors={colors} />
          <Feature text="Your own number" colors={colors} />
        </View>
      </View>

      <View style={styles.buttons}>
        <Button title="Get Started" onPress={() => navigation.navigate('SignUp')} />
        <Button
          title="Sign In"
          variant="outline"
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </SafeAreaView>
  );
}

function Feature({ text, colors }: { text: string; colors: ColorScheme }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.feature}>
      <View style={styles.featureDot} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  features: {
    gap: spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  featureText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '400',
  },
  buttons: {
    paddingBottom: spacing.lg,
  },
});
