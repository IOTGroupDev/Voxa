import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { palette, shadow, spacing, typography } from './theme';

interface PanelCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function PanelCard({ title, subtitle, children }: PanelCardProps) {
  return (
    <View style={[styles.card, shadow.card]}>
      {title ? <View style={styles.cardAccent} /> : null}
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

interface ListCardProps {
  title: string;
  subtitle?: string;
  detail?: string;
  note?: string;
}

export function ListCard({ title, subtitle, detail, note }: ListCardProps) {
  return (
    <View style={[styles.listCard, shadow.soft]}>
      <Text style={styles.listCardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.listCardSubtitle}>{subtitle}</Text> : null}
      {detail ? <Text style={styles.listCardDetail}>{detail}</Text> : null}
      {note ? <Text style={styles.listCardNote}>{note}</Text> : null}
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

interface ChipProps {
  label: string;
  variant?: 'neutral' | 'accent' | 'success' | 'warning';
}

export function Chip({ label, variant = 'neutral' }: ChipProps) {
  const styles_chip = variant === 'accent' ? styles.chipAccent : variant === 'success' ? styles.chipSuccess : variant === 'warning' ? styles.chipWarning : styles.chipNeutral;

  return (
    <View style={styles_chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

interface ProgressBarProps {
  value: number;
  label: string;
  accentLabel?: string;
}

export function ProgressBar({ value, label, accentLabel }: ProgressBarProps) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{Math.round(value * 100)}%{accentLabel ? ` · ${accentLabel}` : ''}</Text>
      </View>
      <View style={styles.progressShell}>
        <View style={[styles.progressFill, { width: `${Math.round(value * 100)}%` }]} />
      </View>
    </View>
  );
}

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  return (
    <View style={[styles.searchInputContainer, shadow.xs]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.searchInput}
        autoCorrect
      />
    </View>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

export function ActionButton({ title, onPress, variant = 'primary', disabled }: ButtonProps) {
  const buttonStyle = variant === 'primary' ? styles.buttonPrimary : variant === 'secondary' ? styles.buttonSecondary : styles.buttonGhost;
  const textStyle = variant === 'primary' ? styles.buttonTextPrimary : variant === 'secondary' ? styles.buttonTextSecondary : styles.buttonTextGhost;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'danger';
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const badgeStyle = tone === 'accent' ? styles.badgeAccent : tone === 'success' ? styles.badgeSuccess : tone === 'danger' ? styles.badgeDanger : styles.badgeNeutral;

  return (
    <View style={badgeStyle}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonPrimary: {
    backgroundColor: palette.accent,
    ...shadow.soft,
  },
  buttonSecondary: {
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.accent,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonTextPrimary: {
    color: palette.text,
  },
  buttonTextSecondary: {
    color: palette.text,
  },
  buttonTextGhost: {
    color: palette.accent,
  },
  card: {
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 3,
    backgroundColor: palette.accent,
    borderRadius: 1.5,
    marginBottom: spacing.md,
    width: 48,
  },
  cardTitle: {
    ...typography.h3,
    color: palette.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  cardContent: {
    gap: spacing.sm,
  },
  listCard: {
    borderRadius: 16,
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
  },
  listCardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  listCardSubtitle: {
    color: palette.muted,
    marginTop: 6,
    fontSize: 14,
  },
  listCardDetail: {
    color: palette.textSecondary,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  listCardNote: {
    color: palette.muted,
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderLight,
  },
  emptyTitle: {
    ...typography.h3,
    color: palette.text,
    marginBottom: 12,
  },
  emptyDescription: {
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  searchInputContainer: {
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderLight,
    overflow: 'hidden',
  },
  searchInput: {
    minHeight: 52,
    color: palette.text,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  progressContainer: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  progressValue: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  progressShell: {
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.surfaceSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  chipNeutral: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: palette.surfaceLighter,
    alignSelf: 'flex-start',
  },
  chipAccent: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: palette.accentGlow,
    alignSelf: 'flex-start',
  },
  chipSuccess: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: palette.success,
    alignSelf: 'flex-start',
  },
  chipWarning: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: palette.warning,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: 0.3,
  },
  badgeNeutral: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginBottom: 8,
    backgroundColor: palette.surfaceLighter,
  },
  badgeAccent: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginBottom: 8,
    backgroundColor: palette.accent,
  },
  badgeSuccess: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginBottom: 8,
    backgroundColor: palette.success,
  },
  badgeDanger: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginBottom: 8,
    backgroundColor: palette.danger,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: 0.3,
  },
});
