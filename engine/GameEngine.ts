import { Entity, EntityType, GameState, PlayerForm, Particle, Rect } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, FRICTION, MOVE_SPEED, JUMP_FORCE, TILE_SIZE, BOSS_LEVEL_INTERVAL, COLORS, InputKeys } from '../constants';

export class GameEngine {
  public entities: Entity[] = [];
  public particles: Particle[] = [];
  public player: Entity;
  public camera = { x: 0, y: 0 };
  public level = 1;
  public score = 0;
  public gameState: GameState = GameState.MENU;
  
  // Input State
  private keys: { [key: string]: boolean } = {};
  
  // Boss State
  private bossRef: Entity | null = null;
  private bossPhase = 0;
  private bossTimer = 0;

  constructor() {
    this.resetLevel(1);
    // Placeholder player init, overwritten in resetLevel
    this.player = this.createPlayer(100, 100); 
  }

  createPlayer(x: number, y: number): Entity {
    return {
      id: 'player',
      type: EntityType.PLAYER,
      x, y, w: 30, h: 48,
      vx: 0, vy: 0,
      color: COLORS.CYAN,
      hp: 100, maxHp: 100,
      markedForDeletion: false,
      facingRight: true,
      form: PlayerForm.NORMAL
    } as any;
  }

  // --- Procedural Generation ---
  resetLevel(levelNum: number) {
    this.level = levelNum;
    this.entities = [];
    this.particles = [];
    this.bossRef = null;
    this.bossPhase = 0;

    // 1. Generate Player at Start
    this.player = this.createPlayer(50, 400);
    this.entities.push(this.player);

    const levelLength = 2000 + (levelNum * 500);
    const groundY = 500;

    // 2. Generate Ground
    for (let x = 0; x < levelLength; x += TILE_SIZE) {
        // Gaps
        if (Math.random() > 0.9 && x > 300 && x < levelLength - 300) continue;
        
        this.entities.push({
            id: `ground_${x}`,
            type: EntityType.PLATFORM,
            x: x, y: groundY, w: TILE_SIZE, h: TILE_SIZE,
            vx: 0, vy: 0, color: COLORS.PURPLE,
            hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
        });
    }

    // 3. Generate Platforms & Hazards
    let currentX = 300;
    while(currentX < levelLength - 500) {
        const type = Math.random();
        
        if (type < 0.3) {
            // Floating Platform
            const h = 40 + Math.random() * 40;
            const y = groundY - 80 - Math.random() * 150;
            this.entities.push({
                id: `plat_${currentX}`,
                type: EntityType.PLATFORM,
                x: currentX, y: y, w: 100, h: 20,
                vx: 0, vy: 0, color: COLORS.CYAN,
                hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
            });
            
            // Maybe enemy on platform
            if (Math.random() > 0.5 && this.level % 3 !== 0) {
                 this.spawnEnemy(currentX + 20, y - 40);
            }
        } else if (type < 0.4) {
             // Spike on ground
             this.entities.push({
                id: `spike_${currentX}`,
                type: EntityType.SPIKE,
                x: currentX, y: groundY - 20, w: 40, h: 20,
                vx: 0, vy: 0, color: COLORS.GLITCH,
                hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
            });
        }

        // Powerups
        if (Math.random() > 0.95) {
             this.entities.push({
                id: `pw_${currentX}`,
                type: EntityType.POWERUP,
                x: currentX, y: groundY - 150, w: 20, h: 20,
                vx: 0, vy: 0, color: COLORS.YELLOW,
                hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
            });
        }

        currentX += 100 + Math.random() * 100;
    }

    // 4. Boss or Portal
    if (levelNum % BOSS_LEVEL_INTERVAL === 0) {
        // Boss Arena
        for(let i=0; i<800; i+=TILE_SIZE) {
            this.entities.push({
                id: `boss_floor_${i}`,
                type: EntityType.PLATFORM,
                x: levelLength + i, y: groundY, w: TILE_SIZE, h: TILE_SIZE,
                vx: 0, vy: 0, color: COLORS.GLITCH,
                hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
            });
        }
        // Spawn Boss
        this.bossRef = {
            id: 'boss',
            type: EntityType.BOSS,
            x: levelLength + 400, y: 200, w: 120, h: 120,
            vx: 0, vy: 0, color: COLORS.GLITCH,
            hp: 500, maxHp: 500, markedForDeletion: false, facingRight: false
        };
        this.entities.push(this.bossRef);
    } else {
        // End Portal
        this.entities.push({
            id: 'portal',
            type: EntityType.PORTAL,
            x: levelLength, y: groundY - 80, w: 60, h: 80,
            vx: 0, vy: 0, color: COLORS.MAGENTA,
            hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
        });
    }
  }

