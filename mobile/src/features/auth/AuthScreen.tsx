import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, TextInput, Pressable } from 'react-native';
import { DataStateScreen } from '../../app/DataStateScreen';
import { PanelCard, ActionButton } from '../../app/ui';
import { useTranslation } from '../../app/i18n';
import { useAuthStore } from '../../state/auth.store';
import { spacing, palette } from '../../app/theme';

export function AuthScreen() {
  const { t } = useTranslation();
  const sendOtp = useAuthStore((state) => state.sendOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const setAuthEmail = useAuthStore((state) => state.setEmail);
  const status = useAuthStore((state) => state.status);
  const email = useAuthStore((state) => state.email);
  const authError = useAuthStore((state) => state.lastAuthError ?? state.error);
  const resendAvailableAt = useAuthStore((state) => state.resendAvailableAt);
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resendNow, setResendNow] = useState(Date.now());
  const otpRequested = status === 'otp_sent' || status === 'otp_verifying' || (status === 'auth_error' && Boolean(email));
  const loading = status === 'otp_sending' || status === 'otp_verifying';
  const resendDisabled = Boolean(resendAvailableAt && resendAvailableAt > resendNow);

  useEffect(() => {
    if (!resendAvailableAt || resendAvailableAt <= Date.now()) {
      return undefined;
    }

    const interval = setInterval(() => setResendNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  const handleSendOtp = async () => {
    setLocalError(null);
    setStatusMessage(null);

    if (!email.trim()) {
      setLocalError(t('emailRequired'));
      return;
    }

    const success = await sendOtp(email.trim().toLowerCase());

    if (success) {
      setStatusMessage(t('otpSentToEmail'));
      setResendNow(Date.now());
    }
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    setStatusMessage(null);

    if (!code.trim()) {
      setLocalError(t('codeRequired'));
      return;
    }

    await verifyOtp(code.trim());
  };

  return (
    <DataStateScreen
      title={t('otpLogin')}
      isLoading={loading}
      error={localError ?? authError}
    >
      <PanelCard title={t('welcomeBack')} subtitle={t('otpSubtitle')}>
        <Text style={styles.authLead}>{t('otpLoginLead')}</Text>
        <TextInput
          value={email}
          onChangeText={(value) => {
            setAuthEmail(value);
            setStatusMessage(null);
          }}
          placeholder={t('emailAddress')}
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
        />
        {otpRequested ? (
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={t('enterCode')}
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            autoCapitalize="none"
            style={styles.input}
          />
        ) : null}
        <ActionButton
          title={otpRequested ? t('verifyCode') : t('sendCode')}
          onPress={otpRequested ? handleVerifyOtp : handleSendOtp}
          disabled={loading}
        />
        {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{t('otpHint')}</Text>
          {otpRequested ? (
            <Pressable
              onPress={handleSendOtp}
              disabled={resendDisabled}
            >
              <Text style={[styles.switchAction, resendDisabled ? styles.switchActionDisabled : null]}>
                {t('resendCode')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </PanelCard>
    </DataStateScreen>
  );
}

const styles = StyleSheet.create({
  authLead: {
    marginBottom: spacing.md,
    color: palette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    minHeight: 54,
    borderRadius: 24,
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1,
    borderColor: palette.borderLight,
    color: palette.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  switchText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  switchAction: {
    color: palette.accentLight,
    fontSize: 13,
    fontWeight: '700',
  },
  switchActionDisabled: {
    opacity: 0.5,
  },
  status: {
    marginTop: spacing.sm,
    color: palette.success,
    fontSize: 13,
  },
});
