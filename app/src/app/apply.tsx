import { Redirect, useLocalSearchParams } from 'expo-router';

// Short link for driver outreach: plowbird.app/apply → /drive, keeping utm_* params.
export default function Apply() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Redirect href={{ pathname: '/drive', params }} />;
}