  spawnEnemy(x: number, y: number) {
      const type = Math.random() > 0.5 ? EntityType.ENEMY_DRONE : EntityType.ENEMY_GLITCH_WALKER;
      const enemy: Entity = {
          id: `en_${Date.now()}_${Math.random()}`,
          type,
          x, y, w: type === EntityType.ENEMY_DRONE ? 30 : 30, h: type === EntityType.ENEMY_DRONE ? 20 : 40,
          vx: 0, vy: 0,
          color: COLORS.GLITCH,
          hp: 30, maxHp: 30,
          markedForDeletion: false, facingRight: false
      };
      this.entities.push(enemy);
  }

  // --- Update Loop ---
  update() {
    if (this.gameState !== GameState.PLAYING) return;

    // Input Handling
    this.handleInput();

    // Physics & Logic
    this.entities.forEach(e => {
        if (e.type === EntityType.PLAYER) this.updatePlayer(e as any);
        else if (e.type === EntityType.PROJECTILE) this.updateProjectile(e);
        else if (e.type === EntityType.ENEMY_DRONE || e.type === EntityType.ENEMY_GLITCH_WALKER) this.updateEnemy(e);
        else if (e.type === EntityType.BOSS) this.updateBoss(e);
        else if (e.type === EntityType.PARTICLE) this.updateParticle(e as Particle);
    });

    // Collision
    this.handleCollisions();

    // Camera
    this.camera.x = this.player.x - CANVAS_WIDTH / 3;
    // Clamp camera y loosely
    this.camera.y += (this.player.y - 300 - this.camera.y) * 0.1;

    // Cleanup
    this.entities = this.entities.filter(e => !e.markedForDeletion);

    // Check Win/Loss
    if (this.player.y > CANVAS_HEIGHT + 200 || this.player.hp <= 0) {
        this.gameState = GameState.GAME_OVER;
    }

    if (this.bossRef && this.bossRef.hp <= 0) {
         // Boss defeated, spawn portal
         this.entities.push({
            id: 'portal_boss',
            type: EntityType.PORTAL,
            x: this.bossRef.x, y: 500 - 80, w: 60, h: 80,
            vx: 0, vy: 0, color: COLORS.MAGENTA,
            hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
        });
        this.bossRef = null;
    }
  }

  handleInput() {
    const p = this.player as any;
    
    // Horizontal
    if (this.keys[InputKeys.LEFT]) {
        p.vx -= 1;
        p.facingRight = false;
    }
    if (this.keys[InputKeys.RIGHT]) {
        p.vx += 1;
        p.facingRight = true;
    }
    
    // Friction/Cap
    p.vx *= FRICTION;
    p.vx = Math.max(Math.min(p.vx, MOVE_SPEED), -MOVE_SPEED);

    // Jump
    if (this.keys[InputKeys.UP] || this.keys[InputKeys.SPACE]) {
        if (p.form === PlayerForm.FLIGHT) {
             p.vy -= 1; // Fly
        } else if (p.onGround) {
             p.vy = JUMP_FORCE;
             p.onGround = false;
        }
    }
  }

  shoot() {
      const p = this.player;
      const bullet: Entity = {
          id: `blt_${Date.now()}`,
          type: EntityType.PROJECTILE,
          x: p.x + (p.facingRight ? p.w : -10),
          y: p.y + 15,
          w: p.form === PlayerForm.TANK ? 20 : 10,
          h: 6,
          vx: p.facingRight ? 12 : -12,
          vy: 0,
          color: p.form === PlayerForm.TANK ? '#ff0000' : '#00f0ff',
          hp: 1, maxHp: 1, markedForDeletion: false, facingRight: true
      };
      this.entities.push(bullet);
  }

  updatePlayer(p: any) {
    p.x += p.vx;
    p.y += p.vy;
    
    // Gravity
    if (p.form === PlayerForm.FLIGHT) {
        p.vy += GRAVITY * 0.2; // Low gravity
    } else {
        p.vy += GRAVITY;
    }

    // Reset ground flag (checked in collision)
    p.onGround = false;

    // Form timer? (Simplify: permanent until hit/new item for this demo)
  }

  updateEnemy(e: Entity) {
      const dist = this.player.x - e.x;
      if (Math.abs(dist) < 400) {
          // AI Active
          if (e.type === EntityType.ENEMY_DRONE) {
              e.x += dist > 0 ? 1 : -1;
              e.y += Math.sin(Date.now() * 0.005) * 1;
          } else {
              // Walker
              e.vx = dist > 0 ? 1 : -1;
              e.x += e.vx;
              e.y += e.vy;
              e.vy += GRAVITY;
              e.facingRight = dist > 0;
          }
      }
  }

