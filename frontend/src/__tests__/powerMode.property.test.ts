/**
 * Property-Based Tests for Power Mode Consistency
 * 
 * Feature: pacman-game, Property 4: Power Mode Consistency
 * Validates: Requirements 2.2
 * 
 * For any power pellet consumption, the game should enter power mode for exactly 10 seconds,
 * make all ghosts vulnerable, and restore normal mode afterward.
 */

import fc from 'fast-check';

/**
 * Ghost mode types
 */
type GhostMode = 'chase' | 'scatter' | 'frightened' | 'eaten';

/**
 * Power mode manager that implements power mode mechanics
 */
class PowerModeManager {
  private powerMode: boolean = false;
  private powerModeTimer: number = 0;
  private readonly POWER_MODE_DURATION = 10000; // 10 seconds in milliseconds
  private ghosts: Array<{ mode: GhostMode }> = [];

  constructor(numGhosts: number = 4) {
    // Initialize ghosts in normal mode
    for (let i = 0; i < numGhosts; i++) {
      this.ghosts.push({ mode: 'chase' });
    }
  }

  /**
   * Activate power mode
   */
  activatePowerMode(): void {
    this.powerMode = true;
    this.powerModeTimer = this.POWER_MODE_DURATION;

    // Change all non-eaten ghosts to frightened mode
    this.ghosts.forEach(ghost => {
      if (ghost.mode !== 'eaten') {
        ghost.mode = 'frightened';
      }
    });
  }

  /**
   * Update power mode timer
   */
  update(deltaTime: number): void {
    if (this.powerMode) {
      this.powerModeTimer -= deltaTime;

      if (this.powerModeTimer <= 0) {
        this.exitPowerMode();
      }
    }
  }

  /**
   * Exit power mode
   */
  private exitPowerMode(): void {
    this.powerMode = false;
    this.powerModeTimer = 0;

    // Return frightened ghosts to chase mode
    this.ghosts.forEach(ghost => {
      if (ghost.mode === 'frightened') {
        ghost.mode = 'chase';
      }
    });
  }

  /**
   * Mark a ghost as eaten
   */
  eatGhost(ghostIndex: number): void {
    if (ghostIndex >= 0 && ghostIndex < this.ghosts.length) {
      this.ghosts[ghostIndex].mode = 'eaten';
    }
  }

  /**
   * Respawn a ghost
   */
  respawnGhost(ghostIndex: number): void {
    if (ghostIndex >= 0 && ghostIndex < this.ghosts.length) {
      this.ghosts[ghostIndex].mode = this.powerMode ? 'frightened' : 'chase';
    }
  }

  isPowerMode(): boolean {
    return this.powerMode;
  }

  getPowerModeTimer(): number {
    return this.powerModeTimer;
  }

  getGhosts(): Array<{ mode: GhostMode }> {
    return this.ghosts;
  }

  reset(): void {
    this.powerMode = false;
    this.powerModeTimer = 0;
    this.ghosts.forEach(ghost => {
      ghost.mode = 'chase';
    });
  }
}

