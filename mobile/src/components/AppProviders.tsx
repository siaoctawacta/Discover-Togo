import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthProvider';
import { setupOnlineManager } from '@/hooks/useNetwork';
import i18n, { deviceLanguage } from '@/i18n';
import { PERSIST_MAX_AGE, queryClient, queryPersister, shouldPersistQuery } from '@/lib/queryClient';
import { useLocationStore } from '@/store/location';
import { usePrefs } from '@/store/prefs';
import { ThemeProvider } from '@/theme';

setupOnlineManager();

function LanguageSync() {
  const language = usePrefs((s) => s.language);
  useEffect(() => {
    const next = language ?? deviceLanguage();
    if (i18n.language !== next) void i18n.changeLanguage(next);
  }, [language]);
  return null;
}

function LocationBootstrap() {
  useEffect(() => {
    void useLocationStore.getState().refreshIfGranted();
  }, []);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: PERSIST_MAX_AGE,
            buster: 'v1',
            dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: () => false },
          }}
        >
          <ThemeProvider>
            <AuthProvider>
              <LanguageSync />
              <LocationBootstrap />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
