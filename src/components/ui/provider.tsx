'use client';

import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
  Theme,
} from '@chakra-ui/react';
import { PropsWithChildren } from 'react';

const system = createSystem(
  defaultConfig,
  defineConfig({
    cssVarsRoot: ':root',
    globalCss: {
      // Chakra v3 injects background on body via CSS vars — override it here
      'html, body, #root': {
        background: 'transparent',
        backgroundColor: 'transparent',
      },
      'h1, h2, h3, h4, h5, h6': { color: '#1A1A1A' },
      'p, span, li': { color: '#4A4A4A' },
    },
    theme: {
      tokens: {
        fonts: {
          heading: { value: `'Poppins', sans-serif` },
          body: { value: `'Inter', sans-serif` },
        },
        colors: {
          text: {
            primary: { value: '#1A1A1A' },
            muted: { value: '#4A4A4A' },
            brand: { value: '#32ce0e' },
          },
          bg: {
            primary: { value: '#32ce0e' },
            secondary: { value: '#1A1A1A' },
          },
          button: {
            primary: {
              bg: { value: '#32ce0e' },
              hover: { value: '#2bb60c' },
              text: { value: '#ffffff' },
            },
            secondary: {
              bg: { value: '#cccccc' },
              hover: { value: '#bfbfbf' },
              text: { value: '#1A1A1A' },
            },
          },
        },
      },
      // Override Chakra's default semantic token that sets body bg to white
      semanticTokens: {
        colors: {
          'chakra-body-bg': {
            _light: { value: 'transparent' },
            _dark: { value: 'transparent' },
          },
          'chakra-body-text': {
            _light: { value: '#1A1A1A' },
            _dark: { value: '#1A1A1A' },
          },
        },
      },
    },
  })
);

export function Provider({ children }: PropsWithChildren) {
  return (
    <ChakraProvider value={system}>
      {/* bg="transparent" stops Theme from rendering its own white surface */}
      <Theme appearance="light" height="100%" bg="transparent">
        {children}
      </Theme>
    </ChakraProvider>
  );
}
