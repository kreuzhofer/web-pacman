// Core game types

export interface Position {
  x: number;
  y: number;
}

export interface TunnelPair {
  entrance: Position;
  exit: Position;
}

export interface MazeData {
  width: number;
  height: number;
  walls: boolean[][];
  dots: boolean[][];
  powerPellets: Position[];
  tunnels: TunnelPair[];
  ghostSpawn: Position;
  playerSpawn: Position;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GhostColor = 'red' | 'pink' | 'cyan' | 'orange';
export type GhostMode = 'chase' | 'scatter' | 'frightened' | 'eaten';

export interface GhostState {
  id: string;
  sprite: Phaser.Physics.Arcade.Sprite | null;
  color: GhostColor;
  mode: GhostMode;
  direction: Direction;
  speed: number;
  scatterTarget: Position;
}
