import React from 'react';
import { GameState } from '../scenes/GameScene';
import './GameUI.css';

interface GameUIProps {
  gameState: GameState;
}

const GameUI: React.FC<GameUIProps> = ({ gameState }) => {
  return (
    <div className="game-ui-overlay">
      <div className="game-ui-top">
        <div className="score-display">
          <span className="label">SCORE</span>
          <span className="value">{gameState.score.toString().padStart(6, '0')}</span>
        </div>
        
        <div className="level-display">
          <span className="label">LEVEL</span>
          <span className="value">{gameState.level}</span>
        </div>
      </div>
      
      <div className="lives-display">
        <span className="label">LIVES</span>
        <div className="lives-icons">
          {Array.from({ length: Math.max(0, gameState.lives) }).map((_, index) => (
            <div key={index} className="life-icon">
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path 
                  d="M8 1 A7 7 0 1 1 8 15 A7 7 0 1 1 8 1 M8 8 L15 4 L15 12 Z" 
                  fill="#FFFF00"
                />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameUI;
