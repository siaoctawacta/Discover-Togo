import { Redirect } from 'expo-router';
import { usePrefs } from '@/store/prefs';

export default function Index() {
  const onboardingDone = usePrefs((s) => s.onboardingDone);
  return <Redirect href={onboardingDone ? '/(tabs)' : '/onboarding'} />;
}
