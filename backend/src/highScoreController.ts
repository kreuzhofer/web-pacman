import { Request, Response } from 'express';
import prisma from './db';
import { scoreSubmissionSchema } from './validation';
import { ZodError } from 'zod';

export const getHighScores = async (_req: Request, res: Response) => {
  try {
    const highScores = await prisma.highScore.findMany({
      orderBy: {
        score: 'desc',
      },
      take: 10,
      select: {
        id: true,
        acronym: true,
        score: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: highScores,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching high scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve high scores',
      timestamp: new Date().toISOString(),
    });
  }
};

export const submitScore = async (req: Request, res: Response) => {
  try {
    const validatedData = scoreSubmissionSchema.parse(req.body);

    const newScore = await prisma.highScore.create({
      data: {
        acronym: validatedData.acronym,
        score: validatedData.score,
      },
      select: {
        id: true,
        acronym: true,
        score: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: newScore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('Error submitting score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit score',
        timestamp: new Date().toISOString(),
      });
    }
  }
};
