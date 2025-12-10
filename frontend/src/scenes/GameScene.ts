import Phaser from 'phaser';
import { SpriteAssets } from '../assets/SpriteAssets';
import { MazeGenerator } from '../MazeGenerator';
import { MazeData } from '../types';

export interface GameState {
  score: number;
  lives: number;
  level: number;
  powerMode: boolean;
  powerModeTimer: number;
  gameStatus: 'playing' | 'paused' | 'gameOver';
}

class GameScene extends Phaser.Scene {
  private gameState!: GameState;
  private mazeGenerator!: MazeGenerator;
  private currentMaze!: MazeData;
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private dots!: Phaser.Physics.Arcade.StaticGroup;
  private powerPellets!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Phaser.Physics.Arcade.Sprite;
  private readonly TILE_SIZE = 16;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load all sprite assets
    // In production, these would be actual image files
    // For now, we generate them programmatically
    SpriteAssets.loadAllSprites(this);
  }

  create(): void {
    // Initialize game state
    this.gameState = {
      score: 0,
      lives: 3,
      level: 1,
      powerMode: false,
      powerModeTimer: 0,
      gameStatus: 'playing',
    };

    // Initialize maze generator
    this.mazeGenerator = new MazeGenerator();

    // Set up arcade physics
    this.physics.world.setBounds(0, 0, 448, 496);

    // Create animations
    this.createAnimations();

    // Generate and render maze
    this.generateAndRenderMaze();

    // Set up input handlers
    this.setupInput();
  }

  private createAnimations(): void {
    // Pacman movement animations (4 directions)
    // Right
    this.anims.create({
      key: 'pacman-right',
      frames: this.anims.generateFrameNumbers('pacman', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    // Left (flip right animation)
    this.anims.create({
      key: 'pacman-left',
      frames: this.anims.generateFrameNumbers('pacman', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    // Up
    this.anims.create({
      key: 'pacman-up',
      frames: this.anims.generateFrameNumbers('pacman', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    // Down
    this.anims.create({
      key: 'pacman-down',
      frames: this.anims.generateFrameNumbers('pacman', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    // Ghost animations - normal state (4 colors)
    for (let i = 0; i < 4; i++) {
      const colors = ['red', 'pink', 'cyan', 'orange'];
      const frameStart = i * 3;
      
      this.anims.create({
        key: `ghost-${colors[i]}-normal`,
        frames: [{ key: 'ghosts', frame: frameStart }],
        frameRate: 1,
      });

      this.anims.create({
        key: `ghost-${colors[i]}-frightened`,
        frames: [{ key: 'ghosts', frame: frameStart + 1 }],
        frameRate: 1,
      });

      this.anims.create({
        key: `ghost-${colors[i]}-eaten`,
        frames: [{ key: 'ghosts', frame: frameStart + 2 }],
        frameRate: 1,
      });
    }

    // Power pellet blinking animation
    this.anims.create({
      key: 'power-pellet-blink',
      frames: [
        { key: 'items', frame: 1 },
        { key: 'items', frame: 0 }, // Use empty frame for blink effect
      ],
      frameRate: 4,
      repeat: -1,
    });
  }

  private setupInput(): void {
    // Touch input - keyboard input will be added in future tasks
    this.input.on('pointerdown', this.handleTouch, this);
  }

  private handleTouch(_pointer: Phaser.Input.Pointer): void {
    // Touch handling will be implemented in future tasks
  }

  update(_time: number, delta: number): void {
    // Game loop - will be expanded in future tasks
    if (this.gameState.gameStatus !== 'playing') {
      return;
    }

    // Handle input
    this.handleInput();

    // Check tunnel teleportation
    this.checkTunnelTeleportation();

    // Update power mode timer
    if (this.gameState.powerMode) {
      this.gameState.powerModeTimer -= delta;
      if (this.gameState.powerModeTimer <= 0) {
        this.gameState.powerMode = false;
        this.gameState.powerModeTimer = 0;
      }
    }
  }

  private handleInput(): void {
    // Input processing will be implemented in future tasks
  }

  private generateAndRenderMaze(): void {
    // Generate maze data
    this.currentMaze = this.mazeGenerator.generateMaze(this.gameState.level);

    // Create tilemap
    this.createTilemap();

    // Render walls
    this.renderWalls();

    // Place dots and power pellets
    this.placeDots();
    this.placePowerPellets();

    // Set up collision detection
    this.setupCollisions();
  }

  private createTilemap(): void {
    // Create a blank tilemap
    this.tilemap = this.make.tilemap({
      tileWidth: this.TILE_SIZE,
      tileHeight: this.TILE_SIZE,
      width: this.currentMaze.width,
      height: this.currentMaze.height,
    });

    // Add the tileset
    const tileset = this.tilemap.addTilesetImage('maze-tiles', 'maze-tiles', this.TILE_SIZE, this.TILE_SIZE);

    // Create the wall layer
    if (tileset) {
      this.wallLayer = this.tilemap.createBlankLayer('walls', tileset, 0, 0)!;
    }
  }

  private renderWalls(): void {
    // Iterate through maze data and place wall tiles
    for (let y = 0; y < this.currentMaze.height; y++) {
      for (let x = 0; x < this.currentMaze.width; x++) {
        if (this.currentMaze.walls[y][x]) {
          // Place wall tile (index 0 in our tileset)
          this.wallLayer.putTileAt(0, x, y);
        }
      }
    }

    // Set collision for all wall tiles
    this.wallLayer.setCollisionByExclusion([-1]);
  }

  private placeDots(): void {
    // Create static group for dots
    this.dots = this.physics.add.staticGroup();

    // Place dots based on maze data
    for (let y = 0; y < this.currentMaze.height; y++) {
      for (let x = 0; x < this.currentMaze.width; x++) {
        if (this.currentMaze.dots[y][x]) {
          const dot = this.dots.create(
            x * this.TILE_SIZE + this.TILE_SIZE / 2,
            y * this.TILE_SIZE + this.TILE_SIZE / 2,
            'items',
            0
          );
          dot.setScale(1);
        }
      }
    }
  }

  private placePowerPellets(): void {
    // Create static group for power pellets
    this.powerPellets = this.physics.add.staticGroup();

    // Place power pellets at specified positions
    for (const pellet of this.currentMaze.powerPellets) {
      const powerPellet = this.powerPellets.create(
        pellet.x * this.TILE_SIZE + this.TILE_SIZE / 2,
        pellet.y * this.TILE_SIZE + this.TILE_SIZE / 2,
        'items',
        1
      );
      powerPellet.setScale(1);

      // Play blinking animation
      powerPellet.play('power-pellet-blink');

      // Remove dot at this position if it exists
      const dotsAtPosition = this.dots.getChildren().filter((dot: any) => {
        return (
          Math.abs(dot.x - (pellet.x * this.TILE_SIZE + this.TILE_SIZE / 2)) < 1 &&
          Math.abs(dot.y - (pellet.y * this.TILE_SIZE + this.TILE_SIZE / 2)) < 1
        );
      });
      dotsAtPosition.forEach((dot) => dot.destroy());
    }
  }

  private setupCollisions(): void {
    // Create player sprite at spawn position (will be properly initialized in future tasks)
    const spawnX = this.currentMaze.playerSpawn.x * this.TILE_SIZE + this.TILE_SIZE / 2;
    const spawnY = this.currentMaze.playerSpawn.y * this.TILE_SIZE + this.TILE_SIZE / 2;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'pacman', 0);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(12, 12); // Slightly smaller than tile for smoother movement

    // Set up collision between player and walls
    this.physics.add.collider(this.player, this.wallLayer);
  }

  private checkTunnelTeleportation(): void {
    if (!this.player) return;

    // Get player's tile position
    const playerTileX = Math.floor(this.player.x / this.TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / this.TILE_SIZE);

    // Check if player is at a tunnel entrance
    for (const tunnel of this.currentMaze.tunnels) {
      if (playerTileX === tunnel.entrance.x && playerTileY === tunnel.entrance.y) {
        // Teleport to exit
        this.player.setPosition(
          tunnel.exit.x * this.TILE_SIZE + this.TILE_SIZE / 2,
          tunnel.exit.y * this.TILE_SIZE + this.TILE_SIZE / 2
        );
        break;
      }
    }
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public setGameState(newState: Partial<GameState>): void {
    this.gameState = { ...this.gameState, ...newState };
  }

  public getAnimation(key: string): Phaser.Animations.Animation | null {
    return this.anims.get(key);
  }

  public getAllAnimations(): Phaser.Animations.Animation[] {
    const animManager = this.anims;
    // Access the animations through the public exists method to check all keys
    const allKeys = ['pacman-right', 'pacman-left', 'pacman-up', 'pacman-down',
      'ghost-red-normal', 'ghost-pink-normal', 'ghost-cyan-normal', 'ghost-orange-normal',
      'ghost-red-frightened', 'ghost-pink-frightened', 'ghost-cyan-frightened', 'ghost-orange-frightened',
      'ghost-red-eaten', 'ghost-pink-eaten', 'ghost-cyan-eaten', 'ghost-orange-eaten',
      'power-pellet-blink'];
    
    return allKeys
      .map(key => animManager.get(key))
      .filter((anim): anim is Phaser.Animations.Animation => anim !== null);
  }

  public getCurrentMaze(): MazeData {
    return this.currentMaze;
  }

  public getTilemap(): Phaser.Tilemaps.Tilemap {
    return this.tilemap;
  }

  public getWallLayer(): Phaser.Tilemaps.TilemapLayer {
    return this.wallLayer;
  }

  public getDots(): Phaser.Physics.Arcade.StaticGroup {
    return this.dots;
  }

  public getPowerPellets(): Phaser.Physics.Arcade.StaticGroup {
    return this.powerPellets;
  }

  public getPlayer(): Phaser.Physics.Arcade.Sprite {
    return this.player;
  }
}

export { GameScene };

export default GameScene;
