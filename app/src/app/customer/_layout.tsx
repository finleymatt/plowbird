import { Redirect, Stack } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function CustomerLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/" />;
  if (user.role !== 'customer') return <Redirect href="/driver" />;
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back', headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="request" options={{ title: 'Request a plow', presentation: 'modal' }} />
      <Stack.Screen name="add-property" options={{ title: 'Add a driveway', presentation: 'modal' }} />
      <Stack.Screen name="job/[id]" options={{ title: 'Your plow' }} />
    </Stack>
  );
}
