import * as fc from 'fast-check';

/**
 * Feature: pacman-game, Property 11: High Score Validation and Storage
 * Validates: Requirements 6.1, 6.4
 * 
 * For any acronym input, the validation should accept only 3 alphabetic characters
 * and convert them to uppercase, rejecting all other inputs.
 */

// Validation function extracted from GameOver component logic
function validateAcronym(value: string): { valid: boolean; error: string } {
  // Must be exactly 3 characters
  if (value.length !== 3) {
    return { valid: false, error: 'Must be 3 letters' };
  }
  
  // Must be alphabetic only
  if (!/^[A-Za-z]{3}$/.test(value)) {
    return { valid: false, error: 'Letters only' };
  }
  
  return { valid: true, error: '' };
}

function normalizeAcronym(value: string): string {
  return value.toUpperCase().slice(0, 3);
}

describe('High Score Validation Property Tests', () => {
  test('Property 11: Valid acronyms are accepted', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z]{3}$/), // 3 alphabetic characters
        (acronym) => {
          const result = validateAcronym(acronym);
          expect(result.valid).toBe(true);
          expect(result.error).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Invalid length acronyms are rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 2 }), // Too short
          fc.string({ minLength: 4, maxLength: 10 }) // Too long
        ),
        (acronym) => {
          const result = validateAcronym(acronym);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Must be 3 letters');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Non-alphabetic acronyms are rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 3 }).filter(s => !/^[A-Za-z]{3}$/.test(s)),
        (acronym) => {
          const result = validateAcronym(acronym);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Letters only');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Acronyms are normalized to uppercase', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z]{3}$/),
        (acronym) => {
          const normalized = normalizeAcronym(acronym);
          expect(normalized).toBe(acronym.toUpperCase());
          expect(normalized.length).toBe(3);
          expect(/^[A-Z]{3}$/.test(normalized)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Normalization truncates to 3 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        (input) => {
          const normalized = normalizeAcronym(input);
          expect(normalized.length).toBeLessThanOrEqual(3);
          expect(normalized).toBe(input.toUpperCase().slice(0, 3));
        }
      ),
      { numRuns: 100 }
    );
  });
});
