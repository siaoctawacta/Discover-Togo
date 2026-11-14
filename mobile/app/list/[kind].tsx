import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { CUISINES, HOTEL_TYPES, PLACE_CATEGORIES, REGIONS } from '@/api/types';
import { EmptyState, ScreenHeader } from '@/components/ui';
import { ListingBrowser } from '@/features/explore/ListingBrowser';
import type { SheetFilters } from '@/features/explore/filters';
import { firstParam, isKind, isOneOf } from '@/lib/validators';
import { useTheme } from '@/theme';

/** Category / list screen: /list/place?category=beach, /list/restaurant?cuisine=local, /list/hotel ... */
export default function ListScreen() {
  const params = useLocalSearchParams<{ kind: string; category?: string; region?: string; cuisine?: string; hotelType?: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const kind = firstParam(params.kind);

  if (!isKind(kind)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="" />
        <EmptyState icon="alert-circle-outline" title={t('errors.notFound')} />
      </View>
    );
  }

  // Only accept known enum values from (possibly deep-linked) params.
  const category = firstParam(params.category);
  const region = firstParam(params.region);
  const cuisine = firstParam(params.cuisine);
  const hotelType = firstParam(params.hotelType);
  const initial: SheetFilters = {
    sort: 'popular',
    region: isOneOf(region, REGIONS) ? region : undefined,
    category: kind === 'place' && isOneOf(category, PLACE_CATEGORIES) ? category : undefined,
    cuisine: kind === 'restaurant' && isOneOf(cuisine, CUISINES) ? cuisine : undefined,
    hotelType: kind === 'hotel' && isOneOf(hotelType, HOTEL_TYPES) ? hotelType : undefined,
  };
  const title = initial.category ? t(`categories.${initial.category}`) : t(`kinds.${kind}Plural`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={title} />
      <ListingBrowser initialKind={kind} lockKind initialFilters={initial} />
    </View>
  );
}
