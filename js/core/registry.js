/**
 * registry.js — 渲染器注册表与 Canvas 2D 应急渲染器
 * FallbackCanvas2DRenderer 逻辑原样提取自 3d.html，未作删改。
 */

/**
 * CreatureRendererRegistry — 渲染器注册表
 * 原有 register / get / has 保持兼容，另预留 registerLoader 懒加载接口。
 */
export class CreatureRendererRegistry {
  constructor() {
    this.renderers = new Map();
    this.loaders = new Map();
  }

  register(creatureId, rendererInstance) {
    this.renderers.set(creatureId, rendererInstance);
  }

  get(creatureId) {
    return this.renderers.get(creatureId) || null;
  }

  has(creatureId) {
    return this.renderers.has(creatureId);
  }

  /** 注册异步懒加载器：首次访问时才 import 对应渲染器模块 */
  registerLoader(creatureId, asyncLoaderFn) {
    this.loaders.set(creatureId, asyncLoaderFn);
  }

  hasLoader(creatureId) {
    return this.loaders.has(creatureId);
  }

  /** 按需加载并缓存实例；已 register 的实例直接返回 */
  async getOrLoad(creatureId) {
    const existing = this.renderers.get(creatureId);
    if (existing) return existing;
    const loader = this.loaders.get(creatureId);
    if (!loader) return null;
    const instance = await loader();
    if (instance) this.register(creatureId, instance);
    return instance || null;
  }
}

/**
 * Canvas 2D 应急混沌渲染器（当环境不支持 WebGPU 时自动接管）
 */
export class FallbackCanvas2DRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = Array.from({ length: 260 }, (_, i) => ({
      angle: Math.random() * Math.PI * 2,
      radius: 70 + Math.random() * 240,
      speed: (0.004 + Math.random() * 0.012) * (i % 2 === 0 ? 1 : -1),
      size: 1 + Math.random() * 2.8,
      hue: i % 3 === 0 ? '#c8a45d' : (i % 3 === 1 ? '#10b981' : '#9e1b32')
    }));
  }

  render(state) {
    const ctx = this.ctx;
    const w = this.canvas.width = window.innerWidth;
    const h = this.canvas.height = window.innerHeight;
    const cx = w * 0.5 + state.mouseOffset[0] * 40;
    const cy = h * 0.5 - state.mouseOffset[1] * 40;

    ctx.fillStyle = '#030505';
    ctx.fillRect(0, 0, w, h);

    const t = state.time * (1 + state.gazeIntensity * 1.5);
    // 绘制沸腾肉核渐变团
    for (let i = 7; i >= 0; i--) {
      const ox = Math.sin(t * 1.1 + i * 1.3) * (28 + state.gazeIntensity * 25);
      const oy = Math.cos(t * 0.9 + i * 1.7) * (28 + state.gazeIntensity * 25);
      const r = 65 + i * 18 + Math.sin(t * 2 + i) * 14;
      const grad = ctx.createRadialGradient(cx + ox, cy + oy, 5, cx + ox, cy + oy, r);
      grad.addColorStop(0, i % 2 === 0 ? 'rgba(158, 27, 50, 0.42)' : 'rgba(16, 185, 129, 0.32)');
      grad.addColorStop(0.6, 'rgba(55, 12, 45, 0.18)');
      grad.addColorStop(1, 'rgba(3, 5, 5, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制环绕仆役粒子
    for (const p of this.particles) {
      p.angle += p.speed * (1 + state.gazeIntensity * 2.5);
      const px = cx + Math.cos(p.angle) * p.radius * (1 + 0.15 * Math.sin(t + p.radius));
      const py = cy + Math.sin(p.angle) * p.radius * 0.68;
      ctx.fillStyle = p.hue;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
