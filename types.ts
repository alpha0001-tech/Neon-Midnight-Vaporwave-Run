export enum GameState {
  MENU,
  PLAYING,
  LEVEL_COMPLETE,
  GAME_OVER,
  VICTORY
}

export enum EntityType {
  PLAYER,
  ENEMY_DRONE,
  ENEMY_GLITCH_WALKER,
  BOSS,
  PROJECTILE,
  POWERUP,
  PARTICLE,
  PLATFORM,
  SPIKE,
  PORTAL
}

export enum PlayerForm {
  NORMAL = 'NORMAL',
  FLIGHT = 'FLIGHT', // Wings, infinite jump/hover
  TANK = 'TANK', // High damage, slower
  INVINCIBLE = 'INVINCIBLE' // Rainbow, no damage
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity extends Rect {
  id: string;
  type: EntityType;
  vx: number;
  vy: number;
  color: string;
  hp: number;
  maxHp: number;
  markedForDeletion: boolean;
  facingRight: boolean;
  // Optional properties for specific entity types
  form?: PlayerForm;
  life?: number;
  onGround?: boolean;
}

export interface Particle extends Entity {
  life: number; // 0-1
  decay: number;
}

export interface Camera {
  x: number;
  y: number;
}