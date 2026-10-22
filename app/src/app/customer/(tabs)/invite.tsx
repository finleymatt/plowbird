import { ReferralHub } from '@/components/referrals';
import { Screen, T } from '@/components/ui';

// Invite tab: share your code, track neighbors, climb the Snow Ranks.
export default function InviteScreen() {
  return (
    <Screen>
      <T variant="title">Invite neighbors</T>
      <ReferralHub />
    </Screen>
  );
}
