import Phaser from 'phaser';
import { SpriteAssets } from '../assets/SpriteAssets';

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

    // Set up arcade physics
    this.physics.world.setBounds(0, 0, 448, 496);

    // Create animations
    this.createAnimations();

    // Set up input handlers
    this.setupInput();

    // Display basic game info (temporary)
    this.add
      .text(224, 248, 'Pacman Game Scene', {
        fontSize: '24px',
        color: '#ffff00',
      })
      .setOrigin(0.5);
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
}

export { GameScene };

export default GameScene;
