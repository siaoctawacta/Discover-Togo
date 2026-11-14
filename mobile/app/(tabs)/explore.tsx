import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, KenteStripe } from '@/components/ui';
import { ListingBrowser } from '@/features/explore/ListingBrowser';
import { useTheme } from '@/theme';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + spacing.md, backgroundColor: colors.background }}>
      <ListingBrowser
        initialKind="place"
        header={
          <View>
            <AppText variant="title" accessibilityRole="header">
              {t('explore.title')}
            </AppText>
            <KenteStripe width={48} height={4} style={{ marginTop: 4 }} />
          </View>
        }
      />
    </View>
  );
}
