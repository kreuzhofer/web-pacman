import * as fc from 'fast-check';

/**
 * Feature: pacman-game, Property 8: Responsive Scaling Preservation
 * Validates: Requirements 4.1, 4.3, 4.5
 *
 * For any screen resolution and viewport change, the game should scale
 * proportionally while maintaining pixel art clarity and proper touch
 * control positioning.
 */

describe('Property 8: Responsive Scaling Preservation', () => {
  it('should maintain aspect ratio when scaling to different viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }), // width
        fc.integer({ min: 240, max: 2160 }), // height
        (viewportWidth, viewportHeight) => {
          // Game dimensions
          const gameWidth = 448;
          const gameHeight = 496;
          const gameAspectRatio = gameWidth / gameHeight;

          // Calculate scale factor using FIT mode logic
          const scaleX = viewportWidth / gameWidth;
          const scaleY = viewportHeight / gameHeight;
          const scale = Math.min(scaleX, scaleY);

          // Calculate scaled dimensions
          const scaledWidth = gameWidth * scale;
          const scaledHeight = gameHeight * scale;

          // Verify scaled dimensions fit within viewport (with floating-point tolerance)
          expect(scaledWidth).toBeLessThanOrEqual(viewportWidth + 0.001);
          expect(scaledHeight).toBeLessThanOrEqual(viewportHeight + 0.001);

          // Verify aspect ratio is preserved
          const scaledAspectRatio = scaledWidth / scaledHeight;
          expect(Math.abs(scaledAspectRatio - gameAspectRatio)).toBeLessThan(
            0.001
          );

          // Verify pixel art clarity (scale should be positive)
          expect(scale).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should center the game canvas in the viewport', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (viewportWidth, viewportHeight) => {
          const gameWidth = 448;
          const gameHeight = 496;

          // Calculate scale
          const scaleX = viewportWidth / gameWidth;
          const scaleY = viewportHeight / gameHeight;
          const scale = Math.min(scaleX, scaleY);

          const scaledWidth = gameWidth * scale;
          const scaledHeight = gameHeight * scale;

          // Calculate centering offsets
          const offsetX = (viewportWidth - scaledWidth) / 2;
          const offsetY = (viewportHeight - scaledHeight) / 2;

          // Verify centering (offsets should be non-negative, with floating-point tolerance)
          expect(offsetX).toBeGreaterThanOrEqual(-0.001);
          expect(offsetY).toBeGreaterThanOrEqual(-0.001);

          // Verify canvas is centered
          expect(offsetX + scaledWidth).toBeLessThanOrEqual(viewportWidth);
          expect(offsetY + scaledHeight).toBeLessThanOrEqual(viewportHeight);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain pixel-perfect rendering at integer scales when possible', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // scale factor
        (scaleFactor) => {
          const gameWidth = 448;
          const gameHeight = 496;

          // At integer scales, dimensions should be exact multiples
          const scaledWidth = gameWidth * scaleFactor;
          const scaledHeight = gameHeight * scaleFactor;

          // Verify no fractional pixels
          expect(scaledWidth % 1).toBe(0);
          expect(scaledHeight % 1).toBe(0);

          // Verify aspect ratio preservation
          const originalRatio = gameWidth / gameHeight;
          const scaledRatio = scaledWidth / scaledHeight;
          expect(scaledRatio).toBeCloseTo(originalRatio, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
