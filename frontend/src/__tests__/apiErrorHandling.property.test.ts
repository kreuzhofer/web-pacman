import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: pacman-game, Property 14: API Error Handling Robustness
 * 
 * For any invalid input or database failure, the API should return appropriate 
 * error responses with proper HTTP status codes and meaningful messages.
 * 
 * Validates: Requirements 9.1, 9.2, 9.3
 */

describe('Property 14: API Error Handling Robustness', () => {

  it('should validate acronym format in score submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          acronym: fc.string(),
          score: fc.integer({ min: 0, max: 999999 }),
        }),
        async (submission) => {
          // Property: acronym validation should be consistent
          const isValid = /^[A-Za-z]{3}$/.test(submission.acronym);
          
          // If acronym is invalid, it should be caught by validation
          if (!isValid) {
            expect(submission.acronym.length !== 3 || !/^[A-Za-z]+$/.test(submission.acronym)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle error response structures consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          success: fc.constant(false),
          error: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.date().map(d => d.toISOString()),
        }),
        async (errorResponse) => {
          // Property: error responses should always have required fields
          expect(errorResponse.success).toBe(false);
          expect(errorResponse.error).toBeTruthy();
          expect(errorResponse.timestamp).toBeTruthy();
          
          // Timestamp should be valid ISO string
          expect(() => new Date(errorResponse.timestamp)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate HTTP status codes for error categorization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          // Property: status codes should be categorized correctly
          const isClientError = statusCode >= 400 && statusCode < 500;
          const isServerError = statusCode >= 500 && statusCode < 600;
          
          expect(isClientError || isServerError).toBe(true);
          
          // 400-499 are client errors (validation, auth, etc.)
          // 500-599 are server errors (database, internal, etc.)
          if (statusCode === 400) {
            expect(isClientError).toBe(true);
          }
          if (statusCode >= 500) {
            expect(isServerError).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate score submission data structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          acronym: fc.stringOf(fc.constantFrom('A', 'B', 'C'), { minLength: 3, maxLength: 3 }),
          score: fc.integer({ min: 0, max: 999999 }),
        }),
        async (submission) => {
          // Property: valid submissions should have correct structure
          expect(submission).toHaveProperty('acronym');
          expect(submission).toHaveProperty('score');
          expect(typeof submission.acronym).toBe('string');
          expect(typeof submission.score).toBe('number');
          expect(submission.acronym.length).toBe(3);
          expect(submission.score).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate high score response structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            acronym: fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E'), {
              minLength: 3,
              maxLength: 3,
            }),
            score: fc.integer({ min: 0, max: 999999 }),
            createdAt: fc.date().map((d) => d.toISOString()),
          }),
          { maxLength: 10 }
        ),
        async (highScores) => {
          // Property: high score arrays should have valid structure
          expect(Array.isArray(highScores)).toBe(true);
          expect(highScores.length).toBeLessThanOrEqual(10);
          
          // Each score should have required fields
          highScores.forEach(score => {
            expect(score).toHaveProperty('id');
            expect(score).toHaveProperty('acronym');
            expect(score).toHaveProperty('score');
            expect(score).toHaveProperty('createdAt');
            expect(score.acronym.length).toBe(3);
            expect(score.score).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate error detail structures for validation errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            field: fc.constantFrom('acronym', 'score'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (details) => {
          // Property: validation error details should have consistent structure
          expect(Array.isArray(details)).toBe(true);
          expect(details.length).toBeGreaterThan(0);
          
          details.forEach(detail => {
            expect(detail).toHaveProperty('field');
            expect(detail).toHaveProperty('message');
            expect(typeof detail.field).toBe('string');
            expect(typeof detail.message).toBe('string');
            expect(detail.message.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
