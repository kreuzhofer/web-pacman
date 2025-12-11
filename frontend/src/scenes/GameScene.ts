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
  private readonly BASE_SCATTER_DURATION = 5000; // 5 seconds base
  private readonly BASE_CHASE_DURATION = 20000; // 20 seconds base
  
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
  private spaceKey!: Phaser.Input.Keyboard.Key;
  
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
    
    // Pause key - Space
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => {
      if (this.gameState.gameStatus === 'gameOver') {
        this.restartGame();
      } else {
        this.togglePause();
      }
    });
    
    // Restart key - R
    const restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    restartKey.on('down', () => {
      if (this.gameState.gameStatus === 'gameOver') {
        this.restartGame();
      }
    });
    
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
  
  private togglePause(): void {
    if (this.gameState.gameStatus === 'playing') {
      this.pauseGame();
    } else if (this.gameState.gameStatus === 'paused') {
      this.resumeGame();
    }
  }
  
  public pauseGame(): void {
    if (this.gameState.gameStatus !== 'playing') return;
    
    this.gameState.gameStatus = 'paused';
    
    // Stop all movement
    this.player?.setVelocity(0, 0);
    this.ghosts.forEach(ghost => ghost.sprite?.setVelocity(0, 0));
    
    // Stop movement sound
    this.isMoving = false;
    
    // Pause siren if playing
    if (this.sirenSound && this.sirenSound.isPlaying) {
      (this.sirenSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).pause();
    }
    
    // Emit pause event
    this.events.emit('gamePaused');
  }
  
  public resumeGame(): void {
    if (this.gameState.gameStatus !== 'paused') return;
    
    this.gameState.gameStatus = 'playing';
    
    // Resume siren if in power mode
    if (this.gameState.powerMode && this.sirenSound) {
      (this.sirenSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).resume();
    }
    
    // Emit resume event
    this.events.emit('gameResumed');
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
        try { this.player.play('pacman-left', true); } catch (_e) { /* ignore */ }
        break;
      case 'right':
        this.player.setVelocity(this.PLAYER_SPEED, 0);
        this.player.setFlipX(false);
        try { this.player.play('pacman-right', true); } catch (_e) { /* ignore */ }
        break;
      case 'up':
        this.player.setVelocity(0, -this.PLAYER_SPEED);
        try { this.player.play('pacman-up', true); } catch (_e) { /* ignore */ }
        break;
      case 'down':
        this.player.setVelocity(0, this.PLAYER_SPEED);
        try { this.player.play('pacman-down', true); } catch (_e) { /* ignore */ }
        break;
    }
    
    // Align player to grid for smoother movement
    this.alignToGrid();
  }
  
  private playChompSound(): void {
    // Play chomp sound with a slight delay between plays for rhythm
    try {
      if (this.chompSound && !this.chompSound.isPlaying) {
        this.chompSound.play();
        // Schedule next chomp sound
        this.time.delayedCall(200, () => {
          if (this.isMoving && this.gameState.gameStatus === 'playing') {
            this.playChompSound();
          }
        });
      }
    } catch (e) {
      // Ignore audio errors - game should continue without sound
      console.warn('Audio playback error:', e);
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
    
    // Set depth to ensure walls render on top of dots
    this.wallLayer.setDepth(2);
  }

  private placeDots(): void {
    // Create static group for dots
    this.dots = this.physics.add.staticGroup();

    // Place dots based on maze data
    for (let y = 0; y < this.currentMaze.height; y++) {
      for (let x = 0; x < this.currentMaze.width; x++) {
        // Double-check: only place dot if maze says there's a dot AND no wall
        if (this.currentMaze.dots[y][x] && !this.currentMaze.walls[y][x]) {
          const dot = this.dots.create(
            x * this.TILE_SIZE + this.TILE_SIZE / 2,
            y * this.TILE_SIZE + this.TILE_SIZE / 2,
            'items',
            0
          );
          dot.setScale(1);
          dot.setDepth(1); // Ensure dots render below walls
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
    this.player.setDepth(10); // Render on top of everything

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

    // Check if player is at a tunnel entrance (edge of map)
    // Left tunnel: x = 0, teleport to right side (but not at the edge)
    if (playerTileX <= 0 && this.currentDirection === 'left') {
      // Teleport to right side, one tile inside
      this.player.setPosition(
        (this.currentMaze.width - 2) * this.TILE_SIZE + this.TILE_SIZE / 2,
        playerTileY * this.TILE_SIZE + this.TILE_SIZE / 2
      );
      return;
    }
    
    // Right tunnel: x = width-1, teleport to left side (but not at the edge)
    if (playerTileX >= this.currentMaze.width - 1 && this.currentDirection === 'right') {
      // Teleport to left side, one tile inside
      this.player.setPosition(
        1 * this.TILE_SIZE + this.TILE_SIZE / 2,
        playerTileY * this.TILE_SIZE + this.TILE_SIZE / 2
      );
      return;
    }
  }
  
  private initializeGhosts(): void {
    const colors: GhostColor[] = ['red', 'pink', 'cyan', 'orange'];
    const baseSpawnX = this.currentMaze.ghostSpawn.x;
    const baseSpawnY = this.currentMaze.ghostSpawn.y;
    
    // Spawn each ghost at a different position around the ghost house
    // Place them on the exit corridor (row 11) so they can immediately start moving
    const spawnOffsets = [
      { x: -2, y: -2 }, // Red: top-left of ghost house
      { x: 2, y: -2 },  // Pink: top-right of ghost house
      { x: -2, y: 2 },  // Cyan: bottom-left of ghost house
      { x: 2, y: 2 },   // Orange: bottom-right of ghost house
    ];
    
    // Define scatter targets (corners of the maze)
    const scatterTargets = [
      { x: this.currentMaze.width - 2, y: 1 }, // Red: top-right
      { x: 1, y: 1 }, // Pink: top-left
      { x: this.currentMaze.width - 2, y: this.currentMaze.height - 2 }, // Cyan: bottom-right
      { x: 1, y: this.currentMaze.height - 2 }, // Orange: bottom-left
    ];
    
    // Different starting directions for each ghost - point them toward exits
    const startDirections: Direction[] = ['up', 'up', 'down', 'down'];
    
    // Calculate ghost speed based on level (increase by 5% per level, max 50% increase)
    const ghostSpeed = this.calculateGhostSpeed();
    
    this.ghosts = colors.map((color, index) => {
      const spawnX = (baseSpawnX + spawnOffsets[index].x) * this.TILE_SIZE + this.TILE_SIZE / 2;
      const spawnY = (baseSpawnY + spawnOffsets[index].y) * this.TILE_SIZE + this.TILE_SIZE / 2;
      
      const sprite = this.physics.add.sprite(spawnX, spawnY, 'ghosts', index * 3);
      sprite.setCollideWorldBounds(true);
      sprite.setSize(12, 12);
      sprite.setDepth(10); // Render on top of everything
      sprite.play(`ghost-${color}-normal`);
      
      // Don't use physics collider - we handle wall collision manually in moveGhost
      // This allows ghosts to move freely in open areas like the ghost house
      
      return {
        id: color,
        sprite,
        color,
        mode: 'scatter' as GhostMode,
        direction: startDirections[index],
        speed: ghostSpeed,
        scatterTarget: scatterTargets[index],
      };
    });
    
    // Start in scatter mode (brief scatter before chase)
    this.scatterModeTimer = this.calculateScatterDuration();
    
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
      
      // Reset timer - scatter gets shorter and chase gets longer at higher levels
      const scatterDuration = this.calculateScatterDuration();
      const chaseDuration = this.calculateChaseDuration();
      this.scatterModeTimer = newMode === 'scatter' ? scatterDuration : chaseDuration;
    }
  }
  
  private calculateScatterDuration(): number {
    // Scatter duration decreases with level (min 2 seconds)
    const reduction = (this.gameState.level - 1) * 500; // 0.5 seconds less per level
    return Math.max(2000, this.BASE_SCATTER_DURATION - reduction);
  }
  
  private calculateChaseDuration(): number {
    // Chase duration increases with level (max 40 seconds)
    const increase = (this.gameState.level - 1) * 2000; // 2 seconds more per level
    return Math.min(40000, this.BASE_CHASE_DURATION + increase);
  }
  
  private updateGhosts(_delta: number): void {
    if (!this.player) return;
    
    this.ghosts.forEach(ghost => {
      if (!ghost.sprite) return;
      
      const frightenedSpeed = this.calculateGhostFrightenedSpeed();
      const speed = ghost.mode === 'frightened' ? frightenedSpeed : ghost.speed;
      
      // Get the tile the ghost is currently in (use floor for consistency)
      const ghostTileX = Math.floor(ghost.sprite.x / this.TILE_SIZE);
      const ghostTileY = Math.floor(ghost.sprite.y / this.TILE_SIZE);
      
      // Calculate the center of the current tile
      const tileCenterX = ghostTileX * this.TILE_SIZE + this.TILE_SIZE / 2;
      const tileCenterY = ghostTileY * this.TILE_SIZE + this.TILE_SIZE / 2;
      
      // Distance from tile center
      const distFromCenterX = Math.abs(ghost.sprite.x - tileCenterX);
      const distFromCenterY = Math.abs(ghost.sprite.y - tileCenterY);
      
      // Check if ghost is at tile center (within 3 pixels for more reliable detection)
      const atTileCenter = distFromCenterX < 3 && distFromCenterY < 3;
      
      // Track the last tile where we made a decision
      const currentTileKey = `${ghostTileX},${ghostTileY}`;
      const lastTileKey = (ghost as any).lastDecisionTile;
      const isNewTile = currentTileKey !== lastTileKey;
      
      // Check if we can continue in current direction
      const canContinue = this.canGhostMove(ghostTileX, ghostTileY, ghost.direction);
      
      // Make decisions at tile centers when:
      // 1. We're at a new tile, OR
      // 2. We're blocked and need to change direction
      if (atTileCenter && (isNewTile || !canContinue)) {
        // Snap exactly to grid center
        ghost.sprite.x = tileCenterX;
        ghost.sprite.y = tileCenterY;
        
        // Mark that we've made a decision at this tile
        (ghost as any).lastDecisionTile = currentTileKey;
        
        // Count available directions at this exact tile
        const availableDirs = this.countAvailableDirections(ghostTileX, ghostTileY);
        
        // Choose new direction if:
        // - At intersection (3+ ways available)
        // - Current direction is blocked
        // - At a corner (2 ways but current direction blocked)
        if (availableDirs >= 3 || !canContinue) {
          const newDirection = this.chooseGhostDirection(ghost, ghostTileX, ghostTileY);
          ghost.direction = newDirection;
        }
      }
      
      // Emergency fallback: if still blocked after decision, find any valid direction
      if (!this.canGhostMove(ghostTileX, ghostTileY, ghost.direction)) {
        // Snap to center
        ghost.sprite.x = tileCenterX;
        ghost.sprite.y = tileCenterY;
        
        const validDir = this.findAnyValidDirection(ghostTileX, ghostTileY);
        if (validDir) {
          ghost.direction = validDir;
          (ghost as any).lastDecisionTile = null; // Reset to allow new decision
        } else {
          // Truly stuck - stop movement
          ghost.sprite.setVelocity(0, 0);
          return;
        }
      }
      
      // Move in the current direction with grid alignment
      switch (ghost.direction) {
        case 'left':
          ghost.sprite.setVelocity(-speed, 0);
          ghost.sprite.y = Phaser.Math.Linear(ghost.sprite.y, tileCenterY, 0.3);
          break;
        case 'right':
          ghost.sprite.setVelocity(speed, 0);
          ghost.sprite.y = Phaser.Math.Linear(ghost.sprite.y, tileCenterY, 0.3);
          break;
        case 'up':
          ghost.sprite.setVelocity(0, -speed);
          ghost.sprite.x = Phaser.Math.Linear(ghost.sprite.x, tileCenterX, 0.3);
          break;
        case 'down':
          ghost.sprite.setVelocity(0, speed);
          ghost.sprite.x = Phaser.Math.Linear(ghost.sprite.x, tileCenterX, 0.3);
          break;
      }
    });
  }
  
  private findAnyValidDirection(tileX: number, tileY: number): Direction | null {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    for (const dir of directions) {
      if (this.canGhostMove(tileX, tileY, dir)) {
        return dir;
      }
    }
    return null;
  }
  
  private countAvailableDirections(tileX: number, tileY: number): number {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    let count = 0;
    for (const dir of directions) {
      if (this.canGhostMove(tileX, tileY, dir)) {
        count++;
      }
    }
    return count;
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
  
  private chooseGhostDirection(ghost: GhostState, tileX: number, tileY: number): Direction {
    const playerTileX = Math.floor(this.player.x / this.TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / this.TILE_SIZE);
    
    let targetX: number;
    let targetY: number;
    
    // Determine target based on mode and ghost personality
    if (ghost.mode === 'chase') {
      // Each ghost has unique targeting behavior (like classic Pac-Man)
      switch (ghost.color) {
        case 'red': // Blinky - directly targets player
          targetX = playerTileX;
          targetY = playerTileY;
          break;
        case 'pink': // Pinky - targets 4 tiles ahead of player
          targetX = playerTileX;
          targetY = playerTileY;
          if (this.currentDirection === 'up') targetY -= 4;
          else if (this.currentDirection === 'down') targetY += 4;
          else if (this.currentDirection === 'left') targetX -= 4;
          else if (this.currentDirection === 'right') targetX += 4;
          break;
        case 'cyan': // Inky - complex targeting (uses Blinky's position)
          // Target is 2 tiles ahead of player, then doubled from Blinky
          const redGhost = this.ghosts.find(g => g.color === 'red');
          const aheadX = playerTileX + (this.currentDirection === 'right' ? 2 : this.currentDirection === 'left' ? -2 : 0);
          const aheadY = playerTileY + (this.currentDirection === 'down' ? 2 : this.currentDirection === 'up' ? -2 : 0);
          if (redGhost?.sprite) {
            const redTileX = Math.floor(redGhost.sprite.x / this.TILE_SIZE);
            const redTileY = Math.floor(redGhost.sprite.y / this.TILE_SIZE);
            targetX = aheadX + (aheadX - redTileX);
            targetY = aheadY + (aheadY - redTileY);
          } else {
            targetX = playerTileX;
            targetY = playerTileY;
          }
          break;
        case 'orange': // Clyde - targets player when far, scatters when close
          const distToPlayer = Math.sqrt(
            Math.pow(tileX - playerTileX, 2) + Math.pow(tileY - playerTileY, 2)
          );
          if (distToPlayer > 8) {
            // Far from player - chase
            targetX = playerTileX;
            targetY = playerTileY;
          } else {
            // Close to player - scatter to corner
            targetX = ghost.scatterTarget.x;
            targetY = ghost.scatterTarget.y;
          }
          break;
        default:
          targetX = playerTileX;
          targetY = playerTileY;
      }
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
    
    // Clamp target to maze bounds
    targetX = Math.max(0, Math.min(this.currentMaze.width - 1, targetX));
    targetY = Math.max(0, Math.min(this.currentMaze.height - 1, targetY));
    
    // Find best direction toward target (prefer not backtracking)
    const oppositeDirection = this.getOppositeDirection(ghost.direction);
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    
    // First try directions that aren't backtracking
    let availableDirections = directions.filter(
      dir => dir !== oppositeDirection && this.canGhostMove(tileX, tileY, dir)
    );
    
    // If no forward options, allow backtracking
    if (availableDirections.length === 0) {
      availableDirections = directions.filter(
        dir => this.canGhostMove(tileX, tileY, dir)
      );
    }
    
    // If still no options, keep current direction
    if (availableDirections.length === 0) {
      return ghost.direction;
    }
    
    // Choose direction that minimizes distance to target
    let bestDirection: Direction = availableDirections[0];
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
    // Temporarily pause the game during death sequence
    this.gameState.gameStatus = 'paused';
    
    // Play death sound
    if (this.deathSound) {
      this.deathSound.play();
    }
    
    // Stop movement sound
    this.isMoving = false;
    
    // Stop all movement
    this.player?.setVelocity(0, 0);
    this.ghosts.forEach(ghost => ghost.sprite?.setVelocity(0, 0));
    
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
      // Reset positions after death animation and resume game
      this.time.delayedCall(1500, () => {
        this.resetPositions();
        this.gameState.gameStatus = 'playing';
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
  
  public restartGame(): void {
    // Reset game state
    this.gameState = {
      score: 0,
      lives: 3,
      level: 1,
      powerMode: false,
      powerModeTimer: 0,
      gameStatus: 'playing',
    };
    
    // Clear current maze and regenerate
    this.clearMaze();
    this.generateAndRenderMaze();
    
    // Reset movement state
    this.currentDirection = null;
    this.nextDirection = null;
    this.isMoving = false;
    
    // Emit restart event
    this.events.emit('gameRestarted');
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
  
  public disableKeyboardInput(): void {
    // Disable keyboard input capture so React can handle it
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
    }
  }
  
  public enableKeyboardInput(): void {
    // Re-enable keyboard input for the game
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
    }
  }
}

export { GameScene };

export default GameScene;
