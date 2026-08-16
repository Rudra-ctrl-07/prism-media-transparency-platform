/**
 * Shared color helpers for SVG components.
 */

/**
 * Convert either a hex string + opacity, or 3 RGB integers + opacity,
 * to an `rgba(r, g, b, opacity)` CSS string.
 */
export function rgba(a: string | number, b: number, c?: number, d?: number): string {
  let r: number, g: number, bb: number, opacity: number;
  if (typeof a === 'string') {
    const num = parseInt(a.replace('#', ''), 16);
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    bb = num & 255;
    opacity = b;
  } else {
    r = a;
    g = b;
    bb = c ?? 0;
    opacity = d ?? 1;
  }
  return `rgba(${r}, ${g}, ${bb}, ${opacity})`;
}