import { Entity, EntityType, PlayerForm, Camera, Particle } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, TILE_SIZE } from '../constants';

// Helper to draw pixel art rectangles with glow
const drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, glow: boolean = false) => {
  ctx.fillStyle = color;
  ctx.shadowBlur = glow ? 10 : 0;
  ctx.shadowColor = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  ctx.shadowBlur = 0;
};

// Background Layer Renderer (Parallax)
export const drawBackground = (ctx: CanvasRenderingContext2D, camera: Camera, level: number) => {
  // Clear screen
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#050510');
  gradient.addColorStop(1, '#2a0a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Sun
  ctx.fillStyle = ctx.createLinearGradient(0, 0, 0, 200);
  ctx.fillStyle = COLORS.MAGENTA;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100, 150, 0, Math.PI * 2);
  ctx.fill();
  
  // Sun stripes (Masking)
  for(let i=0; i<10; i++) {
    ctx.fillStyle = `rgba(10, 10, 42, ${i * 0.1})`;
    ctx.fillRect(CANVAS_WIDTH / 2 - 160, CANVAS_HEIGHT - 250 + (i * 15), 320, 5);
  }

  // Grid (Ground)
  ctx.strokeStyle = COLORS.PURPLE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const perspectiveOffset = (camera.x * 0.5) % 100;
  for (let i = 0; i < CANVAS_WIDTH + 100; i += 40) {
    ctx.moveTo(i - perspectiveOffset, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH / 2 + (i - CANVAS_WIDTH/2 - perspectiveOffset) * 0.1, CANVAS_HEIGHT / 2);
  }
  for (let i = 0; i < 10; i++) {
    const y = CANVAS_HEIGHT - Math.pow(i, 2) * 5;
    if (y < CANVAS_HEIGHT / 2) continue;
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
  }
  ctx.stroke();

  // Distant City (Layer 1 - Slowest)
  const scroll1 = (camera.x * 0.1) % CANVAS_WIDTH;
  ctx.fillStyle = '#1a1a4a';
  [0, 1].forEach(offset => {
    const startX = -scroll1 + (offset * CANVAS_WIDTH);
    for (let i = 0; i < 20; i++) {
      const h = 100 + Math.sin(i * 132) * 50;
      ctx.fillRect(startX + i * 50, CANVAS_HEIGHT - h - 50, 45, h);
    }
  });

  // Mid City (Layer 2 - Faster)
  const scroll2 = (camera.x * 0.3) % CANVAS_WIDTH;
  ctx.fillStyle = '#2a0a5a';
  [0, 1].forEach(offset => {
    const startX = -scroll2 + (offset * CANVAS_WIDTH);
    for (let i = 0; i < 15; i++) {
      const h = 150 + Math.cos(i * 412) * 80;
      ctx.fillRect(startX + i * 80, CANVAS_HEIGHT - h - 20, 70, h);
      // Windows
      ctx.fillStyle = i % 3 === 0 ? COLORS.CYAN : COLORS.MAGENTA;
      if (Math.random() > 0.9) ctx.fillRect(startX + i * 80 + 10, CANVAS_HEIGHT - h, 10, 10);
      ctx.fillStyle = '#2a0a5a';
    }
  });
};

