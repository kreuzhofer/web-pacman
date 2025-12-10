import * as fc from 'fast-check';
import prisma from '../db';
import { submitScore } from '../highScoreController';
import { Request, Response } from 'express';

/**
 * Feature: pacman-game, Property 15: Concurrent Request Safety
 * Validates: Requirements 9.5
 * 
 * For any set of concurrent score submissions, all submissions should be
 * persisted correctly without race conditions or lost updates, and each
 * submission should receive a unique ID.
 */

describe('Concurrent Request Safety Property Tests', () => {
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

  test('Property 15: Concurrent Request Safety', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            acronym: fc.stringMatching(/^[A-Z]{3}$/),
            score: fc.integer({ min: 1, max: 1000000 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (submissions) => {
          // Submit all scores concurrently
          const submissionPromises = submissions.map(async (submission) => {
            const req = {
              body: submission,
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

            await submitScore(req, res);

            return { statusCode, responseData, original: submission };
          });

          const results = await Promise.all(submissionPromises);

          // Verify all submissions were successful
          for (const result of results) {
            expect(result.statusCode).toBe(201);
            expect(result.responseData.success).toBe(true);
            expect(result.responseData.data).toBeDefined();
            expect(result.responseData.data.id).toBeDefined();
            
            // Track for cleanup
            testIds.push(result.responseData.data.id);
          }

          // Verify all IDs are unique
          const ids = results.map((r) => r.responseData.data.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);

          // Verify all scores were persisted correctly
          for (const result of results) {
            const persistedScore = await prisma.highScore.findUnique({
              where: {
                id: result.responseData.data.id,
              },
            });

            expect(persistedScore).toBeDefined();
            expect(persistedScore?.acronym).toBe(result.original.acronym);
            expect(persistedScore?.score).toBe(result.original.score);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
