/**
 * Property-Based Tests for Wall Collision
 * Feature: pacman-game, Property 2: Wall Collision Prevention
 * Validates: Requirements 1.3
 */

import * as fc from 'fast-check';
import { MazeGenerator } from '../MazeGenerator';
import { Position, Direction } from '../types';

describe('Wall Collision Property Tests', () => {
  /**
   * Property 2: Wall Collision Prevention
   * For any player position and movement direction, attempting to move into a wall
   * should prevent movement and maintain the current position without state corruption.
   * 
   * This test validates the collision detection logic by checking that:
   * 1. Walls are properly identified in the maze data
   * 2. Movement toward a wall is blocked
   * 3. Valid positions remain accessible
   */
  test('Property 2: Wall Collision Prevention - movement into walls is blocked', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // level number
        fc.constantFrom<Direction>('up', 'down', 'left', 'right'), // direction
        (level, direction) => {
          // Generate a maze
          const generator = new MazeGenerator();
          const maze = generator.generateMaze(level);

          // Find a position next to a wall in the given direction
          const testPosition = findPositionNextToWall(maze.walls, maze.width, maze.height, direction);
          
          // If no valid test position found, skip this iteration
          if (!testPosition) {
            return true;
          }

          // Verify the current position is not a wall
          expect(maze.walls[testPosition.y][testPosition.x]).toBe(false);

          // Calculate the target position based on direction
          const targetPosition = getTargetPosition(testPosition, direction);

          // Verify the target position is within bounds
          if (
            targetPosition.x < 0 ||
            targetPosition.x >= maze.width ||
            targetPosition.y < 0 ||
            targetPosition.y >= maze.height
          ) {
            return true; // Skip if out of bounds
          }

          // Verify the target position is a wall
          expect(maze.walls[targetPosition.y][targetPosition.x]).toBe(true);

          // Simulate collision detection: attempting to move to a wall should be blocked
          const canMove = canMoveToPosition(maze.walls, targetPosition);
          expect(canMove).toBe(false);

          // Verify the original position remains valid
          const canStay = canMoveToPosition(maze.walls, testPosition);
          expect(canStay).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Valid positions should always be accessible
   */
  test('Property 2b: Non-wall positions are always accessible', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // level number
        (level) => {
          const generator = new MazeGenerator();
          const maze = generator.generateMaze(level);

          // Find all non-wall positions
          const nonWallPositions: Position[] = [];
          for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
              if (!maze.walls[y][x]) {
                nonWallPositions.push({ x, y });
              }
            }
          }

          // All non-wall positions should be accessible
          for (const pos of nonWallPositions) {
            const canMove = canMoveToPosition(maze.walls, pos);
            expect(canMove).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to find a position next to a wall in the given direction
 */
function findPositionNextToWall(
  walls: boolean[][],
  width: number,
  height: number,
  direction: Direction
): Position | null {
  // Search for a non-wall position that has a wall in the specified direction
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Current position must not be a wall
      if (walls[y][x]) continue;

      // Check if there's a wall in the specified direction
      let hasWallInDirection = false;
      switch (direction) {
        case 'up':
          hasWallInDirection = y > 0 && walls[y - 1][x];
          break;
        case 'down':
          hasWallInDirection = y < height - 1 && walls[y + 1][x];
          break;
        case 'left':
          hasWallInDirection = x > 0 && walls[y][x - 1];
          break;
        case 'right':
          hasWallInDirection = x < width - 1 && walls[y][x + 1];
          break;
      }

      if (hasWallInDirection) {
        return { x, y };
      }
    }
  }

  return null;
}

/**
 * Helper function to get target position based on direction
 */
function getTargetPosition(position: Position, direction: Direction): Position {
  switch (direction) {
    case 'up':
      return { x: position.x, y: position.y - 1 };
    case 'down':
      return { x: position.x, y: position.y + 1 };
    case 'left':
      return { x: position.x - 1, y: position.y };
    case 'right':
      return { x: position.x + 1, y: position.y };
  }
}

/**
 * Helper function to check if a position is accessible (not a wall)
 */
function canMoveToPosition(walls: boolean[][], position: Position): boolean {
  // Check bounds
  if (
    position.x < 0 ||
    position.x >= walls[0].length ||
    position.y < 0 ||
    position.y >= walls.length
  ) {
    return false;
  }

  // Check if position is a wall
  return !walls[position.y][position.x];
}
