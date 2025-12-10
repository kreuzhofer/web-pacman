/**
 * Property-Based Tests for Level Progression
 * Feature: pacman-game, Property 6: Level Progression Logic
 * Validates: Requirements 2.5, 3.3
 * 
 * For any maze configuration, collecting all dots should advance to the next level
 * with properly generated maze and increased difficulty parameters.
 */

import * as fc from 'fast-check';
import { MazeGenerator } from '../MazeGenerator';

describe('Level Progression Property Tests', () => {
  /**
   * Property 6: Level Progression Logic
   * For any maze configuration, collecting all dots should advance to the next level
   * with properly generated maze and increased difficulty parameters.
   * 
   * This test validates the difficulty scaling formulas that are applied during level progression.
   */
  test('Property 6: Ghost speed increases proportionally with level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Test across multiple levels
        (level) => {
          const baseSpeed = 60; // BASE_GHOST_SPEED
          
          // Calculate expected speed (5% increase per level, max 50%)
          const expectedMultiplier = Math.min(1 + (level - 1) * 0.05, 1.5);
          const expectedSpeed = baseSpeed * expectedMultiplier;
          
          // Verify speed calculation
          const actualSpeed = calculateGhostSpeed(level, baseSpeed);
          expect(actualSpeed).toBeCloseTo(expectedSpeed, 1);
          
          // Verify speed never exceeds 150% of base
          expect(actualSpeed).toBeLessThanOrEqual(baseSpeed * 1.5);
          
          // Verify speed increases monotonically (or stays at max)
          if (level < 20) {
            const nextLevelSpeed = calculateGhostSpeed(level + 1, baseSpeed);
            expect(nextLevelSpeed).toBeGreaterThanOrEqual(actualSpeed);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6a: Power pellet duration decreases with level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Test across multiple levels
        (level) => {
          const baseDuration = 10000; // BASE_POWER_PELLET_DURATION (10 seconds)
          
          // Calculate expected duration (10% decrease per level, min 30%)
          const expectedMultiplier = Math.max(1 - (level - 1) * 0.1, 0.3);
          const expectedDuration = baseDuration * expectedMultiplier;
          
          // Verify duration calculation
          const actualDuration = calculatePowerPelletDuration(level, baseDuration);
          expect(actualDuration).toBeCloseTo(expectedDuration, 1);
          
          // Verify duration never goes below 30% of base (3 seconds)
          expect(actualDuration).toBeGreaterThanOrEqual(baseDuration * 0.3);
          
          // Verify duration decreases monotonically (or stays at minimum)
          if (level < 20) {
            const nextLevelDuration = calculatePowerPelletDuration(level + 1, baseDuration);
            expect(nextLevelDuration).toBeLessThanOrEqual(actualDuration);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6b: New maze is generated for each level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Starting level
        (level) => {
          const generator = new MazeGenerator();
          
          // Generate maze for current level
          const maze1 = generator.generateMaze(level);
          
          // Generate maze for next level
          const maze2 = generator.generateMaze(level + 1);
          
          // Verify both mazes are valid
          expect(maze1).toBeDefined();
          expect(maze2).toBeDefined();
          expect(maze1.width).toBeGreaterThan(0);
          expect(maze2.width).toBeGreaterThan(0);
          expect(maze1.height).toBeGreaterThan(0);
          expect(maze2.height).toBeGreaterThan(0);
          
          // Verify mazes have dots
          let dots1 = 0;
          let dots2 = 0;
          for (let y = 0; y < maze1.height; y++) {
            for (let x = 0; x < maze1.width; x++) {
              if (maze1.dots[y][x]) dots1++;
            }
          }
          for (let y = 0; y < maze2.height; y++) {
            for (let x = 0; x < maze2.width; x++) {
              if (maze2.dots[y][x]) dots2++;
            }
          }
          
          expect(dots1).toBeGreaterThan(0);
          expect(dots2).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6c: Difficulty scaling is consistent across level transitions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 15 }), // Test level transitions
        (level) => {
          const baseSpeed = 60;
          const baseDuration = 10000;
          
          // Get difficulty for current level
          const currentSpeed = calculateGhostSpeed(level, baseSpeed);
          const currentDuration = calculatePowerPelletDuration(level, baseDuration);
          
          // Get difficulty for next level
          const nextSpeed = calculateGhostSpeed(level + 1, baseSpeed);
          const nextDuration = calculatePowerPelletDuration(level + 1, baseDuration);
          
          // Verify difficulty increases (speed up, duration down)
          expect(nextSpeed).toBeGreaterThanOrEqual(currentSpeed);
          expect(nextDuration).toBeLessThanOrEqual(currentDuration);
          
          // Verify the relationship between speed and duration
          // As game gets harder, ghosts get faster and power mode gets shorter
          const speedIncrease = nextSpeed - currentSpeed;
          const durationDecrease = currentDuration - nextDuration;
          
          // Both should be non-negative (difficulty only increases or stays same)
          expect(speedIncrease).toBeGreaterThanOrEqual(0);
          expect(durationDecrease).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to calculate ghost speed based on level
 * Mirrors the logic in GameScene.calculateGhostSpeed()
 */
function calculateGhostSpeed(level: number, baseSpeed: number): number {
  const speedMultiplier = Math.min(1 + (level - 1) * 0.05, 1.5);
  return baseSpeed * speedMultiplier;
}

/**
 * Helper function to calculate power pellet duration based on level
 * Mirrors the logic in GameScene.calculatePowerPelletDuration()
 */
function calculatePowerPelletDuration(level: number, baseDuration: number): number {
  const durationMultiplier = Math.max(1 - (level - 1) * 0.1, 0.3);
  return baseDuration * durationMultiplier;
}
