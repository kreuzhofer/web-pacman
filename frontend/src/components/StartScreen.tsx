import React from 'react';
import './StartScreen.css';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="start-screen-overlay">
      <div className="start-screen-modal">
        <h1 className="game-title">PACMAN</h1>
        
        <div className="instructions">
          <h2>HOW TO PLAY</h2>
          <ul>
            <li>Use ARROW KEYS or WASD to move</li>
            <li>Collect all dots to advance</li>
            <li>Eat power pellets to chase ghosts</li>
            <li>Avoid ghosts or lose a life</li>
          </ul>
        </div>
        
        <button onClick={onStart} className="start-button">
          START GAME
        </button>
        
        <div className="controls-hint">
          <p>Press SPACE to pause during game</p>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
