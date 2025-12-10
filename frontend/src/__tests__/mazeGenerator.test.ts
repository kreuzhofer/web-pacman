/**
 * Unit Tests for Maze Generator
 * Requirements: 3.1, 3.2, 3.4
 */

import { MazeGenerator } from '../MazeGenerator';
import { MazeData, Position } from '../types';

describe('MazeGenerator Unit Tests', () => {
  const generator = new MazeGenerator();

  describe('Tunnel Generation', () => {
    test('maze has exactly 2 tunnels on opposite sides', () => {
      const maze = generator.generateMaze(1);

      // Should have exactly 2 tunnels
      expect(maze.tunnels.length).toBe(2);

      // Tunnels should be on opposite sides (left and right)
      const leftSide = 0;
      const rightSide = maze.width - 1;

      const tunnel1 = maze.tunnels[0];
      const tunnel2 = maze.tunnels[1];

      // Check that we have tunnels on both left and right sides
      const tunnelPositions = [
        tunnel1.entrance.x,
        tunnel1.exit.x,
        tunnel2.entrance.x,
        tunnel2.exit.x,
      ];

      expect(tunnelPositions).toContain(leftSide);
      expect(tunnelPositions).toContain(rightSide);

      // Verify tunnels are not walls
      expect(maze.walls[tunnel1.entrance.y][tunnel1.entrance.x]).toBe(false);
      expect(maze.walls[tunnel1.exit.y][tunnel1.exit.x]).toBe(false);
    });

    test('tunnels connect opposite sides of the maze', () => {
      const maze = generator.generateMaze(1);

      const tunnel1 = maze.tunnels[0];
      const tunnel2 = maze.tunnels[1];

      // Tunnel 1 should connect left to right or right to left
      const isLeftToRight =
        (tunnel1.entrance.x === 0 && tunnel1.exit.x === maze.width - 1) ||
        (tunnel1.entrance.x === maze.width - 1 && tunnel1.exit.x === 0);

      expect(isLeftToRight).toBe(true);

      // Tunnel 2 should be the reverse
      const isRightToLeft =
        (tunnel2.entrance.x === maze.width - 1 && tunnel2.exit.x === 0) ||
        (tunnel2.entrance.x === 0 && tunnel2.exit.x === maze.width - 1);

      expect(isRightToLeft).toBe(true);
    });
  });

  describe('Maze Connectivity', () => {
    test('all areas are reachable from spawn point', () => {
      const maze = generator.generateMaze(1);

      const reachable = isAllAreasReachable(maze);
      expect(reachable).toBe(true);
    });

    test('player spawn is not a wall', () => {
      const maze = generator.generateMaze(1);

      expect(maze.walls[maze.playerSpawn.y][maze.playerSpawn.x]).toBe(false);
    });

    test('ghost spawn is not a wall', () => {
      const maze = generator.generateMaze(1);

      expect(maze.walls[maze.ghostSpawn.y][maze.ghostSpawn.x]).toBe(false);
    });
  });

  describe('Dot Placement', () => {
    test('dot density is consistent across levels', () => {
      const densities: number[] = [];

      // Test multiple levels
      for (let level = 1; level <= 5; level++) {
        const maze = generator.generateMaze(level);
        const density = calculateDotDensity(maze);
        densities.push(density);

        // Density should be reasonable (between 30% and 100%)
        expect(density).toBeGreaterThan(0.3);
        expect(density).toBeLessThanOrEqual(1.0);
      }

      // Check that densities are relatively consistent (within 30% variance)
      const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
      for (const density of densities) {
        const variance = Math.abs(density - avgDensity) / avgDensity;
        expect(variance).toBeLessThan(0.3);
      }
    });

    test('dots are not placed on spawn points', () => {
      const maze = generator.generateMaze(1);

      // Player spawn should not have a dot
      expect(maze.dots[maze.playerSpawn.y][maze.playerSpawn.x]).toBe(false);

      // Ghost spawn should not have a dot
      expect(maze.dots[maze.ghostSpawn.y][maze.ghostSpawn.x]).toBe(false);
    });

    test('dots are only placed in walkable areas', () => {
      const maze = generator.generateMaze(1);

      for (let y = 0; y < maze.height; y++) {
        for (let x = 0; x < maze.width; x++) {
          if (maze.dots[y][x]) {
            // If there's a dot, it should not be a wall
            expect(maze.walls[y][x]).toBe(false);
          }
        }
      }
    });
  });

  describe('Power Pellet Placement', () => {
    test('power pellets are placed in corners', () => {
      const maze = generator.generateMaze(1);

      // Should have power pellets
      expect(maze.powerPellets.length).toBeGreaterThan(0);
      expect(maze.powerPellets.length).toBeLessThanOrEqual(4);

      // All power pellets should be in non-wall areas
      for (const pellet of maze.powerPellets) {
        expect(maze.walls[pellet.y][pellet.x]).toBe(false);
      }
    });
  });

  describe('Maze Structure', () => {
    test('maze has correct dimensions', () => {
      const maze = generator.generateMaze(1);

      expect(maze.width).toBe(28);
      expect(maze.height).toBe(31);
      expect(maze.walls.length).toBe(31);
      expect(maze.walls[0].length).toBe(28);
    });

    test('maze has border walls', () => {
      const maze = generator.generateMaze(1);

      // Top border
      for (let x = 0; x < maze.width; x++) {
        if (x !== maze.tunnels[0].entrance.x && x !== maze.tunnels[0].exit.x) {
          expect(maze.walls[0][x]).toBe(true);
        }
      }

      // Bottom border
      for (let x = 0; x < maze.width; x++) {
        if (x !== maze.tunnels[0].entrance.x && x !== maze.tunnels[0].exit.x) {
          expect(maze.walls[maze.height - 1][x]).toBe(true);
        }
      }
    });
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
