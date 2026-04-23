import * as PIXI from 'pixi.js';
import type { BowRenderStyle } from './types';
import { BOW_DRAW_BEND, BOW_REST_BEND } from './constants';

// Single source of truth for arrow shape. Draws shaft + head + fletching
// between (tailX,tailY) and (tipX,tipY).
export function drawArrowShape(
  gfx: PIXI.Graphics,
  tipX: number, tipY: number,
  tailX: number, tailY: number,
  shaftColor: number,
  trailColor: number,
  coreSparkColor: number,
  pierce: boolean,
  explodeOnHit: boolean,
  showFletching: boolean = true,
) {
  const ang = Math.atan2(tipY - tailY, tipX - tailX);
  const shaftWidth = explodeOnHit ? 2.6 : pierce ? 1.6 : 2;
  gfx.moveTo(tailX, tailY).lineTo(tipX, tipY).stroke({ width: shaftWidth, color: shaftColor });

  if (explodeOnHit) {
    gfx.circle(tipX, tipY, 4.5).fill({ color: shaftColor });
    gfx.circle(tipX, tipY, 2.2).fill({ color: coreSparkColor });
  } else if (pierce) {
    const needleLen = 11;
    gfx.moveTo(tipX - Math.cos(ang - 0.12) * needleLen, tipY - Math.sin(ang - 0.12) * needleLen)
      .lineTo(tipX, tipY)
      .lineTo(tipX - Math.cos(ang + 0.12) * needleLen, tipY - Math.sin(ang + 0.12) * needleLen)
      .stroke({ width: 1.8, color: shaftColor });
  } else {
    const headLen = 6, headAng = 0.4;
    gfx.moveTo(tipX, tipY)
      .lineTo(tipX - Math.cos(ang - headAng) * headLen, tipY - Math.sin(ang - headAng) * headLen)
      .moveTo(tipX, tipY)
      .lineTo(tipX - Math.cos(ang + headAng) * headLen, tipY - Math.sin(ang + headAng) * headLen)
      .stroke({ width: 2, color: shaftColor });
  }

  // Fletching — wide at the back, narrow toward the tail, so it reads as
  // feathers instead of a second arrowhead.
  if (showFletching) {
    const fletchLen = 7;
    const fletchHalf = 3.2;
    const backX = tailX - Math.cos(ang) * fletchLen;
    const backY = tailY - Math.sin(ang) * fletchLen;
    const backUpX = backX + Math.sin(ang) * fletchHalf;
    const backUpY = backY - Math.cos(ang) * fletchHalf;
    const backDoX = backX - Math.sin(ang) * fletchHalf;
    const backDoY = backY + Math.cos(ang) * fletchHalf;
    gfx.poly([tailX, tailY, backUpX, backUpY, backDoX, backDoY])
      .fill({ color: trailColor });
  }
}

// Draws the full bow (limbs + accent + fork prongs). Returns the limb tip
// positions and `sinB` so the caller can draw the string and nock arrows.
export function drawBowInto(
  gfx: PIXI.Graphics,
  cx: number, cy: number,
  aimNx: number, aimNy: number,
  drawCharge: number,
  style: BowRenderStyle,
  alpha: number = 1,
) {
  const perpX = -aimNy, perpY = aimNx;
  const bend = BOW_REST_BEND + BOW_DRAW_BEND * drawCharge;
  const cosB = Math.cos(bend), sinB = Math.sin(bend);
  const upTipX = cx + (perpX * cosB - aimNx * sinB) * style.limbLength;
  const upTipY = cy + (perpY * cosB - aimNy * sinB) * style.limbLength;
  const loTipX = cx + (-perpX * cosB - aimNx * sinB) * style.limbLength;
  const loTipY = cy + (-perpY * cosB - aimNy * sinB) * style.limbLength;
  const upBulgeX = (cx + upTipX) * 0.5 + aimNx * style.curve;
  const upBulgeY = (cy + upTipY) * 0.5 + aimNy * style.curve;
  const loBulgeX = (cx + loTipX) * 0.5 + aimNx * style.curve;
  const loBulgeY = (cy + loTipY) * 0.5 + aimNy * style.curve;

  gfx.poly([cx, cy, upBulgeX, upBulgeY, upTipX, upTipY]).fill({ color: style.color, alpha });
  gfx.poly([cx, cy, loBulgeX, loBulgeY, loTipX, loTipY]).fill({ color: style.color, alpha });

  if (style.accentColor !== undefined) {
    const s = 0.6;
    gfx.poly([
      cx, cy,
      (cx + upBulgeX) * 0.5 + aimNx * style.curve * 0.25,
      (cy + upBulgeY) * 0.5 + aimNy * style.curve * 0.25,
      cx + (upTipX - cx) * s, cy + (upTipY - cy) * s,
    ]).fill({ color: style.accentColor, alpha });
    gfx.poly([
      cx, cy,
      (cx + loBulgeX) * 0.5 + aimNx * style.curve * 0.25,
      (cy + loBulgeY) * 0.5 + aimNy * style.curve * 0.25,
      cx + (loTipX - cx) * s, cy + (loTipY - cy) * s,
    ]).fill({ color: style.accentColor, alpha });
  }

  if (style.forkCount > 0 && style.forkLength > 0) {
    const drawForks = (tipX: number, tipY: number) => {
      const dir = Math.atan2(tipY - cy, tipX - cx);
      const halfSpread = 0.55;
      for (let i = 0; i < style.forkCount; i++) {
        const ft = style.forkCount === 1 ? 0 : (i / (style.forkCount - 1)) - 0.5;
        const fa = dir + ft * halfSpread * 2;
        const w = 0.16;
        gfx.poly([
          tipX, tipY,
          tipX + Math.cos(fa - w) * style.forkLength, tipY + Math.sin(fa - w) * style.forkLength,
          tipX + Math.cos(fa + w) * style.forkLength, tipY + Math.sin(fa + w) * style.forkLength,
        ]).fill({ color: style.color, alpha });
      }
    };
    drawForks(upTipX, upTipY);
    drawForks(loTipX, loTipY);
  }

  return { upTipX, upTipY, loTipX, loTipY, sinB };
}
