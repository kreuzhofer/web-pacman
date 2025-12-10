import Phaser from 'phaser';
import { SpriteAssets } from '../assets/SpriteAssets';
import { MazeGenerator } from '../MazeGenerator';
import { MazeData, Direction, GhostState, GhostColor, GhostMode } from '../types';

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
  private ghosts!: GhostState[];
  private readonly TILE_SIZE = 16;
  private readonly PLAYER_SPEED = 80;
  private readonly BASE_GHOST_SPEED = 60;
  private readonly BASE_GHOST_FRIGHTENED_SPEED = 40;
  private readonly BASE_POWER_PELLET_DURATION = 10000; // 10 seconds
  private scatterModeTimer: number = 0;
  private readonly SCATTER_DURATION = 7000; // 7 seconds
  private readonly CHASE_DURATION = 20000; // 20 seconds
  
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
  
  // Audio
  private chompSound!: Phaser.Sound.BaseSound;
  private dotSound!: Phaser.Sound.BaseSound;
  private powerPelletSound!: Phaser.Sound.BaseSound;
  private eatGhostSound!: Phaser.Sound.BaseSound;
  private deathSound!: Phaser.Sound.BaseSound;
  private sirenSound!: Phaser.Sound.BaseSound;
  private isMoving: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load all sprite assets
    // In production, these would be actual image files
    // For now, we generate them programmatically
    SpriteAssets.loadAllSprites(this);
    
    // Load audio files
    this.load.audio('chomp', 'assets/sounds/chomp.wav');
    this.load.audio('dot', 'assets/sounds/dot.wav');
    this.load.audio('power-pellet', 'assets/sounds/power-pellet.wav');
    this.load.audio('eat-ghost', 'assets/sounds/eat-ghost.wav');
    this.load.audio('death', 'assets/sounds/death.wav');
    this.load.audio('siren', 'assets/sounds/siren.wav');
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
    
    // Initialize audio
    this.initializeAudio();

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
  
  private initializeAudio(): void {
    // Initialize all sound effects
    this.chompSound = this.sound.add('chomp', { volume: 0.3 });
    this.dotSound = this.sound.add('dot', { volume: 0.2 });
    this.powerPelletSound = this.sound.add('power-pellet', { volume: 0.3 });
    this.eatGhostSound = this.sound.add('eat-ghost', { volume: 0.3 });
    this.deathSound = this.sound.add('death', { volume: 0.4 });
    this.sirenSound = this.sound.add('siren', { volume: 0.2, loop: true });
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
        this.exitPowerMode();
      }
    }
    
    // Update scatter/chase mode timer
    this.updateGhostModeTimer(delta);
    
    // Update ghost AI
    this.updateGhosts(delta);
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
        this.isMoving = false;
      }
    } else {
      // No direction, player is stopped
      this.isMoving = false;
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
    
    // Play movement sound if not already playing
    if (!this.isMoving) {
      this.isMoving = true;
      this.playChompSound();
    }
    
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
  
  private playChompSound(): void {
    // Play chomp sound with a slight delay between plays for rhythm
    if (this.chompSound && !this.chompSound.isPlaying) {
      this.chompSound.play();
      // Schedule next chomp sound
      this.time.delayedCall(200, () => {
        if (this.isMoving && this.gameState.gameStatus === 'playing') {
          this.playChompSound();
        }
      });
    }
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
    
    // Initialize ghosts
    this.initializeGhosts();
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
  
  private setupGhostCollisions(): void {
    // Set up overlap detection for ghosts (will be called after ghosts are initialized)
    this.ghosts.forEach(ghost => {
      if (ghost.sprite) {
        this.physics.add.overlap(
          this.player,
          ghost.sprite,
          () => this.handleGhostCollision(ghost),
          undefined,
          this
        );
      }
    });
  }
  
  private collectDot(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    dot: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
  ): void {
    // Type guard to ensure we're working with a game object
    if (dot instanceof Phaser.GameObjects.GameObject) {
      // Remove the dot from the scene
      dot.destroy();
      
      // Play dot collection sound
      if (this.dotSound) {
        this.dotSound.play();
      }
      
      // Increase score by 10 points
      this.gameState.score += 10;
      
      // Check if all dots are collected
      this.checkLevelCompletion();
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
      
      // Play power pellet sound
      if (this.powerPelletSound) {
        this.powerPelletSound.play();
      }
      
      // Activate power mode
      this.enterPowerMode();
      
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
  
  private initializeGhosts(): void {
    const colors: GhostColor[] = ['red', 'pink', 'cyan', 'orange'];
    const spawnX = this.currentMaze.ghostSpawn.x * this.TILE_SIZE + this.TILE_SIZE / 2;
    const spawnY = this.currentMaze.ghostSpawn.y * this.TILE_SIZE + this.TILE_SIZE / 2;
    
    // Define scatter targets (corners of the maze)
    const scatterTargets = [
      { x: this.currentMaze.width - 2, y: 0 }, // Red: top-right
      { x: 2, y: 0 }, // Pink: top-left
      { x: this.currentMaze.width - 2, y: this.currentMaze.height - 2 }, // Cyan: bottom-right
      { x: 2, y: this.currentMaze.height - 2 }, // Orange: bottom-left
    ];
    
    // Calculate ghost speed based on level (increase by 5% per level, max 50% increase)
    const ghostSpeed = this.calculateGhostSpeed();
    
    this.ghosts = colors.map((color, index) => {
      const sprite = this.physics.add.sprite(spawnX, spawnY, 'ghosts', index * 3);
      sprite.setCollideWorldBounds(true);
      sprite.setSize(12, 12);
      sprite.play(`ghost-${color}-normal`);
      
      return {
        id: color,
        sprite,
        color,
        mode: 'scatter' as GhostMode,
        direction: 'left' as Direction,
        speed: ghostSpeed,
        scatterTarget: scatterTargets[index],
      };
    });
    
    // Start in scatter mode
    this.scatterModeTimer = this.SCATTER_DURATION;
    
    // Set up ghost collisions
    this.setupGhostCollisions();
  }
  
  private updateGhostModeTimer(delta: number): void {
    // Don't update mode timer during power mode
    if (this.gameState.powerMode) return;
    
    this.scatterModeTimer -= delta;
    
    if (this.scatterModeTimer <= 0) {
      // Toggle between scatter and chase modes
      const currentMode = this.ghosts[0].mode;
      const newMode: GhostMode = currentMode === 'scatter' ? 'chase' : 'scatter';
      
      this.ghosts.forEach(ghost => {
        if (ghost.mode !== 'frightened' && ghost.mode !== 'eaten') {
          ghost.mode = newMode;
        }
      });
      
      // Reset timer
      this.scatterModeTimer = newMode === 'scatter' ? this.SCATTER_DURATION : this.CHASE_DURATION;
    }
  }
  
  private updateGhosts(_delta: number): void {
    if (!this.player) return;
    
    this.ghosts.forEach(ghost => {
      if (!ghost.sprite) return;
      
      // Get current tile position
      const ghostTileX = Math.floor(ghost.sprite.x / this.TILE_SIZE);
      const ghostTileY = Math.floor(ghost.sprite.y / this.TILE_SIZE);
      
      // Check if ghost is at intersection (can change direction)
      const isAtIntersection = this.isAtIntersection(ghostTileX, ghostTileY);
      
      if (isAtIntersection) {
        // Choose new direction based on AI mode
        const newDirection = this.chooseGhostDirection(ghost, ghostTileX, ghostTileY);
        if (newDirection) {
          ghost.direction = newDirection;
        }
      }
      
      // Move ghost in current direction
      this.moveGhost(ghost);
    });
  }
  
  private isAtIntersection(tileX: number, tileY: number): boolean {
    // Count available directions
    let availableDirections = 0;
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    
    for (const dir of directions) {
      if (this.canGhostMove(tileX, tileY, dir)) {
        availableDirections++;
      }
    }
    
    // Intersection if more than 2 directions available (not just forward/backward)
    return availableDirections > 2;
  }
  
  private canGhostMove(tileX: number, tileY: number, direction: Direction): boolean {
    let nextTileX = tileX;
    let nextTileY = tileY;
    
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
    
    // Check bounds
    if (
      nextTileX < 0 ||
      nextTileX >= this.currentMaze.width ||
      nextTileY < 0 ||
      nextTileY >= this.currentMaze.height
    ) {
      return false;
    }
    
    // Check if it's a wall
    const tile = this.wallLayer.getTileAt(nextTileX, nextTileY);
    return !tile || tile.index === -1;
  }
  
  private chooseGhostDirection(ghost: GhostState, tileX: number, tileY: number): Direction | null {
    const playerTileX = Math.floor(this.player.x / this.TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / this.TILE_SIZE);
    
    let targetX: number;
    let targetY: number;
    
    // Determine target based on mode
    if (ghost.mode === 'chase') {
      // Chase mode: target player position
      targetX = playerTileX;
      targetY = playerTileY;
    } else if (ghost.mode === 'scatter') {
      // Scatter mode: target corner
      targetX = ghost.scatterTarget.x;
      targetY = ghost.scatterTarget.y;
    } else if (ghost.mode === 'frightened') {
      // Frightened mode: random movement
      return this.getRandomDirection(tileX, tileY, ghost.direction);
    } else {
      // Eaten mode: return to spawn
      targetX = this.currentMaze.ghostSpawn.x;
      targetY = this.currentMaze.ghostSpawn.y;
    }
    
    // Find best direction toward target (no backtracking)
    const oppositeDirection = this.getOppositeDirection(ghost.direction);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const availableDirections = directions.filter(
      dir => dir !== oppositeDirection && this.canGhostMove(tileX, tileY, dir)
    );
    
    if (availableDirections.length === 0) {
      // If no other option, allow backtracking
      return this.getOppositeDirection(ghost.direction);
    }
    
    // Choose direction that minimizes distance to target
    let bestDirection: Direction | null = null;
    let bestDistance = Infinity;
    
    for (const dir of availableDirections) {
      const nextTileX = tileX + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
      const nextTileY = tileY + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
      
      const distance = Math.sqrt(
        Math.pow(nextTileX - targetX, 2) + Math.pow(nextTileY - targetY, 2)
      );
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestDirection = dir;
      }
    }
    
    return bestDirection;
  }
  
  private getRandomDirection(tileX: number, tileY: number, currentDirection: Direction): Direction {
    const oppositeDirection = this.getOppositeDirection(currentDirection);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const availableDirections = directions.filter(
      dir => dir !== oppositeDirection && this.canGhostMove(tileX, tileY, dir)
    );
    
    if (availableDirections.length === 0) {
      return this.getOppositeDirection(currentDirection);
    }
    
    return availableDirections[Math.floor(Math.random() * availableDirections.length)];
  }
  
  private getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
      case 'up': return 'down';
      case 'down': return 'up';
      case 'left': return 'right';
      case 'right': return 'left';
    }
  }
  
  private moveGhost(ghost: GhostState): void {
    if (!ghost.sprite) return;
    
    const frightenedSpeed = this.calculateGhostFrightenedSpeed();
    const speed = ghost.mode === 'frightened' ? frightenedSpeed : ghost.speed;
    
    switch (ghost.direction) {
      case 'left':
        ghost.sprite.setVelocity(-speed, 0);
        break;
      case 'right':
        ghost.sprite.setVelocity(speed, 0);
        break;
      case 'up':
        ghost.sprite.setVelocity(0, -speed);
        break;
      case 'down':
        ghost.sprite.setVelocity(0, speed);
        break;
    }
  }
  
  private enterPowerMode(): void {
    this.gameState.powerMode = true;
    // Calculate power pellet duration based on level (decrease by 10% per level, min 3 seconds)
    this.gameState.powerModeTimer = this.calculatePowerPelletDuration();
    
    // Play siren sound during power mode
    if (this.sirenSound && !this.sirenSound.isPlaying) {
      this.sirenSound.play();
    }
    
    // Change all ghosts to frightened mode
    this.ghosts.forEach(ghost => {
      if (ghost.mode !== 'eaten') {
        ghost.mode = 'frightened';
        ghost.sprite?.play(`ghost-${ghost.color}-frightened`);
      }
    });
  }
  
  private exitPowerMode(): void {
    this.gameState.powerMode = false;
    this.gameState.powerModeTimer = 0;
    
    // Stop siren sound
    if (this.sirenSound && this.sirenSound.isPlaying) {
      this.sirenSound.stop();
    }
    
    // Return ghosts to normal mode
    this.ghosts.forEach(ghost => {
      if (ghost.mode === 'frightened') {
        ghost.mode = 'chase';
        ghost.sprite?.play(`ghost-${ghost.color}-normal`);
      }
    });
  }
  
  private respawnGhost(ghost: GhostState): void {
    if (!ghost.sprite) return;
    
    const spawnX = this.currentMaze.ghostSpawn.x * this.TILE_SIZE + this.TILE_SIZE / 2;
    const spawnY = this.currentMaze.ghostSpawn.y * this.TILE_SIZE + this.TILE_SIZE / 2;
    
    ghost.sprite.setPosition(spawnX, spawnY);
    ghost.mode = 'scatter';
    ghost.direction = 'left';
    ghost.sprite.play(`ghost-${ghost.color}-normal`);
  }
  
  private handleGhostCollision(ghost: GhostState): void {
    if (this.gameState.gameStatus !== 'playing') return;
    
    if (this.gameState.powerMode && ghost.mode === 'frightened') {
      // Player eats ghost
      this.eatGhost(ghost);
    } else if (ghost.mode !== 'frightened' && ghost.mode !== 'eaten') {
      // Ghost catches player
      this.loseLife();
    }
  }
  
  private eatGhost(ghost: GhostState): void {
    // Play ghost eaten sound
    if (this.eatGhostSound) {
      this.eatGhostSound.play();
    }
    
    // Award bonus points (200, 400, 800, 1600 for consecutive ghosts)
    // For simplicity, we'll award 200 points per ghost
    this.gameState.score += 200;
    
    // Change ghost to eaten mode
    ghost.mode = 'eaten';
    ghost.sprite?.play(`ghost-${ghost.color}-eaten`);
    
    // Respawn ghost after a delay
    this.time.delayedCall(3000, () => {
      this.respawnGhost(ghost);
    });
  }
  
  private loseLife(): void {
    // Play death sound
    if (this.deathSound) {
      this.deathSound.play();
    }
    
    // Stop movement sound
    this.isMoving = false;
    
    // Stop siren if playing
    if (this.sirenSound && this.sirenSound.isPlaying) {
      this.sirenSound.stop();
    }
    
    // Decrease lives
    this.gameState.lives -= 1;
    
    // Check for game over
    if (this.gameState.lives <= 0) {
      this.gameOver();
    } else {
      // Reset positions after death sound finishes
      this.time.delayedCall(1000, () => {
        this.resetPositions();
      });
    }
  }
  
  private gameOver(): void {
    this.gameState.gameStatus = 'gameOver';
    this.gameState.lives = 0;
    
    // Stop all sounds
    this.isMoving = false;
    if (this.sirenSound && this.sirenSound.isPlaying) {
      this.sirenSound.stop();
    }
    
    // Stop all sprites
    this.player?.setVelocity(0, 0);
    this.ghosts.forEach(ghost => ghost.sprite?.setVelocity(0, 0));
    
    // Emit game over event (will be used by React UI in future tasks)
    this.events.emit('gameOver', this.gameState.score);
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
  
  public getGhosts(): GhostState[] {
    return this.ghosts;
  }
  
  public resetPositions(): void {
    // Reset player position
    if (this.player) {
      const spawnX = this.currentMaze.playerSpawn.x * this.TILE_SIZE + this.TILE_SIZE / 2;
      const spawnY = this.currentMaze.playerSpawn.y * this.TILE_SIZE + this.TILE_SIZE / 2;
      this.player.setPosition(spawnX, spawnY);
      this.player.setVelocity(0, 0);
      this.currentDirection = null;
      this.nextDirection = null;
    }
    
    // Reset ghost positions
    this.ghosts.forEach(ghost => this.respawnGhost(ghost));
  }
  
  private checkLevelCompletion(): void {
    // Check if all dots and power pellets are collected
    const remainingDots = this.dots.getChildren().length;
    const remainingPellets = this.powerPellets.getChildren().length;
    
    if (remainingDots === 0 && remainingPellets === 0) {
      this.advanceLevel();
    }
  }
  
  private advanceLevel(): void {
    // Increment level
    this.gameState.level += 1;
    
    // Stop player and ghosts
    this.player?.setVelocity(0, 0);
    this.ghosts.forEach(ghost => ghost.sprite?.setVelocity(0, 0));
    
    // Clear current maze elements
    this.clearMaze();
    
    // Generate new maze for next level
    this.generateAndRenderMaze();
    
    // Reset movement state
    this.currentDirection = null;
    this.nextDirection = null;
    
    // Exit power mode if active
    if (this.gameState.powerMode) {
      this.exitPowerMode();
    }
    
    // Emit level advance event
    this.events.emit('levelAdvance', this.gameState.level);
  }
  
  private clearMaze(): void {
    // Destroy all dots
    this.dots?.clear(true, true);
    
    // Destroy all power pellets
    this.powerPellets?.clear(true, true);
    
    // Destroy all ghost sprites
    this.ghosts?.forEach(ghost => {
      ghost.sprite?.destroy();
    });
    
    // Destroy tilemap and layers
    this.wallLayer?.destroy();
    this.tilemap?.destroy();
  }
  
  public getLevel(): number {
    return this.gameState.level;
  }
  
  private calculateGhostSpeed(): number {
    // Increase ghost speed by 5% per level, max 50% increase (level 10+)
    const speedMultiplier = Math.min(1 + (this.gameState.level - 1) * 0.05, 1.5);
    return this.BASE_GHOST_SPEED * speedMultiplier;
  }
  
  private calculateGhostFrightenedSpeed(): number {
    // Frightened speed also increases with level but stays slower than normal
    const speedMultiplier = Math.min(1 + (this.gameState.level - 1) * 0.05, 1.5);
    return this.BASE_GHOST_FRIGHTENED_SPEED * speedMultiplier;
  }
  
  private calculatePowerPelletDuration(): number {
    // Decrease power pellet duration by 10% per level, minimum 3 seconds
    const durationMultiplier = Math.max(1 - (this.gameState.level - 1) * 0.1, 0.3);
    return this.BASE_POWER_PELLET_DURATION * durationMultiplier;
  }
  
  public getPowerPelletDuration(): number {
    return this.calculatePowerPelletDuration();
  }
  
  public getGhostSpeed(): number {
    return this.calculateGhostSpeed();
  }
}

export { GameScene };

export default GameScene;
