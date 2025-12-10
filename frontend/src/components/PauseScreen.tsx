import React from 'react';
import './PauseScreen.css';

interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
}

const PauseScreen: React.FC<PauseScreenProps> = ({ onResume, onRestart }) => {
  return (
    <div className="pause-screen-overlay">
      <div className="pause-screen-modal">
        <h1 className="pause-title">PAUSED</h1>
        
        <div className="pause-buttons">
          <button onClick={onResume} className="pause-button resume-button">
            RESUME
          </button>
          <button onClick={onRestart} className="pause-button restart-button">
            RESTART
          </button>
        </div>
        
        <div className="pause-hint">
          <p>Press SPACE to resume</p>
        </div>
      </div>
    </div>
  );
};

export default PauseScreen;
