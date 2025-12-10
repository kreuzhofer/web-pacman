import Phaser from 'phaser';

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
    // Placeholder for asset loading
    // Assets will be loaded in future tasks
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
}

export default GameScene;
