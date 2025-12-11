import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import GameScene, { GameState } from '../scenes/GameScene';
import GameUI from './GameUI';
import GameOver from './GameOver';
import HighScoreTable from './HighScoreTable';
import StartScreen from './StartScreen';
import PauseScreen from './PauseScreen';
import { apiClient } from '../services/apiClient';

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
  const [refreshHighScores, setRefreshHighScores] = useState(false);

  const handleScoreSubmitted = useCallback(() => {
    // Trigger high scores refresh and show the table
    setRefreshHighScores(prev => !prev);
    
    setTimeout(() => {
      setShowGameOver(false);
      setShowHighScores(true);
    }, 1000);
  }, []);

  const handleStart = useCallback(async () => {
    setShowStartScreen(false);
    setGameStarted(true);
    
    // Preload high scores in the background
    try {
      await apiClient.getHighScores();
    } catch (error) {
      console.error('Failed to preload high scores:', error);
      // Continue with game start even if high scores fail to load
    }
    
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
    setGameStarted(true);
    
    // Restart the game immediately (don't go to start screen)
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
      if (scene) {
        scene.restartGame();
      }
    }
  }, []);

  const handleReturnToStart = useCallback(() => {
    setShowGameOver(false);
    setShowHighScores(false);
    setShowPauseScreen(false);
    setShowStartScreen(true);
    setGameStarted(false);
    
    // Reset the game scene
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
      if (scene) {
        scene.restartGame();
        scene.pauseGame();
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
    
    let updateInterval: ReturnType<typeof setInterval> | null = null;
    let sceneReadyCheckInterval: ReturnType<typeof setInterval> | null = null;

    // Poll for scene readiness since Phaser's ready event may fire before scene is created
    sceneReadyCheckInterval = setInterval(() => {
      const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
      
      if (scene && scene.scene.isActive()) {
        // Scene is ready, clear the check interval
        if (sceneReadyCheckInterval) {
          clearInterval(sceneReadyCheckInterval);
          sceneReadyCheckInterval = null;
        }
        
        // Pause the game initially until start screen is dismissed
        scene.pauseGame();
        
        // Update game state periodically
        updateInterval = setInterval(() => {
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
        
        // Listen for pause event
        scene.events.on('gamePaused', () => {
          // Only show pause screen if game has started and not game over
          const currentState = scene.getGameState();
          if (currentState.gameStatus !== 'gameOver') {
            setShowPauseScreen(true);
          }
        });
        
        // Listen for resume event
        scene.events.on('gameResumed', () => {
          setShowPauseScreen(false);
        });
        
        // Listen for restart event
        scene.events.on('gameRestarted', () => {
          setShowGameOver(false);
          setShowPauseScreen(false);
        });

        // Notify parent component when game is ready
        if (onGameReady && gameRef.current) {
          onGameReady(gameRef.current);
        }
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      if (sceneReadyCheckInterval) {
        clearInterval(sceneReadyCheckInterval);
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onGameReady]);

  // Check if any overlay is showing (where we shouldn't intercept keys)
  const isOverlayShowing = showStartScreen || showGameOver || showHighScores || showPauseScreen;
  
  // Disable/enable Phaser keyboard input based on overlay state
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
      if (scene) {
        if (isOverlayShowing) {
          scene.disableKeyboardInput();
        } else {
          scene.enableKeyboardInput();
        }
      }
    }
  }, [isOverlayShowing]);

  return (
    <div 
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onKeyDown={(e) => {
        // Only prevent default for game keys when actually playing (no overlays)
        if (!isOverlayShowing && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
          e.preventDefault();
        }
      }}
      tabIndex={0}
    >
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
      {showPauseScreen && !showGameOver && !showStartScreen && gameStarted && (
        <PauseScreen onResume={handleResume} onRestart={handleReturnToStart} />
      )}
      
      {/* Game Over Screen */}
      {showGameOver && (
        <GameOver
          score={finalScore}
          onScoreSubmitted={handleScoreSubmitted}
          onRestart={handleRestart}
          onReturnToStart={handleReturnToStart}
        />
      )}
      
      {/* High Score Table */}
      {showHighScores && (
        <HighScoreTable 
          onClose={() => {
            setShowHighScores(false);
            // Return to start screen after viewing high scores
            setShowStartScreen(true);
            setGameStarted(false);
            // Reset the game scene
            if (gameRef.current) {
              const scene = gameRef.current.scene.getScene('GameScene') as GameScene;
              if (scene) {
                scene.restartGame();
                scene.pauseGame();
              }
            }
          }} 
          refresh={refreshHighScores}
        />
      )}
    </div>
  );
};

export default PhaserGame;