export const drawEntities = (ctx: CanvasRenderingContext2D, entities: Entity[], camera: Camera, frame: number) => {
  entities.forEach(entity => {
    const drawX = entity.x - camera.x;
    const drawY = entity.y - camera.y;

    // Culling
    if (drawX < -100 || drawX > CANVAS_WIDTH + 100) return;

    switch (entity.type) {
      case EntityType.PLAYER:
        drawPlayer(ctx, entity, drawX, drawY, frame);
        break;
      case EntityType.PLATFORM:
        drawPlatform(ctx, entity, drawX, drawY);
        break;
      case EntityType.ENEMY_DRONE:
        drawDrone(ctx, entity, drawX, drawY, frame);
        break;
      case EntityType.ENEMY_GLITCH_WALKER:
        drawGlitchWalker(ctx, entity, drawX, drawY, frame);
        break;
      case EntityType.BOSS:
        drawBoss(ctx, entity, drawX, drawY, frame);
        break;
      case EntityType.PROJECTILE:
        drawRect(ctx, drawX, drawY, entity.w, entity.h, entity.color, true);
        break;
      case EntityType.PARTICLE:
        ctx.globalAlpha = (entity as Particle).life;
        drawRect(ctx, drawX, drawY, entity.w, entity.h, entity.color);
        ctx.globalAlpha = 1.0;
        break;
      case EntityType.POWERUP:
        drawPowerUp(ctx, entity, drawX, drawY, frame);
        break;
      case EntityType.PORTAL:
        drawPortal(ctx, entity, drawX, drawY, frame);
        break;
      case EntityType.SPIKE:
        drawSpike(ctx, entity, drawX, drawY);
        break;
    }
  });
};

const drawPlayer = (ctx: CanvasRenderingContext2D, p: any, x: number, y: number, frame: number) => {
  const isRight = p.facingRight;
  
  // Aura based on form
  if (p.form === PlayerForm.INVINCIBLE) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = frame % 10 < 5 ? COLORS.YELLOW : COLORS.CYAN;
  }

  // Hair (Blue)
  ctx.fillStyle = COLORS.CYAN;
  // Flowing hair effect
  const hairOffset = Math.sin(frame * 0.2) * 3;
  ctx.fillRect(x + (isRight ? 2 : 8), y, 20, 10); // Top
  ctx.fillRect(x + (isRight ? -5 : 25), y + 5, 10, 20 + hairOffset); // Ponytail

  // Face
  ctx.fillStyle = '#ffccaa';
  ctx.fillRect(x + (isRight ? 10 : 8), y + 8, 14, 12);

  // Eye
  ctx.fillStyle = '#000';
  ctx.fillRect(x + (isRight ? 18 : 10), y + 12, 3, 3);

  // Body/Outfit
  ctx.fillStyle = p.form === PlayerForm.TANK ? '#ff0000' : p.form === PlayerForm.FLIGHT ? '#ffff00' : COLORS.MAGENTA;
  ctx.fillRect(x + 10, y + 20, 12, 18);

  // Wings for Flight Mode
  if (p.form === PlayerForm.FLIGHT) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const wingFlap = Math.sin(frame * 0.5) * 10;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 25);
    ctx.lineTo(x + 16 - 20, y + 10 + wingFlap);
    ctx.lineTo(x + 16 - 15, y + 35);
    ctx.fill();
  }

  // Legs (Simple animation)
  ctx.fillStyle = '#111';
  if (Math.abs(p.vx) > 0.1) {
    const legAnim = Math.sin(frame * 0.5) * 5;
    ctx.fillRect(x + 10 + legAnim, y + 38, 4, 10);
    ctx.fillRect(x + 18 - legAnim, y + 38, 4, 10);
  } else {
    ctx.fillRect(x + 10, y + 38, 4, 10);
    ctx.fillRect(x + 18, y + 38, 4, 10);
  }

  // Gun
  ctx.fillStyle = '#444';
  if (isRight) {
    ctx.fillRect(x + 18, y + 25, 12, 5);
  } else {
    ctx.fillRect(x + 2, y + 25, 12, 5);
  }

  ctx.shadowBlur = 0;
};

const drawDrone = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, frame: number) => {
  const hover = Math.sin(frame * 0.1) * 5;
  ctx.fillStyle = '#555';
  ctx.fillRect(x, y + hover, 30, 20);
  ctx.fillStyle = COLORS.LIME; // Eye
  ctx.fillRect(x + 10, y + 5 + hover, 10, 5);
  // Propeller
  ctx.fillStyle = 'rgba(200,200,255,0.5)';
  ctx.fillRect(x - 5, y - 5 + hover, 40, 2);
};

