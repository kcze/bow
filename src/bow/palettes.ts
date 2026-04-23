import type { Palette } from './types';

// Subtle but saturated palette rotation. Each wave shifts to the next index.
export const PALETTES: Palette[] = [
  { bg: 0x0a0e1d, grid: 0x3a4478, arena: 0x5577cc, particleWarm: 0xddbb66, particleCool: 0x6688dd }, // indigo
  { bg: 0x0e0a1d, grid: 0x5544aa, arena: 0x8866dd, particleWarm: 0xddaaff, particleCool: 0x77aadd }, // violet
  { bg: 0x190a1d, grid: 0x8844aa, arena: 0xcc66aa, particleWarm: 0xffaadd, particleCool: 0x9988dd }, // magenta
  { bg: 0x190a13, grid: 0xaa4488, arena: 0xee6699, particleWarm: 0xffbbdd, particleCool: 0xcc88cc }, // rose
  { bg: 0x190e0a, grid: 0xcc7744, arena: 0xee8855, particleWarm: 0xffcc88, particleCool: 0xff9977 }, // warm red
  { bg: 0x19130a, grid: 0xccaa44, arena: 0xeedd66, particleWarm: 0xffee88, particleCool: 0xddbb66 }, // amber
  { bg: 0x0d190a, grid: 0x66aa44, arena: 0x88dd66, particleWarm: 0xbbffaa, particleCool: 0xaadd88 }, // green
  { bg: 0x0a1918, grid: 0x44aa99, arena: 0x66dddd, particleWarm: 0xaaffee, particleCool: 0x88ddcc }, // teal
];

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
