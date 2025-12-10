import { z } from 'zod';

export const scoreSubmissionSchema = z.object({
  acronym: z
    .string()
    .length(3, 'Acronym must be exactly 3 characters')
    .regex(/^[A-Za-z]{3}$/, 'Acronym must contain only alphabetic characters')
    .transform((val) => val.toUpperCase()),
  score: z.number().int().positive('Score must be a positive integer'),
});

export type ScoreSubmission = z.infer<typeof scoreSubmissionSchema>;
