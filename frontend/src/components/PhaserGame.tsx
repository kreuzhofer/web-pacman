import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ onGameReady }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Phaser game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 448, // 28 tiles * 16 pixels
      height: 496, // 31 tiles * 16 pixels
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
          gravity: { x: 0, y: 0 }, // No gravity for top-down game
        },
      },
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      backgroundColor: '#000000',
      pixelArt: true, // Ensure crisp pixel art rendering
    };

    // Create game instance
    gameRef.current = new Phaser.Game(config);

    // Notify parent component when game is ready
    if (onGameReady) {
      onGameReady(gameRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onGameReady]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  );
};

export default PhaserGame;
