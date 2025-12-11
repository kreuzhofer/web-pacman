import { MazeData, Position, TunnelPair } from './types';

export class MazeGenerator {
  private readonly baseWidth = 28;
  private readonly baseHeight = 31;

  /**
   * Generate a procedural maze for the given level
   * Creates a classic Pac-Man style maze with 1-tile-wide corridors
   */
  generateMaze(_level: number): MazeData {
    const width = this.baseWidth;
    const height = this.baseHeight;

    // Initialize maze - start with all walls
    const walls: boolean[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(true));

    // Create the classic Pac-Man style maze layout
    this.createClassicMazeLayout(walls, width, height);

    // Create tunnels on opposite sides
    const tunnels = this.createTunnels(walls, width, height);

    // Define spawn points
    const playerSpawn: Position = { x: Math.floor(width / 2), y: height - 2 };
    const ghostSpawn: Position = { x: Math.floor(width / 2), y: Math.floor(height / 2) };

    // Ensure spawn points are not walls
    walls[playerSpawn.y][playerSpawn.x] = false;
    walls[ghostSpawn.y][ghostSpawn.x] = false;

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
   * Create a classic Pac-Man style maze with proper 1-tile corridors
   */
  private createClassicMazeLayout(walls: boolean[][], width: number, height: number): void {
    // Create horizontal corridors (rows where player can move)
    // Corridors at specific y positions
    const corridorRows = [1, 5, 9, 11, 15, 19, 23, 25, 29];
    
    for (const y of corridorRows) {
      if (y < height) {
        for (let x = 1; x < width - 1; x++) {
          walls[y][x] = false;
        }
      }
    }
    
    // Create vertical corridors (columns where player can move)
    const corridorCols = [1, 6, 12, 15, 21, 26];
    
    for (const x of corridorCols) {
      if (x < width) {
        for (let y = 1; y < height - 1; y++) {
          walls[y][x] = false;
        }
      }
    }
    
    // Add some additional vertical connections for variety
    // Left side vertical corridors
    for (let y = 1; y < 10; y++) {
      walls[y][1] = false;
      walls[y][6] = false;
    }
    
    // Right side vertical corridors  
    for (let y = 1; y < 10; y++) {
      walls[y][width - 2] = false;
      walls[y][width - 7] = false;
    }
    
    // Middle vertical corridors
    for (let y = 5; y < height - 5; y++) {
      walls[y][Math.floor(width / 2)] = false;
      walls[y][Math.floor(width / 2) - 1] = false;
    }
    
    // Create ghost house area in the center
    const ghostHouseY = Math.floor(height / 2);
    const ghostHouseX = Math.floor(width / 2);
    
    // Clear area around ghost spawn - extend to connect to corridors at y=11 and y=19
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const y = ghostHouseY + dy;
        const x = ghostHouseX + dx;
        if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
          walls[y][x] = false;
        }
      }
    }
    
    // Ensure vertical exit paths from ghost house connect to horizontal corridors
    // Connect to corridor at y=11 (above ghost house)
    for (let y = 11; y <= ghostHouseY; y++) {
      walls[y][ghostHouseX] = false;
      walls[y][ghostHouseX - 1] = false;
    }
    // Connect to corridor at y=19 (below ghost house)
    for (let y = ghostHouseY; y <= 19; y++) {
      walls[y][ghostHouseX] = false;
      walls[y][ghostHouseX - 1] = false;
    }
    
    // Create bottom area for player spawn
    const playerAreaY = height - 2;
    for (let x = 1; x < width - 1; x++) {
      walls[playerAreaY][x] = false;
      walls[playerAreaY - 1][x] = false;
    }
    
    // Add some wall blocks to create the maze structure
    this.addWallBlocks(walls, width, height);
  }
  
  /**
   * Add wall blocks to create maze structure within corridors
   */
  private addWallBlocks(walls: boolean[][], width: number, height: number): void {
    // Add rectangular wall blocks in strategic positions
    // These create the classic Pac-Man maze feel
    
    // Top-left block
    this.addWallBlock(walls, 3, 2, 4, 3, width, height);
    
    // Top-right block
    this.addWallBlock(walls, width - 7, 2, 4, 3, width, height);
    
    // Top-center blocks
    this.addWallBlock(walls, 8, 2, 3, 3, width, height);
    this.addWallBlock(walls, width - 11, 2, 3, 3, width, height);
    
    // Middle-left blocks
    this.addWallBlock(walls, 3, 7, 4, 2, width, height);
    this.addWallBlock(walls, 3, 12, 4, 3, width, height);
    
    // Middle-right blocks
    this.addWallBlock(walls, width - 7, 7, 4, 2, width, height);
    this.addWallBlock(walls, width - 7, 12, 4, 3, width, height);
    
    // Bottom blocks
    this.addWallBlock(walls, 3, 20, 4, 3, width, height);
    this.addWallBlock(walls, width - 7, 20, 4, 3, width, height);
    this.addWallBlock(walls, 8, 20, 3, 3, width, height);
    this.addWallBlock(walls, width - 11, 20, 3, 3, width, height);
    
    // Lower blocks
    this.addWallBlock(walls, 3, 26, 4, 2, width, height);
    this.addWallBlock(walls, width - 7, 26, 4, 2, width, height);
  }
  
  /**
   * Add a rectangular wall block
   */
  private addWallBlock(
    walls: boolean[][],
    startX: number,
    startY: number,
    blockWidth: number,
    blockHeight: number,
    mazeWidth: number,
    mazeHeight: number
  ): void {
    for (let dy = 0; dy < blockHeight; dy++) {
      for (let dx = 0; dx < blockWidth; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x > 0 && x < mazeWidth - 1 && y > 0 && y < mazeHeight - 1) {
          walls[y][x] = true;
        }
      }
    }
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

    let totalSpaces = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!walls[y][x]) {
          totalSpaces++;
        }
      }
    }

    return reachableCount === totalSpaces;
  }

  private createTunnels(walls: boolean[][], width: number, height: number): TunnelPair[] {
    const tunnelY = Math.floor(height / 2);

    // Clear tunnel paths on both sides
    walls[tunnelY][0] = false;
    walls[tunnelY][width - 1] = false;
    
    // Ensure corridor connects to tunnels
    for (let x = 0; x < 3; x++) {
      walls[tunnelY][x] = false;
      walls[tunnelY][width - 1 - x] = false;
    }

    const leftTunnel: Position = { x: 0, y: tunnelY };
    const rightTunnel: Position = { x: width - 1, y: tunnelY };

    return [
      { entrance: leftTunnel, exit: rightTunnel },
      { entrance: rightTunnel, exit: leftTunnel },
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

    // Place dots in all walkable spaces except spawn points
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (walls[y][x]) continue;
        
        // Skip spawn points and area around ghost spawn
        const distToGhost = Math.abs(x - ghostSpawn.x) + Math.abs(y - ghostSpawn.y);
        if ((x === playerSpawn.x && y === playerSpawn.y) || distToGhost <= 2) {
          continue;
        }
        
        dots[y][x] = true;
      }
    }

    return dots;
  }

  private placePowerPellets(walls: boolean[][], width: number, height: number): Position[] {
    const powerPellets: Position[] = [];

    // Place 4 power pellets near corners
    const corners = [
      { x: 1, y: 3 },
      { x: width - 2, y: 3 },
      { x: 1, y: height - 4 },
      { x: width - 2, y: height - 4 },
    ];

    for (const corner of corners) {
      if (!walls[corner.y][corner.x]) {
        powerPellets.push(corner);
      }
    }

    return powerPellets;
  }
}
