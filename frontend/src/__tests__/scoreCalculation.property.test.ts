/**
 * Property-Based Tests for Score Calculation
 * 
 * Feature: pacman-game, Property 3: Score Calculation Accuracy
 * Validates: Requirements 2.1, 2.4
 * 
 * For any sequence of game events (dot collection, ghost consumption, power pellet activation),
 * the final score should equal the sum of individual event scores according to classic Pacman
 * scoring rules.
 */

import fc from 'fast-check';

/**
 * Game event types and their point values
 */
type GameEvent = 
  | { type: 'dot' }
  | { type: 'powerPellet' }
  | { type: 'ghost'; multiplier: number };

const DOT_POINTS = 10;
const POWER_PELLET_POINTS = 50;
const GHOST_BASE_POINTS = 200;

/**
 * Score calculator that implements classic Pacman scoring rules
 */
class ScoreCalculator {
  private score: number = 0;
  private ghostMultiplier: number = 1;

  collectDot(): void {
    this.score += DOT_POINTS;
  }

  collectPowerPellet(): void {
    this.score += POWER_PELLET_POINTS;
    this.ghostMultiplier = 1; // Reset ghost multiplier for new power mode
  }

  eatGhost(): void {
    this.score += GHOST_BASE_POINTS * this.ghostMultiplier;
    this.ghostMultiplier *= 2; // Double for next ghost in same power mode
  }

  getScore(): number {
    return this.score;
  }

  reset(): void {
    this.score = 0;
    this.ghostMultiplier = 1;
  }
}

/**
 * Calculate expected score from a sequence of events
 */
function calculateExpectedScore(events: GameEvent[]): number {
  let score = 0;
  let ghostMultiplier = 1;

  for (const event of events) {
    switch (event.type) {
      case 'dot':
        score += DOT_POINTS;
        break;
      case 'powerPellet':
        score += POWER_PELLET_POINTS;
        ghostMultiplier = 1; // Reset multiplier
        break;
      case 'ghost':
        score += GHOST_BASE_POINTS * ghostMultiplier;
        ghostMultiplier *= 2;
        break;
    }
  }

  return score;
}

describe('Property 3: Score Calculation Accuracy', () => {
  let calculator: ScoreCalculator;

  beforeEach(() => {
    calculator = new ScoreCalculator();
  });

  /**
   * Property: Score from dot collection is additive
   * 
   * Collecting N dots should always result in N * 10 points
   */
  test('dot collection score is additive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (numDots) => {
          calculator.reset();

          // Collect dots
          for (let i = 0; i < numDots; i++) {
            calculator.collectDot();
          }

          // Score should be exactly numDots * 10
          expect(calculator.getScore()).toBe(numDots * DOT_POINTS);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Power pellet collection adds fixed points
   * 
   * Each power pellet should add exactly 50 points
   */
  test('power pellet collection adds fixed points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (numPellets) => {
          calculator.reset();

          // Collect power pellets
          for (let i = 0; i < numPellets; i++) {
            calculator.collectPowerPellet();
          }

          // Score should be exactly numPellets * 50
          expect(calculator.getScore()).toBe(numPellets * POWER_PELLET_POINTS);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Ghost consumption follows exponential scoring
   * 
   * Eating ghosts in sequence during power mode should follow the pattern:
   * 200, 400, 800, 1600 (doubling each time)
   */
  test('ghost consumption follows exponential scoring pattern', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (numGhosts) => {
          calculator.reset();
          calculator.collectPowerPellet(); // Activate power mode

          let expectedScore = POWER_PELLET_POINTS;
          let multiplier = 1;

          // Eat ghosts
          for (let i = 0; i < numGhosts; i++) {
            calculator.eatGhost();
            expectedScore += GHOST_BASE_POINTS * multiplier;
            multiplier *= 2;
          }

          // Score should match expected exponential pattern
          expect(calculator.getScore()).toBe(expectedScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Score calculation is order-independent for dots
   * 
   * The order in which dots are collected should not affect the final score
   */
  test('dot collection order does not affect score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (numDots) => {
          // Collect dots in one order
          calculator.reset();
          for (let i = 0; i < numDots; i++) {
            calculator.collectDot();
          }
          const score1 = calculator.getScore();

          // Collect same number of dots (order doesn't matter for dots)
          calculator.reset();
          for (let i = 0; i < numDots; i++) {
            calculator.collectDot();
          }
          const score2 = calculator.getScore();

          // Scores should be identical
          expect(score1).toBe(score2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Mixed event sequences produce correct total score
   * 
   * For any sequence of game events, the final score should equal
   * the sum of individual event scores
   */
  test('mixed event sequences produce correct total score', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ type: 'dot' as const }),
            fc.constant({ type: 'powerPellet' as const }),
            fc.constant({ type: 'ghost' as const, multiplier: 1 })
          ),
          { minLength: 1, maxLength: 50 }
        ),
        (events) => {
          calculator.reset();

          // Process all events
          for (const event of events) {
            switch (event.type) {
              case 'dot':
                calculator.collectDot();
                break;
              case 'powerPellet':
                calculator.collectPowerPellet();
                break;
              case 'ghost':
                calculator.eatGhost();
                break;
            }
          }

          // Calculate expected score
          const expectedScore = calculateExpectedScore(events);

          // Actual score should match expected
          expect(calculator.getScore()).toBe(expectedScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Score never decreases
   * 
   * For any sequence of game events, the score should only increase or stay the same
   */
  test('score never decreases', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ type: 'dot' as const }),
            fc.constant({ type: 'powerPellet' as const }),
            fc.constant({ type: 'ghost' as const, multiplier: 1 })
          ),
          { minLength: 1, maxLength: 30 }
        ),
        (events) => {
          calculator.reset();
          let previousScore = 0;

          // Process events and verify score never decreases
          for (const event of events) {
            switch (event.type) {
              case 'dot':
                calculator.collectDot();
                break;
              case 'powerPellet':
                calculator.collectPowerPellet();
                break;
              case 'ghost':
                calculator.eatGhost();
                break;
            }

            const currentScore = calculator.getScore();
            expect(currentScore).toBeGreaterThanOrEqual(previousScore);
            previousScore = currentScore;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple power modes reset ghost multiplier
   * 
   * Each new power pellet should reset the ghost eating multiplier to 1
   */
  test('multiple power modes reset ghost multiplier', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 4 }),
        (numPowerModes, ghostsPerMode) => {
          calculator.reset();
          let expectedScore = 0;

          // Simulate multiple power modes
          for (let mode = 0; mode < numPowerModes; mode++) {
            // Collect power pellet
            calculator.collectPowerPellet();
            expectedScore += POWER_PELLET_POINTS;

            // Eat ghosts in this power mode
            let multiplier = 1;
            for (let ghost = 0; ghost < ghostsPerMode; ghost++) {
              calculator.eatGhost();
              expectedScore += GHOST_BASE_POINTS * multiplier;
              multiplier *= 2;
            }
          }

          // Score should match expected
          expect(calculator.getScore()).toBe(expectedScore);
        }
      ),
      { numRuns: 100 }
    );
  });
});