  updateBoss(b: Entity) {
      this.bossTimer++;
      
      // Phase 1: Hover and Shoot
      if (this.bossTimer % 200 < 100) {
          b.y = 200 + Math.sin(this.bossTimer * 0.05) * 50;
          if (this.bossTimer % 60 === 0) {
              // Shoot at player
              const angle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
              this.entities.push({
                  id: `boss_shot_${Date.now()}`,
                  type: EntityType.PROJECTILE,
                  x: b.x + b.w/2, y: b.y + b.h/2,
                  w: 15, h: 15,
                  vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
                  color: COLORS.GLITCH, hp: 1, maxHp: 1, markedForDeletion: false, facingRight: false
              });
          }
      } 
      // Phase 2: Slam
      else {
          if (b.y < 450) b.y += 10;
          if (b.y >= 450 && this.bossTimer % 10 === 0) {
               // Shockwave
               this.spawnParticle(b.x, b.y + b.h, COLORS.GLITCH, 20);
               this.spawnParticle(b.x + b.w, b.y + b.h, COLORS.GLITCH, 20);
          }
      }
  }

  updateProjectile(p: Entity) {
      p.x += p.vx;
      p.y += p.vy;
      p.life = (p.life || 0) + 1;
      if (p.life > 100) p.markedForDeletion = true;
  }

  updateParticle(p: Particle) {
      p.life -= p.decay;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life <= 0) p.markedForDeletion = true;
  }

  spawnParticle(x: number, y: number, color: string, count = 5) {
      for(let i=0; i<count; i++) {
          this.entities.push({
              id: `p_${Date.now()}_${i}`,
              type: EntityType.PARTICLE,
              x, y, w: 4, h: 4,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              color, hp: 0, maxHp: 0, markedForDeletion: false, facingRight: true,
              life: 1.0, decay: 0.05
          } as Particle);
      }
  }

  handleCollisions() {
      // Very basic AABB
      const checkRect = (r1: Rect, r2: Rect) => {
          return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                 r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
      };

      // Player vs World
      const p = this.player as any;
      const platforms = this.entities.filter(e => e.type === EntityType.PLATFORM);
      
      platforms.forEach(plat => {
          // Basic ground detection
          if (checkRect(p, plat) && p.vy > 0 && p.y + p.h - p.vy <= plat.y) {
              p.y = plat.y - p.h;
              p.vy = 0;
              p.onGround = true;
          }
      });

      // Player vs Enemies/Projectiles
      const hazards = this.entities.filter(e => [EntityType.ENEMY_DRONE, EntityType.ENEMY_GLITCH_WALKER, EntityType.BOSS, EntityType.SPIKE].includes(e.type));
      hazards.forEach(h => {
          if (checkRect(p, h)) {
               if (p.form === PlayerForm.INVINCIBLE) {
                   h.hp = 0; // Destroy enemy
                   h.markedForDeletion = true;
                   this.spawnParticle(h.x, h.y, COLORS.GLITCH);
               } else {
                   p.hp -= 1; // Simplify damage
                   p.vx = -10; // Knockback
                   p.vy = -5;
                   if (p.form !== PlayerForm.NORMAL) p.form = PlayerForm.NORMAL; // Lose power
               }
          }
      });

      // Bullets vs Enemies
      const bullets = this.entities.filter(e => e.type === EntityType.PROJECTILE && e.color !== COLORS.GLITCH); // Player bullets
      const targets = [...hazards]; // Targets are enemies
      
      bullets.forEach(b => {
          targets.forEach(t => {
              if (checkRect(b, t)) {
                  t.hp -= (this.player as any).form === PlayerForm.TANK ? 10 : 5;
                  b.markedForDeletion = true;
                  this.spawnParticle(t.x + t.w/2, t.y + t.h/2, COLORS.WHITE);
                  if (t.hp <= 0) {
                      t.markedForDeletion = true;
                      this.score += 100;
                  }
              }
          });
      });
      
      // Player vs Items/Portals
      const items = this.entities.filter(e => e.type === EntityType.POWERUP || e.type === EntityType.PORTAL);
      items.forEach(i => {
          if (checkRect(p, i)) {
              if (i.type === EntityType.PORTAL) {
                  this.gameState = GameState.LEVEL_COMPLETE;
              } else {
                  // Powerup
                  const forms = [PlayerForm.FLIGHT, PlayerForm.TANK, PlayerForm.INVINCIBLE];
                  const newForm = forms[Math.floor(Math.random() * forms.length)];
                  (this.player as any).form = newForm;
                  i.markedForDeletion = true;
                  this.spawnParticle(p.x, p.y, COLORS.CYAN, 20);
              }
          }
      });
  }

  setKey(key: string, pressed: boolean) {
      this.keys[key] = pressed;
      if (pressed && key === InputKeys.Z && this.gameState === GameState.PLAYING) {
          this.shoot();
      }
  }
}