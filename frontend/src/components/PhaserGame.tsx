import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import GameScene, { GameState } from '../scenes/GameScene';
import GameUI from './GameUI';
import GameOver from './GameOver';
import HighScoreTable from './HighScoreTable';

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ onGameReady }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    level: 1,
    powerMode: false,
    powerModeTimer: 0,
    gameStatus: 'playing',
  });
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const handleSubmitScore = useCallback(async (acronym: string) => {
    try {
      const response = await fetch('/api/highscores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acronym,
          score: finalScore,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit score');
      }

      // Show high scores after successful submission
      setTimeout(() => {
        setShowGameOver(false);
        setShowHighScores(true);
      }, 1000);
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  }, [finalScore]);

  const handleRestart = useCallback(() => {
    setShowGameOver(false);
    setShowHighScores(false);
    
    // Restart the game
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
      if (scene) {
        scene.scene.restart();
      }
    }
  }, []);

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

    // Set up event listeners for game state updates
    const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
    
    if (scene) {
      // Update game state periodically
      const updateInterval = setInterval(() => {
        if (scene && scene.scene.isActive()) {
          const currentState = scene.getGameState();
          setGameState(currentState);
        }
      }, 100);

      // Listen for game over event
      scene.events.on('gameOver', (score: number) => {
        setFinalScore(score);
        setShowGameOver(true);
      });

      // Cleanup interval on unmount
      return () => {
        clearInterval(updateInterval);
      };
    }

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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
      
      {/* Game UI Overlay */}
      <GameUI gameState={gameState} />
      
      {/* Game Over Screen */}
      {showGameOver && (
        <GameOver
          score={finalScore}
          onSubmitScore={handleSubmitScore}
          onRestart={handleRestart}
        />
      )}
      
      {/* High Score Table */}
      {showHighScores && (
        <HighScoreTable onClose={() => setShowHighScores(false)} />
      )}
    </div>
  );
};

export default PhaserGame;
