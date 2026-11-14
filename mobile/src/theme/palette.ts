/** Raw brand palette. Screens must NOT import this directly — use `useTheme().colors`. */
export const palette = {
  forest: '#3A5A33',
  forestDeep: '#2F4A2A',
  forestDarker: '#1C2B19',
  forestNight: '#141F12',
  teal: '#5BC0C8',
  ink: '#111111',
  white: '#FFFFFF',
  grey50: '#F6F6F4',
  grey100: '#EFEFEC',
  grey200: '#E3E3DF',
  grey400: '#A3A3A0',
  grey500: '#7C7C78',
  grey700: '#3C3C3A',
  // Togolese flag / kente accents — use sparingly.
  togoGreen: '#006A4E',
  togoYellow: '#FFCE00',
  togoRed: '#D21034',
  gold: '#E8A33D',
  star: '#F5B301',
} as const;
