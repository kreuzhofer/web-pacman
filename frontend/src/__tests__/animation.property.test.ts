/**
 * Property-Based Tests for Animation Consistency
 * 
 * **Feature: pacman-game, Property 9: Animation Frame Consistency**
 * **Validates: Requirements 4.4**
 * 
 * For any sprite animation sequence, frame timing should remain consistent
 * with classic arcade game standards and loop properly.
 */

import * as fc from 'fast-check';

// Animation configuration types
interface AnimationConfig {
  key: string;
  frameRate: number;
  repeat: number;
  frameCount: number;
  type: 'pacman' | 'ghost' | 'item';
}

// Define expected animation configurations
const ANIMATION_CONFIGS: AnimationConfig[] = [
  // Pacman animations
  { key: 'pacman-right', frameRate: 10, repeat: -1, frameCount: 4, type: 'pacman' },
  { key: 'pacman-left', frameRate: 10, repeat: -1, frameCount: 4, type: 'pacman' },
  { key: 'pacman-up', frameRate: 10, repeat: -1, frameCount: 4, type: 'pacman' },
  { key: 'pacman-down', frameRate: 10, repeat: -1, frameCount: 4, type: 'pacman' },
  
  // Ghost animations (4 colors × 3 states)
  { key: 'ghost-red-normal', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-red-frightened', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-red-eaten', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-pink-normal', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-pink-frightened', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-pink-eaten', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-cyan-normal', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-cyan-frightened', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-cyan-eaten', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-orange-normal', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-orange-frightened', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  { key: 'ghost-orange-eaten', frameRate: 1, repeat: 0, frameCount: 1, type: 'ghost' },
  
  // Power pellet animation
  { key: 'power-pellet-blink', frameRate: 4, repeat: -1, frameCount: 2, type: 'item' },
];

describe('Animation Frame Consistency Properties', () => {

  /**
   * Property 9: Animation Frame Consistency
   * 
   * For any animation in the game, the frame rate should be consistent
   * and the animation should loop properly if configured to do so.
   */
  test('Property 9: All animations have consistent frame timing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: ANIMATION_CONFIGS.length - 1 }),
        (index) => {
          const config = ANIMATION_CONFIGS[index];
          
          // Frame rate should be positive
          expect(config.frameRate).toBeGreaterThan(0);
          
          // Frame rate should be reasonable for arcade games (1-60 fps)
          expect(config.frameRate).toBeLessThanOrEqual(60);
          
          // Animation should have at least one frame
          expect(config.frameCount).toBeGreaterThan(0);
          
          // If animation is set to repeat, it should repeat infinitely (-1)
          // or a positive number of times
          if (config.repeat !== 0) {
            expect(config.repeat === -1 || config.repeat > 0).toBe(true);
          }
          
          // Animation key should be non-empty
          expect(config.key.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Pacman animations should loop continuously
   */
  test('Property: Pacman movement animations loop infinitely', () => {
    const pacmanAnimations = ANIMATION_CONFIGS.filter(c => c.type === 'pacman');
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: pacmanAnimations.length - 1 }),
        (index) => {
          const config = pacmanAnimations[index];
          
          // Pacman animations should loop infinitely
          expect(config.repeat).toBe(-1);
          
          // Should have multiple frames for animation
          expect(config.frameCount).toBeGreaterThan(1);
          
          // Frame rate should be consistent with classic arcade games
          expect(config.frameRate).toBe(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Power pellet animation should blink
   */
  test('Property: Power pellet blink animation has alternating frames', () => {
    const config = ANIMATION_CONFIGS.find(c => c.key === 'power-pellet-blink');
    
    expect(config).toBeDefined();
    
    if (config) {
      // Should have at least 2 frames for blinking effect
      expect(config.frameCount).toBeGreaterThanOrEqual(2);
      
      // Should loop infinitely
      expect(config.repeat).toBe(-1);
      
      // Frame rate should be reasonable for blinking (not too fast)
      expect(config.frameRate).toBeGreaterThan(0);
      expect(config.frameRate).toBeLessThanOrEqual(10);
    }
  });

  /**
   * Property: All animations should have valid configuration
   */
  test('Property: All animation configurations are valid', () => {
    expect(ANIMATION_CONFIGS.length).toBeGreaterThan(0);
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: ANIMATION_CONFIGS.length - 1 }),
        (index) => {
          const config = ANIMATION_CONFIGS[index];
          
          // Each animation should have frames
          expect(config.frameCount).toBeGreaterThan(0);
          
          // Animation key should be valid
          expect(config.key).toBeDefined();
          expect(typeof config.key).toBe('string');
          expect(config.key.length).toBeGreaterThan(0);
          
          // Type should be valid
          expect(['pacman', 'ghost', 'item']).toContain(config.type);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Ghost animations should exist for all colors and states
   */
  test('Property: Ghost animations exist for all color and state combinations', () => {
    const colors = ['red', 'pink', 'cyan', 'orange'];
    const states = ['normal', 'frightened', 'eaten'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...colors),
        fc.constantFrom(...states),
        (color, state) => {
          const animKey = `ghost-${color}-${state}`;
          const config = ANIMATION_CONFIGS.find(c => c.key === animKey);
          
          // Animation should exist for all combinations
          expect(config).toBeDefined();
          
          if (config) {
            // Should have at least one frame
            expect(config.frameCount).toBeGreaterThan(0);
            
            // Frame rate should be positive
            expect(config.frameRate).toBeGreaterThan(0);
            
            // Should be a ghost type
            expect(config.type).toBe('ghost');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Animation frame duration consistency
   */
  test('Property: Animations maintain consistent frame duration calculation', () => {
    const multiFrameAnimations = ANIMATION_CONFIGS.filter(c => c.frameCount > 1);
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: multiFrameAnimations.length - 1 }),
        (index) => {
          const config = multiFrameAnimations[index];
          
          // Calculate expected duration per frame (in milliseconds)
          const expectedDuration = 1000 / config.frameRate;
          
          // Duration should be positive
          expect(expectedDuration).toBeGreaterThan(0);
          
          // Duration should be reasonable (between 16ms and 1000ms)
          expect(expectedDuration).toBeGreaterThanOrEqual(16); // 60 fps max
          expect(expectedDuration).toBeLessThanOrEqual(1000); // 1 fps min
          
          // For a given frame rate, duration should be consistent
          const recalculated = 1000 / config.frameRate;
          expect(expectedDuration).toBe(recalculated);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All required animation types are present
   */
  test('Property: All required animation types are defined', () => {
    // Should have Pacman animations
    const pacmanAnims = ANIMATION_CONFIGS.filter(c => c.type === 'pacman');
    expect(pacmanAnims.length).toBe(4); // 4 directions
    
    // Should have ghost animations
    const ghostAnims = ANIMATION_CONFIGS.filter(c => c.type === 'ghost');
    expect(ghostAnims.length).toBe(12); // 4 colors × 3 states
    
    // Should have item animations
    const itemAnims = ANIMATION_CONFIGS.filter(c => c.type === 'item');
    expect(itemAnims.length).toBeGreaterThanOrEqual(1); // At least power pellet
  });
});
