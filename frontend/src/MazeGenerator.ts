import { MazeData, Position, TunnelPair } from './types';

export class MazeGenerator {
  private readonly baseWidth = 28;
  private readonly baseHeight = 31;

  /**
   * Generate a procedural maze for the given level
   */
  generateMaze(level: number): MazeData {
    const width = this.baseWidth;
    const height = this.baseHeight;

    // Initialize empty maze
    const walls: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    // Create border walls
    this.createBorderWalls(walls, width, height);

    // Generate internal maze structure using recursive division
    this.generateMazeStructure(walls, 1, 1, width - 2, height - 2, level);

    // Create tunnels on opposite sides
    const tunnels = this.createTunnels(walls, width, height);

    // Define spawn points
    const playerSpawn: Position = { x: Math.floor(width / 2), y: height - 2 };
    const ghostSpawn: Position = { x: Math.floor(width / 2), y: Math.floor(height / 2) };

    // Ensure spawn points are not walls
    walls[playerSpawn.y][playerSpawn.x] = false;
    walls[ghostSpawn.y][ghostSpawn.x] = false;

    // Validate maze connectivity
    if (!this.validateMaze(walls, playerSpawn, width, height)) {
      // If validation fails, create a simpler maze
      return this.generateSimpleMaze(level);
    }

    // Place dots and power pellets
    const dots = this.placeDots(walls, width, height, playerSpawn, ghostSpawn);
    const powerPellets = this.placePowerPellets(walls, width, height);

    return {
      width,
      height,
      walls,
      dots,
      powerPellets,
      tunnels,
      ghostSpawn,
      playerSpawn,
    };
  }

  /**
   * Validate that all areas of the maze are reachable from spawn point
   */
  validateMaze(walls: boolean[][], spawn: Position, width: number, height: number): boolean {
    const visited: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    const queue: Position[] = [spawn];
    visited[spawn.y][spawn.x] = true;
    let reachableCount = 1;

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Check all four directions
      const directions = [
        { x: 0, y: -1 }, // up
        { x: 0, y: 1 },  // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 },  // right
      ];

      for (const dir of directions) {
        const newX = current.x + dir.x;
        const newY = current.y + dir.y;

        if (
          newX >= 0 &&
          newX < width &&
          newY >= 0 &&
          newY < height &&
          !visited[newY][newX] &&
          !walls[newY][newX]
        ) {
          visited[newY][newX] = true;
          queue.push({ x: newX, y: newY });
          reachableCount++;
        }
      }
    }

    // Count total non-wall spaces
    let totalSpaces = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!walls[y][x]) {
          totalSpaces++;
        }
      }
    }

    // All non-wall spaces should be reachable
    return reachableCount === totalSpaces;
  }

  private createBorderWalls(walls: boolean[][], width: number, height: number): void {
    // Top and bottom borders
    for (let x = 0; x < width; x++) {
      walls[0][x] = true;
      walls[height - 1][x] = true;
    }

    // Left and right borders
    for (let y = 0; y < height; y++) {
      walls[y][0] = true;
      walls[y][width - 1] = true;
    }
  }

  private generateMazeStructure(
    walls: boolean[][],
    x: number,
    y: number,
    w: number,
    h: number,
    level: number
  ): void {
    // Base case: area too small
    if (w < 3 || h < 3) return;

    // Increase complexity with level
    const complexity = Math.min(0.3 + level * 0.05, 0.7);
    const density = Math.min(0.2 + level * 0.03, 0.5);

    // Randomly place walls based on complexity
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (Math.random() < density) {
          const wallX = x + dx;
          const wallY = y + dy;
          if (wallX > 0 && wallX < walls[0].length - 1 && wallY > 0 && wallY < walls.length - 1) {
            walls[wallY][wallX] = true;
          }
        }
      }
    }

    // Create some corridors to ensure connectivity
    if (Math.random() < complexity) {
      const corridorY = y + Math.floor(h / 2);
      for (let dx = 0; dx < w; dx++) {
        walls[corridorY][x + dx] = false;
      }
    }

    if (Math.random() < complexity) {
      const corridorX = x + Math.floor(w / 2);
      for (let dy = 0; dy < h; dy++) {
        walls[y + dy][corridorX] = false;
      }
    }
  }

  private createTunnels(walls: boolean[][], width: number, height: number): TunnelPair[] {
    // Create tunnels on opposite sides (left and right)
    const tunnelY = Math.floor(height / 2);

    // Clear tunnel paths
    walls[tunnelY][0] = false;
    walls[tunnelY][width - 1] = false;

    const leftTunnel: Position = { x: 0, y: tunnelY };
    const rightTunnel: Position = { x: width - 1, y: tunnelY };

    return [
      {
        entrance: leftTunnel,
        exit: rightTunnel,
      },
      {
        entrance: rightTunnel,
        exit: leftTunnel,
      },
    ];
  }

  private placeDots(
    walls: boolean[][],
    width: number,
    height: number,
    playerSpawn: Position,
    ghostSpawn: Position
  ): boolean[][] {
    const dots: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    // Place dots in all non-wall spaces except spawn points
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (
          !walls[y][x] &&
          !(x === playerSpawn.x && y === playerSpawn.y) &&
          !(x === ghostSpawn.x && y === ghostSpawn.y)
        ) {
          dots[y][x] = true;
        }
      }
    }

    return dots;
  }

  private placePowerPellets(walls: boolean[][], width: number, height: number): Position[] {
    const powerPellets: Position[] = [];

    // Place 4 power pellets in corners
    const corners = [
      { x: 2, y: 2 },
      { x: width - 3, y: 2 },
      { x: 2, y: height - 3 },
      { x: width - 3, y: height - 3 },
    ];

    for (const corner of corners) {
      if (!walls[corner.y][corner.x]) {
        powerPellets.push(corner);
      }
    }

    return powerPellets;
  }

  private generateSimpleMaze(_level: number): MazeData {
    const width = this.baseWidth;
    const height = this.baseHeight;

    // Create a simple maze with corridors
    const walls: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    // Create border walls
    this.createBorderWalls(walls, width, height);

    // Create some simple wall patterns
    for (let y = 3; y < height - 3; y += 4) {
      for (let x = 3; x < width - 3; x += 4) {
        walls[y][x] = true;
        walls[y][x + 1] = true;
      }
    }

    const tunnels = this.createTunnels(walls, width, height);
    const playerSpawn: Position = { x: Math.floor(width / 2), y: height - 2 };
    const ghostSpawn: Position = { x: Math.floor(width / 2), y: Math.floor(height / 2) };

    walls[playerSpawn.y][playerSpawn.x] = false;
    walls[ghostSpawn.y][ghostSpawn.x] = false;

    const dots = this.placeDots(walls, width, height, playerSpawn, ghostSpawn);
    const powerPellets = this.placePowerPellets(walls, width, height);

    return {
      width,
      height,
      walls,
      dots,
      powerPellets,
      tunnels,
      ghostSpawn,
      playerSpawn,
    };
  }
}
