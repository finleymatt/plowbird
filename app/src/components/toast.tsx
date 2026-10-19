import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

import { Icon, T } from './ui';

// In-app banner for live notifications (driver accepted, on the way, tip received...).
export function Toast() {
  const { toast, dismissToast, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + Spacing.two, left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.three }}>
      <Pressable
        onPress={() => {
          dismissToast();
          if (toast.jobId && user)
            router.push({ pathname: user.role === 'driver' ? '/driver/job/[id]' : '/customer/job/[id]', params: { id: String(toast.jobId) } });
        }}
        style={{
          width: '100%',
          maxWidth: MaxContentWidth,
          flexDirection: 'row',
          gap: Spacing.three,
          alignItems: 'center',
          backgroundColor: theme.text,
          borderRadius: Radius.lg,
          padding: Spacing.three,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}>
        <Icon name="notifications" color="primary" />
        <View style={{ flex: 1 }}>
          <T variant="label" style={{ color: theme.background }}>
            {toast.title}
          </T>
          <T variant="caption" style={{ color: theme.background, opacity: 0.8 }}>
            {toast.body}
          </T>
        </View>
      </Pressable>
    </View>
  );
}
