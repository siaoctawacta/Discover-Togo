import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Offline-safe illustrated backdrop (lush terraced hills seen from above) used
 * behind/instead of the onboarding photo when no image is available.
 */
export const TerraceBackdrop = memo(function TerraceBackdrop() {
  const bands = Array.from({ length: 14 }, (_, i) => i);
  const greens = ['#2F4A2A', '#3A5A33', '#456B3C', '#4F7A44', '#3E6136', '#36552F'];
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A5A33" />
          <Stop offset="1" stopColor="#1C2B19" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="390" height="844" fill="url(#bg)" />
      {bands.map((i) => {
        const y = 40 + i * 60;
        const amp = 26 + (i % 3) * 10;
        const d = `M -20 ${y} C 80 ${y - amp}, 160 ${y + amp}, 230 ${y} S 360 ${y - amp}, 420 ${y + 6} L 420 ${y + 46} C 330 ${y + 46 - amp}, 260 ${y + 46 + amp}, 170 ${y + 40} S 40 ${y + 40 - amp}, -20 ${y + 52} Z`;
        return <Path key={i} d={d} fill={greens[i % greens.length]} opacity={0.85} />;
      })}
    </Svg>
  );
});
