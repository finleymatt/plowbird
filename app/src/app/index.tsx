import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

import { Landing } from '@/components/landing';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Redirect href={user.role === 'driver' ? '/driver' : '/customer'} />;
  // The website gets a full marketing page; the native app goes straight to a compact welcome.
  return <Landing compact={Platform.OS !== 'web'} />;
}