const drawGlitchWalker = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, frame: number) => {
  // Glitch effect: offset drawing randomly
  const gx = Math.random() > 0.9 ? x + (Math.random() * 10 - 5) : x;
  
  ctx.fillStyle = COLORS.PURPLE;
  ctx.fillRect(gx, y, 30, 40);
  
  // Spikes
  ctx.fillStyle = COLORS.GLITCH;
  ctx.beginPath();
  ctx.moveTo(gx + 5, y);
  ctx.lineTo(gx + 15, y - 10);
  ctx.lineTo(gx + 25, y);
  ctx.fill();

  // Eye
  ctx.fillStyle = COLORS.YELLOW;
  ctx.fillRect(gx + (e.facingRight ? 20 : 5), y + 10, 5, 5);
};

const drawBoss = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, frame: number) => {
  const shake = Math.random() * 4 - 2;
  const pulse = 1 + Math.sin(frame * 0.1) * 0.1;

  ctx.save();
  ctx.translate(x + e.w/2, y + e.h/2);
  ctx.scale(pulse, pulse);
  
  // Core
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLORS.GLITCH;
  ctx.fillStyle = '#111';
  ctx.fillRect(-e.w/2 + shake, -e.h/2, e.w, e.h);

  // Face/Monitor
  ctx.fillStyle = COLORS.GLITCH;
  ctx.fillRect(-e.w/2 + 10, -e.h/2 + 10, e.w - 20, e.h - 20);

  // Eye
  ctx.fillStyle = '#fff';
  const eyeSize = 20;
  ctx.fillRect(-eyeSize/2, -eyeSize/2, eyeSize, eyeSize);

  // Glitch particles
  for(let i=0; i<5; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? COLORS.CYAN : COLORS.MAGENTA;
    const px = (Math.random() - 0.5) * e.w * 1.5;
    const py = (Math.random() - 0.5) * e.h * 1.5;
    ctx.fillRect(px, py, 10, 5);
  }

  ctx.restore();
};

const drawPlatform = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number) => {
  // Neon Platform
  ctx.strokeStyle = COLORS.CYAN;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, e.w, e.h);
  
  // Grid pattern inside
  ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
  ctx.fillRect(x, y, e.w, e.h);
  ctx.beginPath();
  for(let i=0; i<e.w; i+=10) {
      ctx.moveTo(x+i, y);
      ctx.lineTo(x+i+5, y+e.h);
  }
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.stroke();
};

const drawSpike = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number) => {
  ctx.fillStyle = COLORS.GLITCH;
  ctx.beginPath();
  ctx.moveTo(x, y + e.h);
  ctx.moveTo(x + e.w/2, y);
  ctx.moveTo(x + e.w, y + e.h);
  ctx.fill();
};

const drawPowerUp = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, frame: number) => {
  const float = Math.sin(frame * 0.1) * 5;
  ctx.shadowBlur = 10;
  // Based on type logic handled in engine, but here simplified visual
  // We can infer type or just make generic rainbow box
  ctx.fillStyle = `hsl(${frame * 5 % 360}, 100%, 50%)`; 
  ctx.shadowColor = ctx.fillStyle;
  ctx.fillRect(x, y + float, 20, 20);
  ctx.fillStyle = '#fff';
  ctx.fillText("?", x + 6, y + 15 + float);
  ctx.shadowBlur = 0;
};

const drawPortal = (ctx: CanvasRenderingContext2D, e: Entity, x: number, y: number, frame: number) => {
    ctx.beginPath();
    ctx.strokeStyle = COLORS.MAGENTA;
    ctx.lineWidth = 3;
    const radius = e.w / 2;
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Swirl
    ctx.save();
    ctx.translate(x + radius, y + radius);
    ctx.rotate(frame * 0.05);
    ctx.fillStyle = 'rgba(189, 0, 255, 0.5)';
    ctx.fillRect(-radius/2, -radius/2, radius, radius);
    ctx.restore();
};