describe('Property 4: Power Mode Consistency', () => {
  /**
   * Property: Power mode activates for exactly 10 seconds
   * 
   * When a power pellet is consumed, power mode should be active for exactly 10000ms
   */
  test('power mode lasts exactly 10 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (updateInterval) => {
          const manager = new PowerModeManager();
          manager.activatePowerMode();

          expect(manager.isPowerMode()).toBe(true);
          expect(manager.getPowerModeTimer()).toBe(10000);

          // Simulate time passing in intervals
          let totalTime = 0;
          while (manager.isPowerMode() && totalTime < 11000) {
            manager.update(updateInterval);
            totalTime += updateInterval;
          }

          // Power mode should be off after 10 seconds
          expect(manager.isPowerMode()).toBe(false);
          expect(totalTime).toBeGreaterThanOrEqual(10000);
          expect(totalTime).toBeLessThan(10000 + updateInterval);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All ghosts become frightened when power mode activates
   * 
   * For any number of ghosts, all non-eaten ghosts should become frightened
   */
  test('all ghosts become frightened on power mode activation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (numGhosts) => {
          const manager = new PowerModeManager(numGhosts);
          
          // Activate power mode
          manager.activatePowerMode();

          // All ghosts should be frightened
          const ghosts = manager.getGhosts();
          expect(ghosts.length).toBe(numGhosts);
          ghosts.forEach(ghost => {
            expect(ghost.mode).toBe('frightened');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Ghosts return to normal mode after power mode expires
   * 
   * After power mode timer expires, all frightened ghosts should return to chase mode
   */
  test('ghosts return to normal mode after power mode expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        (numGhosts) => {
          const manager = new PowerModeManager(numGhosts);
          
          // Activate power mode
          manager.activatePowerMode();
          expect(manager.isPowerMode()).toBe(true);

          // Let power mode expire
          manager.update(10000);

          // Power mode should be off
          expect(manager.isPowerMode()).toBe(false);

          // All ghosts should be back to chase mode
          const ghosts = manager.getGhosts();
          ghosts.forEach(ghost => {
            expect(ghost.mode).toBe('chase');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Eaten ghosts remain eaten during power mode
   * 
   * Ghosts that are eaten should not become frightened when power mode activates
   */
  test('eaten ghosts remain eaten during power mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 0, max: 5 }),
        (numGhosts, ghostToEat) => {
          // Ensure ghostToEat is within bounds
          const validGhostIndex = ghostToEat % numGhosts;
          
          const manager = new PowerModeManager(numGhosts);
          
          // Activate power mode
          manager.activatePowerMode();
          
          // Eat a ghost
          manager.eatGhost(validGhostIndex);

          // The eaten ghost should be in eaten mode
          const ghosts = manager.getGhosts();
          expect(ghosts[validGhostIndex].mode).toBe('eaten');

          // Other ghosts should still be frightened
          ghosts.forEach((ghost, index) => {
            if (index !== validGhostIndex) {
              expect(ghost.mode).toBe('frightened');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple power mode activations reset timer
   * 
   * Activating power mode multiple times should reset the timer each time
   */
  test('multiple power mode activations reset timer', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 2, maxLength: 5 }),
        (intervals) => {
          const manager = new PowerModeManager();

          for (const interval of intervals) {
            // Activate power mode
            manager.activatePowerMode();
            expect(manager.getPowerModeTimer()).toBe(10000);

            // Let some time pass (but not enough to expire)
            manager.update(interval);

            // Should still be in power mode
            expect(manager.isPowerMode()).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Power mode timer decreases monotonically
   * 
   * For any sequence of updates, the power mode timer should only decrease
   */
  test('power mode timer decreases monotonically', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (intervals) => {
          const manager = new PowerModeManager();
          manager.activatePowerMode();

          let previousTimer = manager.getPowerModeTimer();

          for (const interval of intervals) {
            if (!manager.isPowerMode()) break;

            manager.update(interval);
            const currentTimer = manager.getPowerModeTimer();

            // Timer should decrease or reach zero
            expect(currentTimer).toBeLessThanOrEqual(previousTimer);
            previousTimer = currentTimer;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Respawned ghosts adopt current mode
   * 
   * When a ghost respawns during power mode, it should become frightened
   * When a ghost respawns after power mode, it should be in chase mode
   */
  test('respawned ghosts adopt current mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 0, max: 5 }),
        fc.boolean(),
        (numGhosts, ghostIndex, duringPowerMode) => {
          const validGhostIndex = ghostIndex % numGhosts;
          const manager = new PowerModeManager(numGhosts);

          if (duringPowerMode) {
            // Activate power mode
            manager.activatePowerMode();
            
            // Eat and respawn ghost
            manager.eatGhost(validGhostIndex);
            manager.respawnGhost(validGhostIndex);

            // Ghost should be frightened
            expect(manager.getGhosts()[validGhostIndex].mode).toBe('frightened');
          } else {
            // No power mode
            manager.eatGhost(validGhostIndex);
            manager.respawnGhost(validGhostIndex);

            // Ghost should be in chase mode
            expect(manager.getGhosts()[validGhostIndex].mode).toBe('chase');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Power mode state is consistent with timer
   * 
   * Power mode should be active if and only if timer is greater than zero
   */
  test('power mode state is consistent with timer', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 2000 }), { minLength: 1, maxLength: 10 }),
        (intervals) => {
          const manager = new PowerModeManager();
          manager.activatePowerMode();

          for (const interval of intervals) {
            manager.update(interval);

            const isPowerMode = manager.isPowerMode();
            const timer = manager.getPowerModeTimer();

            // Consistency check
            if (timer > 0) {
              expect(isPowerMode).toBe(true);
            } else {
              expect(isPowerMode).toBe(false);
              expect(timer).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
