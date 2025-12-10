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
