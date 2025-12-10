import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import GameScene, { GameState } from '../scenes/GameScene';
import GameUI from './GameUI';
import GameOver from './GameOver';
import HighScoreTable from './HighScoreTable';
import StartScreen from './StartScreen';
import PauseScreen from './PauseScreen';

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
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showPauseScreen, setShowPauseScreen] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

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

  const handleStart = useCallback(() => {
    setShowStartScreen(false);
    setGameStarted(true);
    
    // Start the game if it was paused initially
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
      if (scene && scene.scene.isActive()) {
        scene.resumeGame();
      }
    }
  }, []);

  const handleResume = useCallback(() => {
    setShowPauseScreen(false);
    
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
      if (scene) {
        scene.resumeGame();
      }
    }
  }, []);

  const handleRestart = useCallback(() => {
    setShowGameOver(false);
    setShowHighScores(false);
    setShowPauseScreen(false);
    setShowStartScreen(true);
    setGameStarted(false);
    
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
      // Pause the game initially until start screen is dismissed
      scene.pauseGame();
      
      // Update game state periodically
      const updateInterval = setInterval(() => {
        if (scene && scene.scene.isActive()) {
          const currentState = scene.getGameState();
          setGameState(currentState);
          
          // Update pause screen visibility based on game state
          if (currentState.gameStatus === 'paused' && gameStarted && !showGameOver) {
            setShowPauseScreen(true);
          } else if (currentState.gameStatus === 'playing') {
            setShowPauseScreen(false);
          }
        }
      }, 100);

      // Listen for game over event
      scene.events.on('gameOver', (score: number) => {
        setFinalScore(score);
        setShowGameOver(true);
      });
      
      // Listen for pause event
      scene.events.on('gamePaused', () => {
        if (gameStarted && !showGameOver) {
          setShowPauseScreen(true);
        }
      });
      
      // Listen for resume event
      scene.events.on('gameResumed', () => {
        setShowPauseScreen(false);
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
  }, [onGameReady, gameStarted, showGameOver]);

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
      
      {/* Start Screen */}
      {showStartScreen && <StartScreen onStart={handleStart} />}
      
      {/* Game UI Overlay */}
      {!showStartScreen && <GameUI gameState={gameState} />}
      
      {/* Pause Screen */}
      {showPauseScreen && !showGameOver && (
        <PauseScreen onResume={handleResume} onRestart={handleRestart} />
      )}
      
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
