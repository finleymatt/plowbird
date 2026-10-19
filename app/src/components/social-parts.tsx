import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ErrorText, Row, T } from './ui';

export { ErrorText };

// "──── or ────" between the social buttons and the email form.
export function OrDivider() {
  const theme = useTheme();
  return (
    <Row gap={Spacing.three} style={{ marginVertical: Spacing.one }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      <T variant="caption" color="textSecondary">or</T>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
    </Row>
  );
}
