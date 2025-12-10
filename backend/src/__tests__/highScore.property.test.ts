import * as fc from 'fast-check';
import prisma from '../db';
import { submitScore } from '../highScoreController';
import { Request, Response } from 'express';

/**
 * Feature: pacman-game, Property 7: High Score Persistence Round Trip
 * Validates: Requirements 6.2, 6.3
 * 
 * For any valid score submission (3-letter acronym and positive score),
 * submitting the score should result in it being retrievable from the database
 * with the same acronym and score value.
 */

describe('High Score Persistence Property Tests', () => {
  // Clean up test data after all tests
  const testIds: string[] = [];

  afterAll(async () => {
    // Clean up only test-created records
    if (testIds.length > 0) {
      await prisma.highScore.deleteMany({
        where: {
          id: {
            in: testIds,
          },
        },
      });
    }
    await prisma.$disconnect();
  });

  test('Property 7: High Score Persistence Round Trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Z]{3}$/), // 3 uppercase letters
        fc.integer({ min: 1, max: 1000000 }), // positive score
        async (acronym, score) => {
          // Create mock request and response objects
          const req = {
            body: {
              acronym,
              score,
            },
          } as Request;

          let responseData: any = null;
          let statusCode = 200;

          const res = {
            status: (code: number) => {
              statusCode = code;
              return res;
            },
            json: (data: any) => {
              responseData = data;
              return res;
            },
          } as unknown as Response;

          // Submit the score
          await submitScore(req, res);

          // Verify submission was successful
          expect(statusCode).toBe(201);
          expect(responseData.success).toBe(true);
          expect(responseData.data).toBeDefined();
          expect(responseData.data.acronym).toBe(acronym);
          expect(responseData.data.score).toBe(score);

          // Track the ID for cleanup
          const submittedId = responseData.data.id;
          if (submittedId) {
            testIds.push(submittedId);
          }

          // Verify persistence by directly querying the database
          const persistedScore = await prisma.highScore.findUnique({
            where: {
              id: submittedId,
            },
          });

          // Verify the score was persisted correctly
          expect(persistedScore).toBeDefined();
          expect(persistedScore?.acronym).toBe(acronym);
          expect(persistedScore?.score).toBe(score);
        }
      ),
      { numRuns: 100 }
    );
  });
});
