import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TextStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ColorScheme, borderRadius, fontSize, spacing } from '../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.focused,
          error ? styles.errorInput : null,
          style as TextStyle,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        cursorColor={colors.primary}
        selectionColor={colors.primarySoft}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      color: colors.textSecondary,
      fontSize: fontSize.xs,
      marginBottom: 6,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: borderRadius.md,
      height: 50,
      paddingHorizontal: spacing.md,
      color: colors.textPrimary,
      fontSize: fontSize.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    focused: {
      borderColor: colors.borderLight,
    },
    errorInput: {
      borderColor: colors.error,
    },
    errorText: {
      color: colors.error,
      fontSize: fontSize.xs,
      marginTop: spacing.xs,
    },
  });
