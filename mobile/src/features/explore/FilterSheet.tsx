import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { CUISINES, HOTEL_TYPES, PLACE_CATEGORIES, REGIONS, type Kind, type RegionId } from '@/api/types';
import { AppText, BottomSheet, Button, Chip } from '@/components/ui';
import { useMeta } from '@/hooks/useHome';
import { useTheme } from '@/theme';
import { PRICE_PRESETS, RATING_PRESETS, SORTS, type SheetFilters } from './filters';

interface Props {
  kind: Kind;
  visible: boolean;
  value: SheetFilters;
  onClose: () => void;
  onApply: (f: SheetFilters) => void;
  hasLocation: boolean;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheading">{title}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

export function FilterSheet({ kind, visible, value, onClose, onApply, hasLocation }: Props) {
  const { t } = useTranslation();
  const meta = useMeta();
  const [draft, setDraft] = useState<SheetFilters>(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const set = <K extends keyof SheetFilters>(key: K, v: SheetFilters[K]) => setDraft((d) => ({ ...d, [key]: v }));
  const toggle = <K extends keyof SheetFilters>(key: K, v: SheetFilters[K]) => setDraft((d) => ({ ...d, [key]: d[key] === v ? undefined : v }));

  const label = (group: 'categories' | 'cuisines' | 'hotelTypes', id: string) =>
    meta.data?.[group].find((o) => o.id === id)?.label ?? t(`${group}.${id}`);
  const regionName = (id: RegionId) => meta.data?.regions.find((r) => r.id === id)?.name ?? t(`regions.${id}`);

  const cities = useMemo(() => {
    const regions = meta.data?.regions ?? [];
    const list = draft.region ? regions.filter((r) => r.id === draft.region) : regions;
    return [...new Set(list.flatMap((r) => r.cities))].slice(0, 30);
  }, [meta.data, draft.region]);

  const pricePreset = PRICE_PRESETS.find((p) => p.min === draft.minPrice && p.max === draft.maxPrice)?.id;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('filters.title')}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={t('filters.reset')} variant="ghost" onPress={() => setDraft({ sort: 'popular' })} style={{ flex: 1 }} />
          <Button
            title={t('filters.apply')}
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <Group title={t('filters.sort')}>
        {SORTS.filter((s) => s !== 'distance' || hasLocation).map((s) => (
          <Chip key={s} label={t(`sort.${s}`)} selected={(draft.sort ?? 'popular') === s} onPress={() => set('sort', s)} />
        ))}
      </Group>

      <Group title={kind === 'hotel' ? t('filters.location') : t('filters.region')}>
        {REGIONS.map((r) => (
          <Chip key={r} label={regionName(r)} selected={draft.region === r} onPress={() => setDraft((d) => ({ ...d, region: d.region === r ? undefined : r, city: undefined }))} />
        ))}
      </Group>

      {kind !== 'place' && cities.length > 0 ? (
        <Group title={t('filters.city')}>
          {cities.map((c) => (
            <Chip key={c} label={c} selected={draft.city === c} onPress={() => toggle('city', c)} />
          ))}
        </Group>
      ) : null}

      {kind === 'place' ? (
        <Group title={t('filters.category')}>
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} label={label('categories', c)} selected={draft.category === c} onPress={() => toggle('category', c)} />
          ))}
        </Group>
      ) : null}

      {kind === 'restaurant' ? (
        <>
          <Group title={t('filters.cuisine')}>
            {CUISINES.map((c) => (
              <Chip key={c} label={label('cuisines', c)} selected={draft.cuisine === c} onPress={() => toggle('cuisine', c)} />
            ))}
          </Group>
          <Group title={t('filters.price')}>
            {[1, 2, 3, 4].map((lvl) => {
              const selected = draft.priceLevel?.includes(lvl) ?? false;
              return (
                <Chip
                  key={lvl}
                  label={'₣'.repeat(lvl)}
                  selected={selected}
                  onPress={() =>
                    setDraft((d) => {
                      const cur = d.priceLevel ?? [];
                      const next = selected ? cur.filter((x) => x !== lvl) : [...cur, lvl].sort();
                      return { ...d, priceLevel: next.length ? next : undefined };
                    })
                  }
                />
              );
            })}
          </Group>
        </>
      ) : null}

      {kind === 'hotel' ? (
        <>
          <Group title={t('filters.hotelType')}>
            {HOTEL_TYPES.map((h) => (
              <Chip key={h} label={label('hotelTypes', h)} selected={draft.hotelType === h} onPress={() => toggle('hotelType', h)} />
            ))}
          </Group>
          <Group title={t('filters.priceRange')}>
            {PRICE_PRESETS.map((p) => (
              <Chip
                key={p.id}
                label={t(`filters.pricePresets.${p.id}`)}
                selected={pricePreset === p.id}
                onPress={() => setDraft((d) => (pricePreset === p.id ? { ...d, minPrice: undefined, maxPrice: undefined } : { ...d, minPrice: p.min, maxPrice: p.max }))}
              />
            ))}
          </Group>
        </>
      ) : null}

      {kind !== 'place' ? (
        <Group title={t('filters.rating')}>
          {RATING_PRESETS.map((r) => (
            <Chip key={r} label={`★ ${r}+`} selected={draft.minRating === r} onPress={() => toggle('minRating', r)} />
          ))}
        </Group>
      ) : null}
    </BottomSheet>
  );
}
