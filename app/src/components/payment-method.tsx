import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { PaymentMethods } from '@/lib/types';

import { CardSetup } from './card-setup';
import { Card, Icon, Row, T } from './ui';

// The customer's saved card, with add/replace. `methods` comes from GET /payments/methods.
export function PaymentMethodCard({ methods, onChange }: { methods: PaymentMethods | null; onChange: (m: PaymentMethods) => void }) {
  if (!methods)
    return (
      <Card>
        <T color="textSecondary">Loading payment method…</T>
      </Card>
    );

  if (methods.mode === 'demo')
    return (
      <Row>
        <Icon name="card-outline" color="textSecondary" size={18} />
        <T variant="caption" color="textSecondary" style={{ flex: 1 }}>
          Demo payments: no card is charged. You’re only billed after the job is done.
        </T>
      </Row>
    );

  const { card } = methods;
  return (
    <Card style={{ gap: Spacing.three }}>
      {card ? (
        <Row>
          <Icon name={card.brand === 'link' ? 'link' : card.wallet === 'apple_pay' ? 'logo-apple' : 'card'} color="accent" />
          <View style={{ flex: 1 }}>
            <T variant="label">{card.label}</T>
            <T variant="caption" color="textSecondary">
              {card.expMonth && card.expYear
                ? `Expires ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`
                : 'Confirmed with a code texted to your phone'}
            </T>
          </View>
        </Row>
      ) : methods.demo ? (
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="sparkles" color="accent" size={18} />
          <T color="textSecondary" style={{ flex: 1 }}>
            Demo: no card needed, so just tap Request plow. Nothing is charged. To try checkout anyway, use test card 4242 4242 4242 4242.
          </T>
        </Row>
      ) : (
        <T color="textSecondary">Pay with Apple Pay, Google Pay, Link or a card. We place a hold when you book and only charge it once your driveway is clear.</T>
      )}
      <CardSetup title={card ? 'Use a different card' : 'Add a card'} autoOpen={!card && !methods.demo} onSaved={(saved) => onChange({ ...methods, card: saved })} />
    </Card>
  );
}
