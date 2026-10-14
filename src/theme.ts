/**
 * The same palette as the web app, as values rather than CSS variables.
 *
 * Copied from `frontend/src/index.css` deliberately rather than approximated by
 * eye. Two surfaces that are nearly the same colour look like a bug; two that
 * are exactly the same look like one product. If a token changes on the web, it
 * changes here — there is no build step that could keep them in sync, so the
 * cost of divergence is paid in review, not in CI, and that is worth writing
 * down.
 */

export const color = {
  /* Surfaces, darkest first. */
  ink950: '#05060b',
  ink900: '#080a12',
  ink850: '#0b0e18',
  ink800: '#10131e',
  ink700: '#191d2b',
  ink600: '#262b3d',

  /* Text, brightest first. */
  fog50: '#f2f4ff',
  fog200: '#d5daee',
  fog300: '#b3bad3',
  fog400: '#949cb8',
  fog500: '#737b96',

  /* The accent. */
  iris300: '#b8a8ff',
  iris400: '#9b87ff',
  iris500: '#7c5cff',
  iris600: '#5b3be8',

  aqua400: '#4fe3ff',
  gold300: '#f7d070',
  held300: '#5fe0ab',
  held500: '#22a877',
  degraded300: '#f3c069',
  degraded500: '#c8871f',
  breached300: '#ff8b98',
  breached500: '#e0455a',
} as const

/**
 * Hairlines, as a colour rather than a border width.
 *
 * A 1px border on a 3x screen is a third of a physical pixel and renders
 * inconsistently; a low-opacity line over a dark surface is stable everywhere
 * and is what the web app already does.
 */
export const line = {
  faint: 'rgba(255,255,255,0.06)',
  soft: 'rgba(255,255,255,0.10)',
  strong: 'rgba(255,255,255,0.18)',
} as const

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const

/**
 * A four-point spacing scale.
 *
 * Not because four is magic, but because an arbitrary scale produces layouts
 * where nothing lines up with anything and the cause is invisible.
 */
export const space = (n: number) => n * 4

export const type = {
  /** Inter on both platforms, matching the web app. Loaded in App.tsx. */
  sans: 'Inter',
  mono: 'JetBrainsMono',
} as const

/**
 * One easing curve for everything that moves.
 *
 * The same cubic the web app uses. Mixing easings across a product is the kind
 * of thing nobody can name and everybody feels.
 */
export const EASE = [0.16, 1, 0.3, 1] as const
