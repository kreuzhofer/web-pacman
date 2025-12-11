import React, { useState } from 'react';
import './GameOver.css';
import { apiClient } from '../services/apiClient';

interface GameOverProps {
  score: number;
  onScoreSubmitted?: () => void;
  onRestart?: () => void;
  onReturnToStart?: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, onScoreSubmitted, onRestart, onReturnToStart }) => {
  const [acronym, setAcronym] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validateAcronym = (value: string): boolean => {
    // Must be exactly 3 characters
    if (value.length !== 3) {
      setError('Must be 3 letters');
      return false;
    }
    
    // Must be alphabetic only
    if (!/^[A-Za-z]{3}$/.test(value)) {
      setError('Letters only');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 3);
    setAcronym(value);
    
    if (value.length > 0) {
      validateAcronym(value);
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateAcronym(acronym)) {
      setSubmitting(true);
      setError('');
      
      try {
        await apiClient.submitScore({
          acronym: acronym.toUpperCase(),
          score: score,
        });
        
        setSubmitted(true);
        
        // Notify parent component that score was submitted
        if (onScoreSubmitted) {
          onScoreSubmitted();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit score';
        setError(errorMessage);
        console.error('Error submitting score:', err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h1 className="game-over-title">GAME OVER</h1>
        
        <div className="final-score">
          <span className="score-label">FINAL SCORE</span>
          <span className="score-value">{score.toString().padStart(6, '0')}</span>
        </div>
        
        {!submitted ? (
          <form onSubmit={handleSubmit} className="acronym-form">
            <label htmlFor="acronym" className="form-label">
              ENTER YOUR INITIALS
            </label>
            <input
              id="acronym"
              type="text"
              value={acronym}
              onChange={handleInputChange}
              maxLength={3}
              className="acronym-input"
              placeholder="AAA"
              autoFocus
              autoComplete="off"
            />
            {error && <span className="error-message">{error}</span>}
            <button
              type="submit"
              className="submit-button"
              disabled={acronym.length !== 3 || error !== '' || submitting}
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
            
            <div className="button-row">
              {onRestart && (
                <button type="button" onClick={onRestart} className="action-button play-again-button">
                  PLAY AGAIN
                </button>
              )}
              {onReturnToStart && (
                <button type="button" onClick={onReturnToStart} className="action-button return-button">
                  MAIN MENU
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="submitted-message">
            <p>SCORE SAVED!</p>
            <div className="button-row">
              {onRestart && (
                <button onClick={onRestart} className="action-button play-again-button">
                  PLAY AGAIN
                </button>
              )}
              {onReturnToStart && (
                <button onClick={onReturnToStart} className="action-button return-button">
                  MAIN MENU
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameOver;
