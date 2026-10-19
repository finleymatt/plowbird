import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';

// Stripe sends the app here after a bank authentication step (PaymentSheet returnURL).
// The Stripe SDK picks the URL up itself, so just go back to where the customer was.
export default function StripeRedirect() {
  const canGoBack = router.canGoBack();
  useEffect(() => {
    if (canGoBack) router.back();
  }, [canGoBack]);
  return canGoBack ? null : <Redirect href="/" />;
}
