import axios, { AxiosError, AxiosInstance } from 'axios';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
  timestamp: string;
}

export interface HighScore {
  id: string;
  acronym: string;
  score: number;
  createdAt: string;
}

export interface ScoreSubmission {
  acronym: string;
  score: number;
}

// API Client configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(RETRY_DELAY);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable (network errors, 5xx errors)
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // Retry on network errors or 5xx server errors
      return (
        !axiosError.response ||
        (axiosError.response.status >= 500 && axiosError.response.status < 600)
      );
    }
    return false;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get top 10 high scores
   */
  async getHighScores(): Promise<HighScore[]> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get<ApiResponse<HighScore[]>>('/api/highscores');
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch high scores');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse<never>>;
        const errorMessage =
          axiosError.response?.data?.error || 'Network error: Unable to fetch high scores';
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * Submit a new high score
   */
  async submitScore(submission: ScoreSubmission): Promise<HighScore> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.post<ApiResponse<HighScore>>('/api/highscores', submission);
      });

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to submit score');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse<never>>;
        
        // Handle validation errors (400)
        if (axiosError.response?.status === 400) {
          const details = axiosError.response.data?.details;
          if (details && details.length > 0) {
            throw new Error(`Validation error: ${details[0].message}`);
          }
        }
        
        const errorMessage =
          axiosError.response?.data?.error || 'Network error: Unable to submit score';
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
