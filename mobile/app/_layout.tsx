import '@/i18n';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppProviders } from '@/components/AppProviders';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function usePrefsReady(): boolean {
  const [ready, setReady] = useState(usePrefs.persist.hasHydrated());
  useEffect(() => {
    if (ready) return;
    const unsub = usePrefs.persist.onFinishHydration(() => setReady(true));
    if (usePrefs.persist.hasHydrated()) setReady(true);
    return unsub;
  }, [ready]);
  return ready;
}

function RootNavigator() {
  const theme = useTheme();
  const navTheme = theme.dark ? DarkTheme : DefaultTheme;
  return (
    <NavThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.colors.background, card: theme.colors.surface, text: theme.colors.text, primary: theme.colors.brand, border: theme.colors.border },
      }}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="search" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reviews/write/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  const prefsReady = usePrefsReady();
  const ready = (fontsLoaded || !!fontError) && prefsReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
