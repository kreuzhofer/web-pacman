/**
 * Property-Based Tests for Maze Generator
 * Feature: pacman-game, Property 7: Maze Generation Validity
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5
 */

import * as fc from 'fast-check';
import { MazeGenerator } from '../MazeGenerator';
import { MazeData, Position } from '../types';

describe('MazeGenerator Property Tests', () => {
  const generator = new MazeGenerator();

  /**
   * Property 7: Maze Generation Validity
   * For any generated maze at any level, all areas should be reachable from the player spawn point,
   * exactly two tunnel exits should exist on opposite sides, and dot placement should maintain consistent density.
   */
  test('Property 7: Maze Generation Validity - all areas reachable, tunnels on opposite sides, consistent dot density', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // level number
        (level) => {
          const maze = generator.generateMaze(level);

          // Requirement 3.1: All areas should be reachable from spawn point
          const allReachable = isAllAreasReachable(maze);
          expect(allReachable).toBe(true);

          // Requirement 3.2: Exactly two tunnel exits on opposite sides
          expect(maze.tunnels.length).toBe(2);
          const tunnelsOnOppositeSides = areTunnelsOnOppositeSides(maze);
          expect(tunnelsOnOppositeSides).toBe(true);

          // Requirement 3.4: Dot placement should be consistent
          const dotDensity = calculateDotDensity(maze);
          expect(dotDensity).toBeGreaterThan(0.3); // At least 30% of walkable spaces have dots
          expect(dotDensity).toBeLessThanOrEqual(1.0); // At most 100% of walkable spaces have dots

          // Requirement 3.5: Maze should have valid spawn points
          expect(maze.playerSpawn).toBeDefined();
          expect(maze.ghostSpawn).toBeDefined();
          expect(maze.walls[maze.playerSpawn.y][maze.playerSpawn.x]).toBe(false);
          expect(maze.walls[maze.ghostSpawn.y][maze.ghostSpawn.x]).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to check if all non-wall areas are reachable from player spawn
 */
function isAllAreasReachable(maze: MazeData): boolean {
  const visited: boolean[][] = Array(maze.height)
    .fill(null)
    .map(() => Array(maze.width).fill(false));

  const queue: Position[] = [maze.playerSpawn];
  visited[maze.playerSpawn.y][maze.playerSpawn.x] = true;
  let reachableCount = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;

    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      const newX = current.x + dir.x;
      const newY = current.y + dir.y;

      if (
        newX >= 0 &&
        newX < maze.width &&
        newY >= 0 &&
        newY < maze.height &&
        !visited[newY][newX] &&
        !maze.walls[newY][newX]
      ) {
        visited[newY][newX] = true;
        queue.push({ x: newX, y: newY });
        reachableCount++;
      }
    }
  }

  // Count total non-wall spaces
  let totalSpaces = 0;
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (!maze.walls[y][x]) {
        totalSpaces++;
      }
    }
  }

  return reachableCount === totalSpaces;
}

/**
 * Helper function to check if tunnels are on opposite sides
 */
function areTunnelsOnOppositeSides(maze: MazeData): boolean {
  if (maze.tunnels.length !== 2) return false;

  const tunnel1 = maze.tunnels[0];
  const tunnel2 = maze.tunnels[1];

  // Check if tunnels are on left and right sides (opposite)
  const leftSide = 0;
  const rightSide = maze.width - 1;

  const hasLeftTunnel =
    tunnel1.entrance.x === leftSide ||
    tunnel1.exit.x === leftSide ||
    tunnel2.entrance.x === leftSide ||
    tunnel2.exit.x === leftSide;

  const hasRightTunnel =
    tunnel1.entrance.x === rightSide ||
    tunnel1.exit.x === rightSide ||
    tunnel2.entrance.x === rightSide ||
    tunnel2.exit.x === rightSide;

  return hasLeftTunnel && hasRightTunnel;
}

/**
 * Helper function to calculate dot density
 */
function calculateDotDensity(maze: MazeData): number {
  let walkableSpaces = 0;
  let dotsPlaced = 0;

  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (!maze.walls[y][x]) {
        walkableSpaces++;
        if (maze.dots[y][x]) {
          dotsPlaced++;
        }
      }
    }
  }

  return walkableSpaces > 0 ? dotsPlaced / walkableSpaces : 0;
}
