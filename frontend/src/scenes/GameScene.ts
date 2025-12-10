import Phaser from 'phaser';
import { SpriteAssets } from '../assets/SpriteAssets';
import { MazeGenerator } from '../MazeGenerator';
import { MazeData, Direction } from '../types';

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
  private readonly PLAYER_SPEED = 80;
  
  // Player movement state
  private currentDirection: Direction | null = null;
  private nextDirection: Direction | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  
  // Touch input state
  private touchStartX: number = 0;
  private touchStartY: number = 0;

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
    // Keyboard input - arrow keys
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // Keyboard input - WASD keys
    this.wasdKeys = this.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
    
    // Touch input
    this.input.on('pointerdown', this.handleTouchStart, this);
    this.input.on('pointerup', this.handleTouchEnd, this);
  }

  private handleTouchStart(pointer: Phaser.Input.Pointer): void {
    this.touchStartX = pointer.x;
    this.touchStartY = pointer.y;
  }

  private handleTouchEnd(pointer: Phaser.Input.Pointer): void {
    const deltaX = pointer.x - this.touchStartX;
    const deltaY = pointer.y - this.touchStartY;
    
    // Minimum swipe distance to register
    const minSwipeDistance = 30;
    
    // Determine swipe direction based on larger delta
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        this.nextDirection = deltaX > 0 ? 'right' : 'left';
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        this.nextDirection = deltaY > 0 ? 'down' : 'up';
      }
    }
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
    if (!this.player) return;
    
    // Check keyboard input and queue direction
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      this.nextDirection = 'left';
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      this.nextDirection = 'right';
    } else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      this.nextDirection = 'up';
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      this.nextDirection = 'down';
    }
    
    // Try to change to queued direction if possible
    if (this.nextDirection && this.canMove(this.nextDirection)) {
      this.currentDirection = this.nextDirection;
      this.nextDirection = null;
    }
    
    // Move in current direction
    if (this.currentDirection) {
      if (this.canMove(this.currentDirection)) {
        this.movePlayer(this.currentDirection);
      } else {
        // Stop if can't move in current direction
        this.player.setVelocity(0, 0);
      }
    }
  }
  
  private canMove(direction: Direction): boolean {
    if (!this.player || !this.wallLayer) return false;
    
    // Get player's current tile position
    const currentTileX = Math.floor(this.player.x / this.TILE_SIZE);
    const currentTileY = Math.floor(this.player.y / this.TILE_SIZE);
    
    // Calculate next tile position based on direction
    let nextTileX = currentTileX;
    let nextTileY = currentTileY;
    
    switch (direction) {
      case 'left':
        nextTileX--;
        break;
      case 'right':
        nextTileX++;
        break;
      case 'up':
        nextTileY--;
        break;
      case 'down':
        nextTileY++;
        break;
    }
    
    // Check if next tile is within bounds
    if (
      nextTileX < 0 ||
      nextTileX >= this.currentMaze.width ||
      nextTileY < 0 ||
      nextTileY >= this.currentMaze.height
    ) {
      return false;
    }
    
    // Check if next tile is a wall
    const tile = this.wallLayer.getTileAt(nextTileX, nextTileY);
    return !tile || tile.index === -1;
  }
  
  private movePlayer(direction: Direction): void {
    if (!this.player) return;
    
    // Set velocity based on direction
    switch (direction) {
      case 'left':
        this.player.setVelocity(-this.PLAYER_SPEED, 0);
        this.player.setFlipX(true);
        this.player.play('pacman-left', true);
        break;
      case 'right':
        this.player.setVelocity(this.PLAYER_SPEED, 0);
        this.player.setFlipX(false);
        this.player.play('pacman-right', true);
        break;
      case 'up':
        this.player.setVelocity(0, -this.PLAYER_SPEED);
        this.player.play('pacman-up', true);
        break;
      case 'down':
        this.player.setVelocity(0, this.PLAYER_SPEED);
        this.player.play('pacman-down', true);
        break;
    }
    
    // Align player to grid for smoother movement
    this.alignToGrid();
  }
  
  private alignToGrid(): void {
    if (!this.player) return;
    
    const currentTileX = Math.floor(this.player.x / this.TILE_SIZE);
    const currentTileY = Math.floor(this.player.y / this.TILE_SIZE);
    
    // If moving horizontally, align vertically to grid
    if (this.currentDirection === 'left' || this.currentDirection === 'right') {
      const targetY = currentTileY * this.TILE_SIZE + this.TILE_SIZE / 2;
      if (Math.abs(this.player.y - targetY) > 1) {
        this.player.y = Phaser.Math.Linear(this.player.y, targetY, 0.2);
      }
    }
    
    // If moving vertically, align horizontally to grid
    if (this.currentDirection === 'up' || this.currentDirection === 'down') {
      const targetX = currentTileX * this.TILE_SIZE + this.TILE_SIZE / 2;
      if (Math.abs(this.player.x - targetX) > 1) {
        this.player.x = Phaser.Math.Linear(this.player.x, targetX, 0.2);
      }
    }
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
    
    // Set up overlap detection for dots
    this.physics.add.overlap(
      this.player,
      this.dots,
      this.collectDot,
      undefined,
      this
    );
    
    // Set up overlap detection for power pellets
    this.physics.add.overlap(
      this.player,
      this.powerPellets,
      this.collectPowerPellet,
      undefined,
      this
    );
  }
  
  private collectDot(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    dot: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
  ): void {
    // Type guard to ensure we're working with a game object
    if (dot instanceof Phaser.GameObjects.GameObject) {
      // Remove the dot from the scene
      dot.destroy();
      
      // Increase score by 10 points
      this.gameState.score += 10;
    }
  }
  
  private collectPowerPellet(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    pellet: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
  ): void {
    // Type guard to ensure we're working with a game object
    if (pellet instanceof Phaser.GameObjects.GameObject) {
      // Remove the power pellet from the scene
      pellet.destroy();
      
      // Activate power mode for 10 seconds (10000 milliseconds)
      this.gameState.powerMode = true;
      this.gameState.powerModeTimer = 10000;
      
      // Increase score by 50 points (standard power pellet value)
      this.gameState.score += 50;
    }
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
  
  public getCurrentDirection(): Direction | null {
    return this.currentDirection;
  }
  
  public getNextDirection(): Direction | null {
    return this.nextDirection;
  }
  
  public setNextDirection(direction: Direction | null): void {
    this.nextDirection = direction;
  }
}

export { GameScene };

export default GameScene;
