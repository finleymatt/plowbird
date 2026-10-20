import type { Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { A, ContactBlock, EmailLink, H, LegalPage, P, PhoneLink, SUPPORT_PHONE } from '@/components/legal';
import { Card, Icon, Row, T, type IconName } from '@/components/ui';
import { Spacing } from '@/constants/theme';

// /drive is the driver application page (built separately).
const DRIVE = '/drive' as Href;

export default function Contact() {
  return (
    <LegalPage title="Contact us" intro={<T color="textSecondary">Questions about a plow, a charge or driving with Plowbird? We’re here.</T>}>
      <View style={{ gap: Spacing.two }}>
        <Method icon="mail" label="Email">
          <EmailLink />
        </Method>
        {SUPPORT_PHONE && (
          <Method icon="call" label="Phone">
            <PhoneLink phone={SUPPORT_PHONE} />
          </Method>
        )}
        <T variant="caption" color="textSecondary">
          We reply as fast as we can, and within one business day. For a plow in progress, message your driver in the
          app first. If anyone is in danger, call 911.
        </T>
      </View>

      <H>How does charging work?</H>
      <P>
        When you request a plow we put a temporary hold on your card for the price shown. You’re only charged after your driver marks the job done.
        Tips go 100% to your driver. If no driver accepts your request in time, it expires and the hold is released. Storm Pass is billed monthly instead,
        with no charge per plow. Details are in the <A href="/terms">Terms</A>.
      </P>

      <H>Can I cancel?</H>
      <P>
        Yes, free, any time before your driver is on the way: open the order and tap Cancel request, and the hold on your card is released. Once your driver is
        on the way, message them in the app or email us. To end a Storm Pass, cancel it in the app; it stays active until the end of the month you’ve
        paid for.
      </P>

      <H>Something was damaged. What do I do?</H>
      <P>
        Email <EmailLink subject="Damage claim" /> within 48 hours with photos, the address and the date of the plow. We’ll share the claim with your
        driver, who is an independent contractor with their own insurance, and help you get it resolved.
      </P>

      <H>How do I become a driver?</H>
      <P>
        You need a pickup or truck with a plow, a valid driver’s license, commercial auto coverage that includes plowing, and liability insurance.
        Apply at <A href={DRIVE}>Drive with Plowbird</A>. Drivers set their own hours, pick the jobs they want and get paid through Stripe.
      </P>

      <H>Mailing address</H>
      <ContactBlock />
    </LegalPage>
  );
}

function Method({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <Card>
      <Row gap={Spacing.three}>
        <Icon name={icon} color="accent" />
        <View style={{ flex: 1 }}>
          <T variant="caption" color="textSecondary">{label}</T>
          <T variant="heading">{children}</T>
        </View>
      </Row>
    </Card>
  );
}
