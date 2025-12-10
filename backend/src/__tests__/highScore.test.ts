import request from 'supertest';
import app from '../index';
import prisma from '../db';

// Set test environment
process.env.NODE_ENV = 'test';

describe('High Score API Endpoints', () => {
  const testIds: string[] = [];

  beforeAll(async () => {
    // Connect to database for tests
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
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

  describe('GET /api/highscores', () => {
    it('should return sorted high scores', async () => {
      // Create test scores
      const scores = await Promise.all([
        prisma.highScore.create({
          data: { acronym: 'AAA', score: 100 },
        }),
        prisma.highScore.create({
          data: { acronym: 'BBB', score: 500 },
        }),
        prisma.highScore.create({
          data: { acronym: 'CCC', score: 300 },
        }),
      ]);

      testIds.push(...scores.map((s) => s.id));

      const response = await request(app).get('/api/highscores');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify scores are sorted in descending order
      const returnedScores = response.body.data;
      for (let i = 0; i < returnedScores.length - 1; i++) {
        expect(returnedScores[i].score).toBeGreaterThanOrEqual(
          returnedScores[i + 1].score
        );
      }
    });

    it('should return at most 10 scores', async () => {
      const response = await request(app).get('/api/highscores');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('POST /api/highscores', () => {
    it('should accept valid score submission', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'XYZ', score: 1000 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.acronym).toBe('XYZ');
      expect(response.body.data.score).toBe(1000);
      expect(response.body.data.id).toBeDefined();

      testIds.push(response.body.data.id);
    });

    it('should convert lowercase acronym to uppercase', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'abc', score: 500 });

      expect(response.status).toBe(201);
      expect(response.body.data.acronym).toBe('ABC');

      testIds.push(response.body.data.id);
    });

    it('should reject acronym with non-alphabetic characters', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'A1B', score: 500 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject acronym with wrong length', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'AB', score: 500 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject negative score', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'ABC', score: -100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject zero score', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'ABC', score: 0 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing acronym', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ score: 500 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing score', async () => {
      const response = await request(app)
        .post('/api/highscores')
        .send({ acronym: 'ABC' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
