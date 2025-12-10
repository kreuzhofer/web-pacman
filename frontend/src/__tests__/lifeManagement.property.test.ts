/**
 * Property-Based Tests for Life Management
 * 
 * Feature: pacman-game, Property 5: Life Management Accuracy
 * Validates: Requirements 2.3, 7.2, 7.3
 * 
 * For any ghost collision in normal mode, lives should decrease by exactly one,
 * positions should reset correctly, and game should end when lives reach zero.
 */

import fc from 'fast-check';

/**
 * Game state manager for life management
 */
class LifeManager {
  private lives: number;
  private readonly initialLives: number;
  private gameStatus: 'playing' | 'gameOver';
  private playerPosition: { x: number; y: number };
  private readonly spawnPosition: { x: number; y: number };

  constructor(initialLives: number = 3, spawnX: number = 0, spawnY: number = 0) {
    this.initialLives = initialLives;
    this.lives = initialLives;
    this.gameStatus = 'playing';
    this.spawnPosition = { x: spawnX, y: spawnY };
    this.playerPosition = { ...this.spawnPosition };
  }

  getLives(): number {
    return this.lives;
  }

  getGameStatus(): 'playing' | 'gameOver' {
    return this.gameStatus;
  }

  getPlayerPosition(): { x: number; y: number } {
    return { ...this.playerPosition };
  }

  movePlayer(x: number, y: number): void {
    if (this.gameStatus === 'playing') {
      this.playerPosition = { x, y };
    }
  }

  ghostCollision(): void {
    if (this.gameStatus !== 'playing') return;

    // Decrease lives by one
    this.lives -= 1;

    // Check for game over
    if (this.lives <= 0) {
      this.gameStatus = 'gameOver';
      this.lives = 0;
    } else {
      // Reset position
      this.playerPosition = { ...this.spawnPosition };
    }
  }

  reset(): void {
    this.lives = this.initialLives;
    this.gameStatus = 'playing';
    this.playerPosition = { ...this.spawnPosition };
  }
}

describe('Property 5: Life Management Accuracy', () => {
  /**
   * Property: Each ghost collision decreases lives by exactly one
   * 
   * For any number of ghost collisions, lives should decrease by exactly
   * that number (until reaching zero)
   */
  test('ghost collision decreases lives by exactly one', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (initialLives, numCollisions) => {
          const manager = new LifeManager(initialLives);

          // Simulate collisions
          for (let i = 0; i < numCollisions; i++) {
            manager.ghostCollision();
          }

          // Lives should decrease by numCollisions or reach 0
          const expectedLives = Math.max(0, initialLives - numCollisions);
          expect(manager.getLives()).toBe(expectedLives);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Game ends when lives reach zero
   * 
   * For any initial number of lives, after that many collisions,
   * the game status should be 'gameOver'
   */
  test('game ends when lives reach zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (initialLives) => {
          const manager = new LifeManager(initialLives);

          // Simulate exactly initialLives collisions
          for (let i = 0; i < initialLives; i++) {
            manager.ghostCollision();
          }

          // Game should be over
          expect(manager.getGameStatus()).toBe('gameOver');
          expect(manager.getLives()).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Position resets after collision (if lives remain)
   * 
   * After a ghost collision with remaining lives, player position
   * should reset to spawn position
   */
  test('position resets after collision with remaining lives', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (initialLives, spawnX, spawnY, moveX, moveY) => {
          const manager = new LifeManager(initialLives, spawnX, spawnY);

          // Move player away from spawn
          manager.movePlayer(moveX, moveY);
          expect(manager.getPlayerPosition()).toEqual({ x: moveX, y: moveY });

          // Collision should reset position
          manager.ghostCollision();

          // Position should be back at spawn (if game is still playing)
          if (manager.getGameStatus() === 'playing') {
            expect(manager.getPlayerPosition()).toEqual({ x: spawnX, y: spawnY });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Lives never go below zero
   * 
   * For any number of collisions, lives should never be negative
   */
  test('lives never go below zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 20 }),
        (initialLives, numCollisions) => {
          const manager = new LifeManager(initialLives);

          // Simulate many collisions
          for (let i = 0; i < numCollisions; i++) {
            manager.ghostCollision();
          }

          // Lives should never be negative
          expect(manager.getLives()).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: No state changes after game over
   * 
   * Once game is over, additional collisions should not change state
   */
  test('no state changes after game over', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (initialLives, extraCollisions) => {
          const manager = new LifeManager(initialLives);

          // End the game
          for (let i = 0; i < initialLives; i++) {
            manager.ghostCollision();
          }

          expect(manager.getGameStatus()).toBe('gameOver');
          const livesAtGameOver = manager.getLives();

          // Try more collisions
          for (let i = 0; i < extraCollisions; i++) {
            manager.ghostCollision();
          }

          // State should not change
          expect(manager.getGameStatus()).toBe('gameOver');
          expect(manager.getLives()).toBe(livesAtGameOver);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Game continues while lives remain
   * 
   * As long as lives are greater than zero, game status should be 'playing'
   */
  test('game continues while lives remain', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 100 }),
        (initialLives, numCollisions) => {
          const manager = new LifeManager(initialLives);

          // Simulate collisions (but not enough to end game)
          const safeCollisions = Math.min(numCollisions, initialLives - 1);
          for (let i = 0; i < safeCollisions; i++) {
            manager.ghostCollision();
          }

          // Game should still be playing
          expect(manager.getGameStatus()).toBe('playing');
          expect(manager.getLives()).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Collision sequence is deterministic
   * 
   * The same number of collisions should always produce the same result
   */
  test('collision sequence is deterministic', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 15 }),
        (initialLives, numCollisions) => {
          // First run
          const manager1 = new LifeManager(initialLives);
          for (let i = 0; i < numCollisions; i++) {
            manager1.ghostCollision();
          }
          const lives1 = manager1.getLives();
          const status1 = manager1.getGameStatus();

          // Second run with same parameters
          const manager2 = new LifeManager(initialLives);
          for (let i = 0; i < numCollisions; i++) {
            manager2.ghostCollision();
          }
          const lives2 = manager2.getLives();
          const status2 = manager2.getGameStatus();

          // Results should be identical
          expect(lives1).toBe(lives2);
          expect(status1).toBe(status2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Initial state is always consistent
   * 
   * For any initial lives value, the game should start in a consistent state
   */
  test('initial state is consistent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (initialLives, spawnX, spawnY) => {
          const manager = new LifeManager(initialLives, spawnX, spawnY);

          // Initial state should be correct
          expect(manager.getLives()).toBe(initialLives);
          expect(manager.getGameStatus()).toBe('playing');
          expect(manager.getPlayerPosition()).toEqual({ x: spawnX, y: spawnY });
        }
      ),
      { numRuns: 100 }
    );
  });
});
