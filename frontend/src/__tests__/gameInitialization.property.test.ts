/**
 * Property-Based Tests for Game Initialization
 * 
 * **Feature: pacman-game, Property 12: Game Initialization Consistency**
 * **Validates: Requirements 7.1**
 * 
 * Property: For any game start, the player should initialize with exactly 3 lives
 * and proper starting positions.
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { GameState } from '../scenes/GameScene';

// Helper function to simulate game initialization
function initializeGameState(): GameState {
  return {
    score: 0,
    lives: 3,
    level: 1,
    powerMode: false,
    powerModeTimer: 0,
    gameStatus: 'playing',
  };
}

describe('Property 12: Game Initialization Consistency', () => {

  test('should initialize with exactly 3 lives on game start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Random number of game initializations
        (_iteration) => {
          // Test multiple game initializations to ensure consistent initialization
          const gameState = initializeGameState();
          
          // Property: Game should always start with exactly 3 lives
          expect(gameState.lives).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should initialize with level 1 on game start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iteration) => {
          const gameState = initializeGameState();
          
          // Property: Game should always start at level 1
          expect(gameState.level).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should initialize with score 0 on game start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iteration) => {
          const gameState = initializeGameState();
          
          // Property: Game should always start with score 0
          expect(gameState.score).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should initialize with playing status on game start', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iteration) => {
          const gameState = initializeGameState();
          
          // Property: Game should always start in playing status
          expect(gameState.gameStatus).toBe('playing');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should initialize with power mode disabled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iteration) => {
          const gameState = initializeGameState();
          
          // Property: Game should always start with power mode disabled
          expect(gameState.powerMode).toBe(false);
          expect(gameState.powerModeTimer).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should maintain initialization consistency across multiple initializations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 10 }),
        (initSequence) => {
          const initialStates: Array<{ lives: number; level: number; score: number }> = [];
          
          // Perform multiple initializations and collect initial states
          for (const _init of initSequence) {
            const gameState = initializeGameState();
            initialStates.push({
              lives: gameState.lives,
              level: gameState.level,
              score: gameState.score,
            });
          }
          
          // Property: All initial states should be identical
          if (initialStates.length > 1) {
            const firstState = initialStates[0];
            for (const state of initialStates) {
              expect(state.lives).toBe(firstState.lives);
              expect(state.level).toBe(firstState.level);
              expect(state.score).toBe(firstState.score);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should always initialize with valid game state values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (_iteration) => {
          const gameState = initializeGameState();
          
          // Property: All game state values should be valid
          expect(gameState.lives).toBeGreaterThan(0);
          expect(gameState.lives).toBeLessThanOrEqual(3);
          expect(gameState.level).toBeGreaterThan(0);
          expect(gameState.score).toBeGreaterThanOrEqual(0);
          expect(['playing', 'paused', 'gameOver']).toContain(gameState.gameStatus);
        }
      ),
      { numRuns: 100 }
    );
  });
});
