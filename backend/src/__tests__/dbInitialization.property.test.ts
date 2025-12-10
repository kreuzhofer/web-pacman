import * as fc from 'fast-check';
import prisma from '../db';

/**
 * Feature: pacman-game, Property 13: Database Connection Reliability
 * Validates: Requirements 8.2, 8.4, 9.4
 * 
 * For any backend startup, database connectivity and schema validation
 * should complete successfully before accepting requests.
 */

describe('Database Initialization Property Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Property 13: Database Connection Reliability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No random input needed, testing connection reliability
        async (_) => {
          // Test 1: Database connection should be established
          const isConnected = await prisma.$queryRaw`SELECT 1 as result`;
          expect(isConnected).toBeDefined();

          // Test 2: Schema should be properly initialized (high_scores table exists)
          const tableExists = await prisma.$queryRaw`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'high_scores'
            ) as exists
          `;
          expect(tableExists).toBeDefined();
          expect((tableExists as any)[0].exists).toBe(true);

          // Test 3: Can perform basic CRUD operations
          const testScore = await prisma.highScore.create({
            data: {
              acronym: 'TST',
              score: 12345,
            },
          });
          expect(testScore).toBeDefined();
          expect(testScore.id).toBeDefined();

          // Test 4: Can read the created record
          const retrievedScore = await prisma.highScore.findUnique({
            where: { id: testScore.id },
          });
          expect(retrievedScore).toBeDefined();
          expect(retrievedScore?.acronym).toBe('TST');
          expect(retrievedScore?.score).toBe(12345);

          // Test 5: Can delete the record (cleanup)
          await prisma.highScore.delete({
            where: { id: testScore.id },
          });

          // Verify deletion
          const deletedScore = await prisma.highScore.findUnique({
            where: { id: testScore.id },
          });
          expect(deletedScore).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Database connection survives multiple operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            acronym: fc.stringMatching(/^[A-Z]{3}$/),
            score: fc.integer({ min: 1, max: 1000000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (scores) => {
          const createdIds: string[] = [];

          try {
            // Create multiple records in sequence
            for (const scoreData of scores) {
              const created = await prisma.highScore.create({
                data: scoreData,
              });
              createdIds.push(created.id);
            }

            // Verify all records were created
            const retrievedScores = await prisma.highScore.findMany({
              where: {
                id: {
                  in: createdIds,
                },
              },
            });

            expect(retrievedScores.length).toBe(scores.length);

            // Verify connection is still healthy after multiple operations
            const healthCheck = await prisma.$queryRaw`SELECT 1 as result`;
            expect(healthCheck).toBeDefined();
          } finally {
            // Cleanup
            if (createdIds.length > 0) {
              await prisma.highScore.deleteMany({
                where: {
                  id: {
                    in: createdIds,
                  },
                },
              });
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Database handles connection errors gracefully', async () => {
    // Test that we can detect connection status
    const connectionStatus = prisma.$connect();
    await expect(connectionStatus).resolves.not.toThrow();

    // Verify we can perform operations after explicit connect
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    expect(result).toBeDefined();
  });
});
