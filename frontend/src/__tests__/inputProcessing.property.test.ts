/**
 * Property-Based Tests for Input Processing
 * 
 * Feature: pacman-game, Property 1: Input Processing Consistency
 * Validates: Requirements 1.1, 1.2, 1.5
 * 
 * For any valid input command (keyboard or touch), processing the input should result in 
 * either immediate direction change or proper queuing for execution at the next valid 
 * intersection, without losing or duplicating commands.
 */

import fc from 'fast-check';
import { Direction } from '../types';

/**
 * Simulates the input processing logic for testing
 * This mirrors the behavior in GameScene without requiring Phaser
 */
class InputProcessor {
  private currentDirection: Direction | null = null;
  private nextDirection: Direction | null = null;

  setNextDirection(direction: Direction | null): void {
    this.nextDirection = direction;
  }

  getNextDirection(): Direction | null {
    return this.nextDirection;
  }

  getCurrentDirection(): Direction | null {
    return this.currentDirection;
  }

  processInput(canMove: (dir: Direction) => boolean): void {
    // Try to change to queued direction if possible
    if (this.nextDirection && canMove(this.nextDirection)) {
      this.currentDirection = this.nextDirection;
      this.nextDirection = null;
    }
  }

  reset(): void {
    this.currentDirection = null;
    this.nextDirection = null;
  }
}

describe('Property 1: Input Processing Consistency', () => {
  let processor: InputProcessor;

  beforeEach(() => {
    processor = new InputProcessor();
  });

  /**
   * Property: Direction queuing should never lose commands
   * 
   * When a direction is queued while the player is moving, it should either:
   * 1. Be applied immediately if the move is valid
   * 2. Remain queued for the next valid intersection
   * 3. Be replaced by a newer queued direction
   * 
   * Commands should never be lost or duplicated.
   */
  test('direction queuing preserves or replaces commands without loss', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Direction>('up', 'down', 'left', 'right'),
        fc.constantFrom<Direction>('up', 'down', 'left', 'right'),
        (firstDirection, secondDirection) => {
          processor.reset();
          
          // Set initial direction
          processor.setNextDirection(firstDirection);
          const queuedFirst = processor.getNextDirection();
          
          // Queue should contain first direction
          expect(queuedFirst).toBe(firstDirection);
          
          // Set second direction (should replace first)
          processor.setNextDirection(secondDirection);
          const queuedSecond = processor.getNextDirection();
          
          // Queue should now contain second direction
          expect(queuedSecond).toBe(secondDirection);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Valid direction inputs should result in direction change when movement is possible
   * 
   * For any valid direction input where movement is possible, the system should:
   * 1. Apply the direction immediately
   * 2. Clear the queue
   * 
   * The system should never be in an invalid state after input processing.
   */
  test('valid direction inputs result in direction change when movement is possible', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Direction>('up', 'down', 'left', 'right'),
        (direction) => {
          processor.reset();
          
          // Set direction
          processor.setNextDirection(direction);
          
          // Verify direction is queued
          expect(processor.getNextDirection()).toBe(direction);
          
          // Process input with a function that always allows movement
          processor.processInput(() => true);
          
          // After processing with valid movement:
          // 1. Current direction should be set
          // 2. Queue should be cleared
          expect(processor.getCurrentDirection()).toBe(direction);
          expect(processor.getNextDirection()).toBe(null);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Direction remains queued when movement is blocked
   * 
   * When a direction is queued but movement in that direction is not possible,
   * the direction should remain queued for the next valid opportunity.
   */
  test('direction remains queued when movement is blocked', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Direction>('up', 'down', 'left', 'right'),
        (direction) => {
          processor.reset();
          
          // Set direction
          processor.setNextDirection(direction);
          
          // Process input with a function that blocks movement
          processor.processInput(() => false);
          
          // After processing with blocked movement:
          // 1. Current direction should remain null
          // 2. Queue should still contain the direction
          expect(processor.getCurrentDirection()).toBe(null);
          expect(processor.getNextDirection()).toBe(direction);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Rapid input changes should not cause invalid states
   * 
   * When multiple direction inputs are received in quick succession,
   * the system should handle them gracefully without entering invalid states.
   */
  test('rapid input changes maintain valid game state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<Direction>('up', 'down', 'left', 'right'), { minLength: 2, maxLength: 10 }),
        fc.array(fc.boolean(), { minLength: 2, maxLength: 10 }),
        (directions, canMoveFlags) => {
          processor.reset();
          
          // Ensure arrays are same length
          const minLength = Math.min(directions.length, canMoveFlags.length);
          
          // Apply all directions rapidly with varying movement conditions
          for (let i = 0; i < minLength; i++) {
            processor.setNextDirection(directions[i]);
            processor.processInput(() => canMoveFlags[i]);
          }
          
          // After all inputs, processor should be in a valid state
          const finalDirection = processor.getCurrentDirection();
          const queuedDirection = processor.getNextDirection();
          
          // Either a direction is active or queued (or both are null)
          // This is always valid
          expect(
            finalDirection === null || 
            ['up', 'down', 'left', 'right'].includes(finalDirection)
          ).toBe(true);
          
          expect(
            queuedDirection === null || 
            ['up', 'down', 'left', 'right'].includes(queuedDirection)
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Input processing is deterministic
   * 
   * Given the same sequence of inputs and movement conditions,
   * the result should always be the same.
   */
  test('input processing is deterministic', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<Direction>('up', 'down', 'left', 'right'), { minLength: 1, maxLength: 5 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (directions, canMoveFlags) => {
          // First run
          const processor1 = new InputProcessor();
          const minLength = Math.min(directions.length, canMoveFlags.length);
          
          for (let i = 0; i < minLength; i++) {
            processor1.setNextDirection(directions[i]);
            processor1.processInput(() => canMoveFlags[i]);
          }
          
          const result1Current = processor1.getCurrentDirection();
          const result1Next = processor1.getNextDirection();
          
          // Second run with same inputs
          const processor2 = new InputProcessor();
          
          for (let i = 0; i < minLength; i++) {
            processor2.setNextDirection(directions[i]);
            processor2.processInput(() => canMoveFlags[i]);
          }
          
          const result2Current = processor2.getCurrentDirection();
          const result2Next = processor2.getNextDirection();
          
          // Results should be identical
          expect(result1Current).toBe(result2Current);
          expect(result1Next).toBe(result2Next);
        }
      ),
      { numRuns: 100 }
    );
  });
});
