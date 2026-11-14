import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';

/** Plain-text description with a teal "Read more" toggle. API text is never rendered as HTML. */
export function ReadMore({ text, lines = 4 }: { text: string; lines?: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 220;
  return (
    <AppText color="textMuted" style={{ lineHeight: 22 }}>
      <AppText color="textMuted" numberOfLines={expanded || !long ? undefined : lines}>
        {expanded || !long ? text : `${text.slice(0, 220).trimEnd()}… `}
      </AppText>
      {long ? (
        <AppText color="accent" weight="medium" onPress={() => setExpanded((e) => !e)} accessibilityRole="button" suppressHighlighting>
          {expanded ? ` ${t('detail.readLess')}` : t('detail.readMore')}
        </AppText>
      ) : null}
    </AppText>
  );
}
