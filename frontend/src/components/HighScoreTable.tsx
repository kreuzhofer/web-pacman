import React, { useEffect, useState } from 'react';
import './HighScoreTable.css';

interface HighScore {
  id: string;
  acronym: string;
  score: number;
  createdAt: string;
  rank?: number;
}

interface HighScoreTableProps {
  onClose?: () => void;
}

const HighScoreTable: React.FC<HighScoreTableProps> = ({ onClose }) => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHighScores();
  }, []);

  const fetchHighScores = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/highscores');
      
      if (!response.ok) {
        throw new Error('Failed to fetch high scores');
      }
      
      const data = await response.json();
      setHighScores(data);
    } catch (err) {
      setError('Unable to load high scores');
      console.error('Error fetching high scores:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="highscore-overlay">
      <div className="highscore-modal">
        <h2 className="highscore-title">HIGH SCORES</h2>
        
        {loading && (
          <div className="loading-message">LOADING...</div>
        )}
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {!loading && !error && (
          <div className="highscore-table">
            <div className="table-header">
              <span className="rank-col">RANK</span>
              <span className="name-col">NAME</span>
              <span className="score-col">SCORE</span>
            </div>
            
            {highScores.length === 0 ? (
              <div className="no-scores">NO SCORES YET</div>
            ) : (
              <div className="table-body">
                {highScores.map((score, index) => (
                  <div key={score.id} className="table-row">
                    <span className="rank-col">{index + 1}</span>
                    <span className="name-col">{score.acronym}</span>
                    <span className="score-col">{score.score.toString().padStart(6, '0')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {onClose && (
          <button onClick={onClose} className="close-button">
            CLOSE
          </button>
        )}
      </div>
    </div>
  );
};

export default HighScoreTable;
