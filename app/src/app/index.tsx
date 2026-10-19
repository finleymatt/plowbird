import { Redirect, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import { Landing } from '@/components/landing';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { usePromoCode } from '@/lib/promo';

export default function Index() {
  const { user, loading } = useAuth();
  // Flyer QR codes land here (/?promo=FIRSTPLOW&utm_source=…). The code is kept for the order
  // screens, including for signed-in customers who are sent on to their home screen.
  const [promo] = usePromoCode(useLocalSearchParams<{ promo?: string }>().promo);
  if (loading) return <Loading />;
  if (user) return <Redirect href={user.role === 'driver' ? '/driver' : '/customer'} />;
  // The website gets a full marketing page; the native app goes straight to a compact welcome.
  return <Landing compact={Platform.OS !== 'web'} promo={promo} />;
}
