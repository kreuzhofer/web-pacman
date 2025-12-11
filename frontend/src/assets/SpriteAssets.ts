/**
 * Sprite Asset Manager
 * 
 * This module provides sprite asset loading and generation for the Pacman game.
 * In production, these would be actual pixel art sprite sheets.
 * For development, we generate simple colored shapes as placeholders.
 */

export interface SpriteConfig {
  key: string;
  width: number;
  height: number;
  frames?: number;
}

export class SpriteAssets {
  /**
   * Generate a simple colored texture for development/testing
   */
  static generateTexture(
    scene: Phaser.Scene,
    key: string,
    width: number,
    height: number,
    color: number
  ): void {
    const graphics = scene.make.graphics({}, false);
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  /**
   * Generate Pacman sprite frames
   */
  static generatePacmanSprites(scene: Phaser.Scene): void {
    // Create 4 frames for Pacman animation (mouth opening/closing)
    const frameWidth = 16;
    const frameHeight = 16;
    const totalFrames = 4;

    const graphics = scene.make.graphics({}, false);
    
    // Draw all frames side by side (don't clear between frames)
    for (let i = 0; i < totalFrames; i++) {
      const offsetX = i * frameWidth;
      
      graphics.fillStyle(0xffff00, 1); // Yellow
      
      // Draw a circle (simplified Pacman)
      const centerX = offsetX + frameWidth / 2;
      const centerY = frameHeight / 2;
      const radius = 7;
      
      // Mouth opening varies by frame
      const mouthAngle = (i / totalFrames) * 0.5; // 0 to 0.5 radians
      
      graphics.fillCircle(centerX, centerY, radius);
      
      // Draw mouth (black triangle)
      if (i > 0) {
        graphics.fillStyle(0x000000, 1);
        graphics.beginPath();
        graphics.moveTo(centerX, centerY);
        graphics.lineTo(
          centerX + radius * Math.cos(mouthAngle),
          centerY - radius * Math.sin(mouthAngle)
        );
        graphics.lineTo(
          centerX + radius * Math.cos(-mouthAngle),
          centerY + radius * Math.sin(mouthAngle)
        );
        graphics.closePath();
        graphics.fillPath();
        graphics.fillStyle(0xffff00, 1); // Reset to yellow for next frame
      }
    }
    
    graphics.generateTexture('pacman', frameWidth * totalFrames, frameHeight);
    graphics.destroy();
  }

  /**
   * Generate ghost sprites with different colors and states
   */
  static generateGhostSprites(scene: Phaser.Scene): void {
    const frameWidth = 16;
    const frameHeight = 16;
    const colors = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852]; // Red, Pink, Cyan, Orange
    const totalFrames = colors.length * 3; // normal, frightened, eaten for each color

    const graphics = scene.make.graphics({}, false);
    
    // Draw all frames side by side (don't clear between frames)
    for (let i = 0; i < totalFrames; i++) {
      const offsetX = i * frameWidth;
      
      const colorIndex = Math.floor(i / 3);
      const state = i % 3; // 0: normal, 1: frightened, 2: eaten
      
      if (state === 0) {
        // Normal ghost
        graphics.fillStyle(colors[colorIndex], 1);
      } else if (state === 1) {
        // Frightened ghost (blue)
        graphics.fillStyle(0x2121ff, 1);
      } else {
        // Eaten ghost (eyes only - white)
        graphics.fillStyle(0xffffff, 1);
      }
      
      // Draw simplified ghost shape
      graphics.fillRect(offsetX + 2, 4, 12, 12);
      
      // Draw eyes (white dots for normal/frightened, larger for eaten)
      if (state !== 2) {
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(offsetX + 6, 8, 2);
        graphics.fillCircle(offsetX + 10, 8, 2);
      }
    }
    
    graphics.generateTexture('ghosts', frameWidth * totalFrames, frameHeight);
    graphics.destroy();
  }

  /**
   * Generate maze tile sprites
   */
  static generateMazeTiles(scene: Phaser.Scene): void {
    const tileSize = 16;
    const graphics = scene.make.graphics({}, false);
    
    // Wall tile (blue)
    graphics.fillStyle(0x2121de, 1);
    graphics.fillRect(0, 0, tileSize, tileSize);
    graphics.strokeRect(0, 0, tileSize, tileSize);
    
    graphics.generateTexture('maze-tiles', tileSize, tileSize);
    graphics.destroy();
  }

  /**
   * Generate item sprites (dots and power pellets)
   */
  static generateItemSprites(scene: Phaser.Scene): void {
    const frameWidth = 16;
    const frameHeight = 16;
    
    const graphics = scene.make.graphics({}, false);
    
    // Dot (small white circle)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(frameWidth / 2, frameHeight / 2, 2);
    
    // Power pellet (larger white circle) - frame 1
    graphics.fillCircle(frameWidth + frameWidth / 2, frameHeight / 2, 4);
    
    graphics.generateTexture('items', frameWidth * 2, frameHeight);
    graphics.destroy();
  }

  /**
   * Load all sprite assets
   */
  static loadAllSprites(scene: Phaser.Scene): void {
    // Generate all sprite textures
    this.generatePacmanSprites(scene);
    this.generateGhostSprites(scene);
    this.generateMazeTiles(scene);
    this.generateItemSprites(scene);
    
    // Add frame data to sprite sheets
    this.addSpriteSheetFrames(scene);
  }
  
  /**
   * Add frame data to generated sprite sheets so Phaser knows how to slice them
   */
  static addSpriteSheetFrames(scene: Phaser.Scene): void {
    const textureManager = scene.textures;
    
    // Add frames to pacman sprite sheet (4 frames, 16x16 each)
    const pacmanTexture = textureManager.get('pacman');
    if (pacmanTexture) {
      for (let i = 0; i < 4; i++) {
        pacmanTexture.add(i, 0, i * 16, 0, 16, 16);
      }
    }
    
    // Add frames to ghosts sprite sheet (12 frames, 16x16 each)
    const ghostsTexture = textureManager.get('ghosts');
    if (ghostsTexture) {
      for (let i = 0; i < 12; i++) {
        ghostsTexture.add(i, 0, i * 16, 0, 16, 16);
      }
    }
    
    // Add frames to items sprite sheet (2 frames, 16x16 each)
    const itemsTexture = textureManager.get('items');
    if (itemsTexture) {
      for (let i = 0; i < 2; i++) {
        itemsTexture.add(i, 0, i * 16, 0, 16, 16);
      }
    }
  }
}
