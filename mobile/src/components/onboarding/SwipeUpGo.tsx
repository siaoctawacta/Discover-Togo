import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { AppText, KenteStripe } from '@/components/ui';

const PILL_HEIGHT = 168;
const KNOB = 64;
const TRAVEL = PILL_HEIGHT - KNOB - 12;

/** Translucent vertical pill with chevrons; drag (or tap) the white "Go" knob upward to continue. */
export function SwipeUpGo({ label, onComplete, accessibilityHint }: { label: string; onComplete: () => void; accessibilityHint: string }) {
  const y = useSharedValue(0);
  const hint = useSharedValue(0);
  const done = useRef(false);

  useEffect(() => {
    hint.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900 })), -1);
  }, [hint]);

  const finish = useMemo(
    () => () => {
      if (done.current) return;
      done.current = true;
      onComplete();
    },
    [onComplete],
  );

  const slideOut = useMemo(
    () => () => {
      y.value = withTiming(-TRAVEL, { duration: 180 }, (ok) => {
        if (ok) runOnJS(finish)();
      });
    },
    [finish, y],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
        onPanResponderMove: (_, g) => {
          y.value = Math.max(-TRAVEL, Math.min(0, g.dy));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy < -TRAVEL * 0.6 || g.vy < -0.8) slideOut();
          else y.value = withSpring(0);
        },
        onPanResponderTerminate: () => {
          y.value = withSpring(0);
        },
      }),
    [slideOut, y],
  );

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const chevronStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [-TRAVEL, 0], [0, 1]) * (0.55 + hint.value * 0.45),
    transform: [{ translateY: -hint.value * 6 }],
  }));

  return (
    <View style={styles.pill}>
      <KenteStripe vertical width={3} height={56} style={styles.kente} />
      <Animated.View style={[styles.chevrons, chevronStyle]}>
        <Ionicons name="chevron-up" size={22} color="#FFFFFF" />
        <Ionicons name="chevron-up" size={22} color="rgba(255,255,255,0.6)" style={{ marginTop: -12 }} />
      </Animated.View>
      <Animated.View style={[styles.knobWrap, knobStyle]} {...responder.panHandlers}>
        <Pressable onPress={slideOut} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} style={styles.knob}>
          <AppText variant="heading" weight="medium" style={{ color: '#111111' }}>
            {label}
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: KNOB + 12,
    height: PILL_HEIGHT,
    borderRadius: (KNOB + 12) / 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  kente: { position: 'absolute', left: 8, top: 22, opacity: 0.9 },
  chevrons: { position: 'absolute', top: 18, alignItems: 'center' },
  knobWrap: { position: 'absolute', bottom: 6 },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
