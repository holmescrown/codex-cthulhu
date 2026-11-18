/**
 * main.js — 克苏鲁图鉴最终入口
 * 从 3d.html 剥离已模块化的数据/音频/渲染器/注册表后，完整保留 UI 控制、分页筛选、
 * 首帧三级截取、相机交互与主渲染循环。
 */
import { CATEGORIES, CTHULHU_CODEX_DATA, ENTITY_META_MAP } from './codex-data.js';
import { EldritchAudioEngine } from './audio-engine.js';
import { CreatureRendererRegistry, FallbackCanvas2DRenderer } from './core/registry.js';
import { AzathothRenderer } from './renderers/1-1-azathoth.js';
import { YogSothothRenderer } from './renderers/1-2-yogsothoth.js';
import { ShubNiggurathRenderer } from './renderers/1-3-shubniggurath.js';
import { NyarlathotepRenderer } from './renderers/1-4-nyarlathotep.js';
import { TulzschaRenderer } from './renderers/1-5-tulzscha.js';
import { AbhothRenderer } from './renderers/1-6-abhoth.js';
import { GhrothRenderer } from './renderers/1-7-ghroth.js';
import { CthulhuRenderer } from './renderers/2-1-cthulhu.js';
import { HasturRenderer } from './renderers/2-2-hastur.js';
import { DagonRenderer } from './renderers/2-3-dagon.js';
import { YigRenderer } from './renderers/2-4-yig.js';
import { TsathogguaRenderer } from './renderers/2-5-tsathoggua.js';

// MODIFIED: 优化 2 — 内部分辨率缩放。物理像素 = 视口 * dpr * 该系数，
// canvas 由 CSS w-full h-full 铺满视口，浏览器合成器自动双线性放大；HTML UI 层不受影响。
// 0.65^2 = 0.4225，片元着色器调用量减少约 58%，体积光/血肉次表面散射自带柔化，肉眼几乎无差。
const INTERNAL_RENDER_SCALE = 0.65;

/**
 * ============================================================================
 * 第四部分（片段 4 · 重构）：双视图控制器
 * ARCHIVE = 3×3 古典图鉴分页大厅（WebGPU 休眠）
 * OBSERVE = 全屏 3D 高维观测室（实时渲染 + 凝视掉 SAN）
 * ============================================================================
 */
// MODIFIED: 双视图（3x3古典图鉴分页大厅 + 按需唤醒全屏3D观测室）与首帧截取逻辑
const AppState = {
  viewMode: "ARCHIVE", // "ARCHIVE" (3x3图鉴大厅) | "OBSERVE" (全屏3D观测室)
  selectedCreatureId: "1-1",
  activeCategory: "ALL",
  searchQuery: "",
  currentPage: 1,
  pageSize: 9, // 每页固定 9 张卡片 (3x3)
  previewDataUrls: {}, // 按实体 ID 存储后台截取的首帧静态预览图
  isPausedOrBlurred: true, // 默认在图鉴主页休眠 WebGPU，不烧显卡
  isGazing: false,
  gazeIntensity: 0.0,
  sanity: 96.0,
  entropyScale: 1.0,
  glowScale: 1.2,
  camRadius: 4.8,
  camTheta: 0.42,
  camPhi: 1.15,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  mouseOffset: [0, 0],
  accumulatedTime: 0.65,
  lastFrameTime: performance.now(),
  fps: 60
};
// MODIFIED: 必须在 AppState 初始化完成后再实例化音频引擎，避免 triggerNote 提前读取 AppState 触发 TDZ 报错
const eldritchAudio = new EldritchAudioEngine();

const registry = new CreatureRendererRegistry();
let fallbackRenderer = null;
let isUsingWebGPU = false;
let gpuDevice = null;
let gpuContext = null;
let gpuFormat = null;

const webgpuCanvas = document.getElementById('webgpu-canvas');
const fallbackCanvas = document.getElementById('fallback-canvas');
const viewportContainer = document.getElementById('viewport-container');
const archiveHallEl = document.getElementById('codex-archive-hall');
const observationHudEl = document.getElementById('observation-hud');
const creatureGridEl = document.getElementById('creature-grid-9');
const categoryTabsEl = document.getElementById('category-tabs');
const filterStatusTextEl = document.getElementById('filter-status-text');
const pageIndicatorEl = document.getElementById('page-indicator');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

// 右侧详情面板 & 弹窗引用
const detailIdBadge = document.getElementById('detail-id-badge');
const detailCategoryBadge = document.getElementById('detail-category-badge');
const detailNameCn = document.getElementById('detail-name-cn');
const detailNameEn = document.getElementById('detail-name-en');
const detailTitle = document.getElementById('detail-title');
const detailDescription = document.getElementById('detail-description');
const glitchModal = document.getElementById('unimplemented-glitch-modal');
const madnessCrimsonOverlay = document.getElementById('madness-crimson-overlay');
const sanityValueText = document.getElementById('sanity-value-text');
const sanityBar = document.getElementById('sanity-bar');
const coordReadout = document.getElementById('coord-readout');
const fpsCounter = document.getElementById('fps-counter');

// 生成未解密卡片的古典旧印封印 SVG 预览图
function getSealedSigilSVG(idText) {
  return `
    <div class="w-full h-full bg-[#070808] flex flex-col items-center justify-center relative overflow-hidden border-b border-[#c8a45d]/20">
      <svg class="w-24 h-24 text-[#c8a45d]/20" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/>
        <polygon points="50,10 85,72 15,72" stroke="currentColor" stroke-width="1.2"/>
        <polygon points="50,90 85,28 15,28" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="50" cy="50" r="12" stroke="#9e1b32" stroke-opacity="0.45" stroke-width="1.5"/>
      </svg>
      <span class="mt-1 text-[10px] font-mono-tech tracking-widest text-[#7d7365]">SEALED ARCHIVE // ${idText}</span>
    </div>
  `;
}

function renderCategoryTabs() {
  categoryTabsEl.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const active = AppState.activeCategory === cat.id;
    const btn = document.createElement('button');
    btn.className = `px-2.5 py-1 rounded text-xs font-mono-tech shrink-0 border transition ${
      active
        ? 'bg-[#c8a45d]/25 text-[#f3e5c8] border-[#c8a45d]'
        : 'bg-black/50 text-[#9b9284] border-[#c8a45d]/20 hover:border-[#c8a45d]/50 hover:text-[#d8d0c5]'
    }`;
    btn.textContent = `${cat.name} (${cat.count})`;
    btn.addEventListener('click', () => {
      AppState.activeCategory = cat.id;
      AppState.currentPage = 1;
      renderCategoryTabs();
      renderArchiveGrid();
    });
    categoryTabsEl.appendChild(btn);
  });
}

// 渲染每页 9 张（3×3）古典图鉴卡片
function renderArchiveGrid() {
  const q = AppState.searchQuery.trim().toLowerCase();
  const filtered = CTHULHU_CODEX_DATA.filter(item => {
    const matchCat = AppState.activeCategory === 'ALL' || item.category === AppState.activeCategory;
    const matchSearch = !q || item.id.toLowerCase().includes(q) || item.name_cn.toLowerCase().includes(q) ||
      item.name_en.toLowerCase().includes(q) || item.title.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / AppState.pageSize));
  if (AppState.currentPage > totalPages) AppState.currentPage = totalPages;

  const startIdx = (AppState.currentPage - 1) * AppState.pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + AppState.pageSize);

  const awakenedCount = CTHULHU_CODEX_DATA.filter(c => c.implemented).length;
  document.getElementById('awakened-count-text').textContent = `已觉醒 ${awakenedCount} 卷`;
  filterStatusTextEl.textContent = `当前卷宗：${filtered.length} / ${CTHULHU_CODEX_DATA.length} 卷（每页 9 卷）· 已觉醒 ${awakenedCount} 卷`;
  pageIndicatorEl.textContent = `第 ${AppState.currentPage} / ${totalPages} 页`;
  prevPageBtn.disabled = AppState.currentPage <= 1;
  nextPageBtn.disabled = AppState.currentPage >= totalPages;

  creatureGridEl.innerHTML = '';
  pageItems.forEach(creature => {
    const card = document.createElement('article');
    card.className = `codex-card-frame rounded overflow-hidden cursor-pointer flex flex-col ${
      creature.implemented ? 'codex-card-awakened' : 'opacity-85 hover:opacity-100'
    }`;

    // 顶部 16:9 静态首帧预览视窗
    // MODIFIED: 支持任意已觉醒卡片（1-1、1-2 等）读取各自的首帧 WebGPU 静态预览图
    const previewUrl = AppState.previewDataUrls[creature.id];
    const previewHtml = creature.implemented
      ? (previewUrl
          ? `<img src="${previewUrl}" alt="${creature.name_cn}" class="w-full h-full object-cover" />`
          : `<div class="w-full h-full bg-gradient-to-br from-[#0c1428] via-[#050308] to-[#0a241b] flex items-center justify-center text-xs font-mono-tech text-[#e6cf9c]">[高维投影已就绪]</div>`)
      : getSealedSigilSVG(creature.id);

    const badgeHtml = creature.implemented
      ? `<span class="px-2 py-0.5 text-[10px] font-mono-tech rounded bg-amber-950/90 text-amber-300 border border-amber-400/60 flex items-center gap-1">
           <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>已觉醒 · 点击进入3D观测
         </span>`
      : `<span class="px-2 py-0.5 text-[10px] font-mono-tech rounded bg-black/80 text-[#8c8273] border border-[#c8a45d]/20">🔒 未解密 / 封印中</span>`;

    card.innerHTML = `
      <div class="relative aspect-video w-full overflow-hidden bg-black">
        ${previewHtml}
        ${creature.implemented ? '' : '<div class="codex-card-film"></div>'}
        <div class="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-mono-tech bg-black/80 text-[#e6cf9c] border border-[#c8a45d]/40 rounded">
          #${creature.id} · ${creature.category_cn}
        </div>
        <div class="absolute bottom-2 right-2">
          ${badgeHtml}
        </div>
      </div>
      <div class="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-baseline justify-between gap-2">
            <h3 class="text-base font-bold text-[#f3e5c8]">${creature.name_cn}</h3>
            <span class="font-cinzel text-[11px] text-[#9b9284] truncate">${creature.name_en}</span>
          </div>
          <div class="text-xs text-[#c8a45d] mt-0.5 truncate">${creature.title}</div>
          <p class="text-[11px] text-[#a89f91] mt-1.5 line-clamp-2 leading-relaxed">${creature.description}</p>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openCreatureEntry(creature));
    creatureGridEl.appendChild(card);
  });
}

// 点击卡片：已觉醒则唤醒全屏 3D 观测室，未觉醒则弹出 Glitch 警告
function openCreatureEntry(creature) {
  AppState.selectedCreatureId = creature.id;
  // 修复：模块化拆分时该赋值被误删，导致进入观测室时 meta 未定义抛错
  const meta = ENTITY_META_MAP[creature.id] || ENTITY_META_MAP.DEFAULT;
  if (creature.implemented) {
    AppState.viewMode = "OBSERVE";
    AppState.isPausedOrBlurred = false;
    eldritchAudio.setMuted(false);

    detailIdBadge.textContent = `#${creature.id}`;
    detailCategoryBadge.textContent = `${creature.category_cn} · ${creature.category}`;
    detailNameCn.textContent = creature.name_cn;
    detailNameEn.textContent = creature.name_en;
    detailTitle.textContent = creature.title;
    detailDescription.textContent = creature.description;

    document.getElementById('pipeline-label').textContent = meta.pipeline;
    document.getElementById('glow-label').textContent = meta.glow;
    document.getElementById('gaze-abyss-btn').textContent = meta.gazeBtn;
    document.getElementById('gaze-tip-text').textContent = meta.gazeTip;
    document.getElementById('audio-label').textContent = `${meta.audioName}: ${eldritchAudio.isEnabled ? '聆听中' : '静音'}`;
    eldritchAudio.applyEntityProfile(creature.id);

    // MODIFIED: 每次进入观测室时重置右侧面板为展开状态，并同步收起标签标题
    document.getElementById('entity-detail-panel').classList.remove('panel-collapsed');
    document.getElementById('expand-detail-tab').classList.add('hidden');
    document.getElementById('collapsed-tab-title').textContent = `📜 档案 #${creature.id} ${creature.name_cn}`;

    archiveHallEl.classList.add('hidden');
    observationHudEl.classList.remove('hidden');
    document.getElementById('gpu-status-badge').textContent = 'WebGPU WGSL ACTIVE';
  } else {
    document.getElementById('glitch-entity-id').textContent = `档案编号 #${creature.id} · ${creature.category_cn}`;
    document.getElementById('glitch-entity-name').textContent = creature.name_cn;
    document.getElementById('glitch-entity-en').textContent = creature.name_en;
    document.getElementById('glitch-entity-title').textContent = `尊号：${creature.title}`;
    document.getElementById('glitch-entity-desc').textContent = creature.description;

    glitchModal.classList.remove('hidden');
    glitchModal.classList.add('flex');
    AppState.sanity = Math.max(15, AppState.sanity - 3);
    updateSanityUI();
  }
}

// 返回 3x3 图鉴大厅并休眠 WebGPU 渲染
function returnToArchiveHall() {
  AppState.viewMode = "ARCHIVE";
  AppState.isPausedOrBlurred = true;
  AppState.isGazing = false;
  eldritchAudio.setMuted(true);
  document.body.classList.remove('gaze-shaking');
  observationHudEl.classList.add('hidden');
  archiveHallEl.classList.remove('hidden');
  document.getElementById('gpu-status-badge').textContent = 'WebGPU STANDBY';
}

function updateSanityUI() {
  const sanInt = Math.round(AppState.sanity);
  sanityValueText.textContent = `${sanInt} / 99`;
  sanityBar.style.width = `${sanInt}%`;
}

// 渲染一帧（供初始化截取静态预览图与主循环共用）
function renderSingleFrame(dt) {
  const r = AppState.camRadius * (1.0 - AppState.gazeIntensity * 0.22);
  const camX = r * Math.sin(AppState.camPhi) * Math.sin(AppState.camTheta);
  const camY = r * Math.cos(AppState.camPhi);
  const camZ = r * Math.sin(AppState.camPhi) * Math.cos(AppState.camTheta);

  if (coordReadout) {
    coordReadout.textContent = `R: ${r.toFixed(2)} | θ: ${(AppState.camTheta % 6.28).toFixed(2)} | φ: ${AppState.camPhi.toFixed(2)}`;
  }

  const renderState = {
    width: webgpuCanvas.width,
    height: webgpuCanvas.height,
    time: AppState.accumulatedTime,
    deltaTime: dt,
    gazeIntensity: AppState.gazeIntensity,
    entropyScale: AppState.entropyScale,
    glowScale: AppState.glowScale,
    camPos: [camX, camY, camZ],
    mouseOffset: AppState.mouseOffset
  };

  if (isUsingWebGPU) {
    const activeRenderer = registry.get(AppState.selectedCreatureId);
    if (activeRenderer) activeRenderer.render(renderState);
  } else if (fallbackRenderer) {
    fallbackRenderer.render(renderState);
  }
}

/* ---------------- 首帧截取三级保障：toDataURL → 纹理回读 → 程序化 ---------------- */
function isPreviewBlank(canvas) {
  try {
    const probe = document.createElement('canvas');
    probe.width = 40; probe.height = 24;
    const pctx = probe.getContext('2d');
    pctx.drawImage(canvas, 0, 0, 40, 24);
    const data = pctx.getImageData(0, 0, 40, 24).data;
    let sum = 0, sumSq = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += lum; sumSq += lum * lum;
    }
    const mean = sum / n;
    return (sumSq / n - mean * mean) < 2.5;
  } catch (_) {
    return true;
  }
}

function proceduralPreview() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 360;
  const x = c.getContext('2d');
  x.fillStyle = '#050408';
  x.fillRect(0, 0, 640, 360);
  const cx = 320, cy = 180, t = 0.65;
  for (let i = 8; i >= 0; i--) {
    const ox = Math.sin(t * 1.1 + i * 1.3) * (16 + i * 5);
    const oy = Math.cos(t * 0.9 + i * 1.7) * (12 + i * 4);
    const rr = 46 + i * 13 + Math.sin(t * 2 + i) * 8;
    const g = x.createRadialGradient(cx + ox, cy + oy, 4, cx + ox, cy + oy, rr);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(150,92,18,0.34)' : 'rgba(14,150,96,0.26)');
    g.addColorStop(0.55, 'rgba(38,10,52,0.2)');
    g.addColorStop(1, 'rgba(3,5,5,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(cx + ox, cy + oy, rr, 0, Math.PI * 2); x.fill();
  }
  x.strokeStyle = 'rgba(200,164,93,0.4)'; x.lineWidth = 1.4;
  x.beginPath(); x.ellipse(cx, cy, 172, 60, 0.3, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = 'rgba(16,185,129,0.28)';
  x.beginPath(); x.ellipse(cx, cy, 148, 88, -0.45, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 60 + Math.random() * 250;
    x.fillStyle = ['#c8a45d', '#10b981', '#9e1b32'][i % 3];
    x.globalAlpha = 0.25 + Math.random() * 0.5;
    x.beginPath();
    x.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.62, 0.7 + Math.random() * 1.8, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  const vg = x.createRadialGradient(cx, cy, 50, cx, cy, 370);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.72)');
  x.fillStyle = vg; x.fillRect(0, 0, 640, 360);
  return c.toDataURL('image/jpeg', 0.88);
}

async function captureWebGPUPreview(device, context, format, canvas) {
  // 1) 同一帧同步调用 toDataURL（多数桌面浏览器可直接截取）
  try {
    const direct = canvas.toDataURL('image/jpeg', 0.88);
    if (direct && direct.length > 3000 && !isPreviewBlank(canvas)) return direct;
  } catch (_) {}
  // 2) 依赖 configure 时申请的 COPY_SRC，从当前纹理回读像素
  try {
    const w = canvas.width, h = canvas.height;
    const bytesPerRow = Math.ceil((w * 4) / 256) * 256;
    const buf = device.createBuffer({
      size: bytesPerRow * h,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const enc = device.createCommandEncoder();
    enc.copyTextureToBuffer(
      { texture: context.getCurrentTexture() },
      { buffer: buf, bytesPerRow, rowsPerImage: h },
      { width: w, height: h, depthOrArrayLayers: 1 }
    );
    device.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const src = new Uint8Array(buf.getMappedRange());
    const rgba = new Uint8ClampedArray(w * h * 4);
    const bgra = format.indexOf('bgra') !== -1;
    for (let y = 0; y < h; y++) {
      const so = y * bytesPerRow, dOff = y * w * 4;
      for (let x = 0; x < w; x++) {
        const si = so + x * 4, di = dOff + x * 4;
        if (bgra) {
          rgba[di] = src[si + 2]; rgba[di + 1] = src[si + 1]; rgba[di + 2] = src[si];
        } else {
          rgba[di] = src[si]; rgba[di + 1] = src[si + 1]; rgba[di + 2] = src[si + 2];
        }
        rgba[di + 3] = 255;
      }
    }
    buf.unmap();
    const raw = document.createElement('canvas');
    raw.width = w; raw.height = h;
    raw.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
    const out = document.createElement('canvas');
    out.width = 640; out.height = 360;
    out.getContext('2d').drawImage(raw, 0, 0, 640, 360);
    return out.toDataURL('image/jpeg', 0.88);
  } catch (e) {
    console.warn('WebGPU 首帧纹理回读失败，改用程序化首帧：', e);
  }
  return proceduralPreview();
}

async function captureFallbackPreview(canvas) {
  try {
    const url = canvas.toDataURL('image/jpeg', 0.88);
    if (url && url.length > 3000 && !isPreviewBlank(canvas)) return url;
  } catch (_) {}
  return proceduralPreview();
}

// 绑定分页、返回、滑块与相机交互事件
function setupInteractions() {
  document.getElementById('back-to-archive-btn').addEventListener('click', returnToArchiveHall);

  prevPageBtn.addEventListener('click', () => {
    if (AppState.currentPage > 1) {
      AppState.currentPage--;
      renderArchiveGrid();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    AppState.currentPage++;
    renderArchiveGrid();
  });

  const searchInputEl = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  searchInputEl.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value;
    AppState.currentPage = 1;
    clearSearchBtn.classList.toggle('hidden', !AppState.searchQuery);
    renderArchiveGrid();
  });
  clearSearchBtn.addEventListener('click', () => {
    AppState.searchQuery = '';
    searchInputEl.value = '';
    AppState.currentPage = 1;
    clearSearchBtn.classList.add('hidden');
    renderArchiveGrid();
  });

  document.getElementById('close-glitch-stay-btn').addEventListener('click', () => {
    glitchModal.classList.add('hidden');
    glitchModal.classList.remove('flex');
  });

  document.getElementById('return-azathoth-btn').addEventListener('click', () => {
    glitchModal.classList.add('hidden');
    glitchModal.classList.remove('flex');
    openCreatureEntry(CTHULHU_CODEX_DATA[0]);
  });

  document.getElementById('entropy-slider').addEventListener('input', (e) => {
    AppState.entropyScale = parseFloat(e.target.value);
    document.getElementById('entropy-val').textContent = `${AppState.entropyScale.toFixed(2)}x`;
  });

  document.getElementById('glow-slider').addEventListener('input', (e) => {
    AppState.glowScale = parseFloat(e.target.value);
    document.getElementById('glow-val').textContent = `${AppState.glowScale.toFixed(2)}x`;
  });

  // MODIFIED: 右侧档案卡片收起 / 展开切换
  const detailPanel = document.getElementById('entity-detail-panel');
  const expandTab = document.getElementById('expand-detail-tab');
  document.getElementById('collapse-detail-btn').addEventListener('click', () => {
    detailPanel.classList.add('panel-collapsed');
    expandTab.classList.remove('hidden');
  });
  expandTab.addEventListener('click', () => {
    detailPanel.classList.remove('panel-collapsed');
    expandTab.classList.add('hidden');
  });

  // MODIFIED: 音景开关按钮
  const toggleAudioBtn = document.getElementById('toggle-audio-btn');
  const audioIcon = document.getElementById('audio-icon');
  const audioLabel = document.getElementById('audio-label');
  // MODIFIED: 音频开关点击时保留当前神祇的专属音景名称
  toggleAudioBtn.addEventListener('click', () => {
    const on = eldritchAudio.toggle();
    audioIcon.textContent = on ? '🔊' : '🔇';
    const currentPrefix = audioLabel.textContent.split(':')[0] || '深渊音景';
    audioLabel.textContent = `${currentPrefix}: ${on ? '聆听中' : '静音'}`;
    toggleAudioBtn.classList.toggle('border-amber-400', on);
  });

  // 观测室相机拖拽、缩放与长按凝视
  let holdTimer = null;
  let dragOriginX = 0;
  let dragOriginY = 0;
  const startGaze = () => {
    if (AppState.viewMode !== "OBSERVE") return;
    AppState.isGazing = true;
    document.body.classList.add('gaze-shaking');
  };
  const stopGaze = () => {
    AppState.isGazing = false;
    document.body.classList.remove('gaze-shaking');
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  };

  document.getElementById('gaze-abyss-btn').addEventListener('pointerdown', (e) => { e.stopPropagation(); startGaze(); });
  viewportContainer.addEventListener('pointerdown', (e) => {
    if (AppState.viewMode !== "OBSERVE") return;
    AppState.isDragging = true;
    AppState.lastMouseX = e.clientX;
    AppState.lastMouseY = e.clientY;
    dragOriginX = e.clientX;
    dragOriginY = e.clientY;
    holdTimer = setTimeout(startGaze, 200);
  });

  window.addEventListener('pointermove', (e) => {
    AppState.mouseOffset[0] = (e.clientX / window.innerWidth) * 2.0 - 1.0;
    AppState.mouseOffset[1] = -((e.clientY / window.innerHeight) * 2.0 - 1.0);
    if (!AppState.isDragging || AppState.viewMode !== "OBSERVE") return;
    // 拖拽位移超过 6px 视为旋转视角，取消长按凝视计时避免误触掉 SAN
    if (Math.hypot(e.clientX - dragOriginX, e.clientY - dragOriginY) > 6 && holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    AppState.camTheta -= (e.clientX - AppState.lastMouseX) * 0.0065;
    AppState.camPhi = Math.max(0.2, Math.min(Math.PI - 0.2, AppState.camPhi - (e.clientY - AppState.lastMouseY) * 0.0065));
    AppState.lastMouseX = e.clientX;
    AppState.lastMouseY = e.clientY;
  });

  window.addEventListener('pointerup', () => { AppState.isDragging = false; stopGaze(); });
  window.addEventListener('pointercancel', () => { AppState.isDragging = false; stopGaze(); });
  viewportContainer.addEventListener('wheel', (e) => {
    if (AppState.viewMode !== "OBSERVE") return;
    e.preventDefault();
    AppState.camRadius = Math.max(2.6, Math.min(8.5, AppState.camRadius + e.deltaY * 0.0035));
  }, { passive: false });

  // ESC：观测室返回图鉴 / 关闭警告弹窗
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!glitchModal.classList.contains('hidden')) {
      glitchModal.classList.add('hidden');
      glitchModal.classList.remove('flex');
    } else if (AppState.viewMode === 'OBSERVE') {
      returnToArchiveHall();
    }
  });
}

// 后台静默为每个已觉醒实体渲染一帧并截取预览图，随后恢复默认选中项（大厅期间不持续渲染）
async function captureImplementedPreviews(captureFn) {
  const originalId = AppState.selectedCreatureId;
  for (const creature of CTHULHU_CODEX_DATA) {
    if (!creature.implemented) continue;
    AppState.selectedCreatureId = creature.id;
    renderSingleFrame(0.016);
    const url = await captureFn();
    AppState.previewDataUrls[creature.id] = url;
  }
  AppState.selectedCreatureId = originalId;
}

async function initWebGPUAndStart() {
  setupInteractions();
  const gpuStatusBadge = document.getElementById('gpu-status-badge');
  const fallbackBanner = document.getElementById('webgpu-fallback-banner');

  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) throw new Error('No WebGPU adapter');
      const device = await adapter.requestDevice();
      const context = webgpuCanvas.getContext('webgpu');
      const format = navigator.gpu.getPreferredCanvasFormat();

      gpuDevice = device;
      gpuContext = context;
      gpuFormat = format;

      const resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // MODIFIED: 优化 2 — 渲染分辨率按 INTERNAL_RENDER_SCALE 缩小，CSS 负责放大铺满
        webgpuCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr * INTERNAL_RENDER_SCALE));
        webgpuCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr * INTERNAL_RENDER_SCALE));
        // COPY_SRC 使首帧纹理可被回读截取
        context.configure({
          device,
          format,
          alphaMode: 'premultiplied',
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      const azathothRenderer = new AzathothRenderer(device, context, format);
      await azathothRenderer.init();
      registry.register("1-1", azathothRenderer);

      const yogSothothRenderer = new YogSothothRenderer(device, context, format);
      await yogSothothRenderer.init();
      registry.register("1-2", yogSothothRenderer);

      const shubNiggurathRenderer = new ShubNiggurathRenderer(device, context, format);
      await shubNiggurathRenderer.init();
      registry.register("1-3", shubNiggurathRenderer);

      const nyarlathotepRenderer = new NyarlathotepRenderer(device, context, format);
      await nyarlathotepRenderer.init();
      registry.register("1-4", nyarlathotepRenderer);

      // MODIFIED: 初始化并注册 1-5 图尔兹查渲染器
      const tulzschaRenderer = new TulzschaRenderer(device, context, format);
      await tulzschaRenderer.init();
      registry.register("1-5", tulzschaRenderer);

      // MODIFIED: 初始化并注册 1-6 阿布霍斯渲染器
      const abhothRenderer = new AbhothRenderer(device, context, format);
      await abhothRenderer.init();
      registry.register("1-6", abhothRenderer);

      // MODIFIED: 初始化并注册 1-7 格赫罗斯渲染器（外神七柱全数接入）
      const ghrothRenderer = new GhrothRenderer(device, context, format);
      await ghrothRenderer.init();
      registry.register("1-7", ghrothRenderer);

      // MODIFIED: 初始化并注册 2-1 克苏鲁渲染器（旧日支配者首柱）
      const cthulhuRenderer = new CthulhuRenderer(device, context, format);
      await cthulhuRenderer.init();
      registry.register("2-1", cthulhuRenderer);

      // MODIFIED: 初始化并注册 2-2 哈斯塔渲染器
      const hasturRenderer = new HasturRenderer(device, context, format);
      await hasturRenderer.init();
      registry.register("2-2", hasturRenderer);

      // MODIFIED: 初始化并注册 2-3 达贡渲染器（深海海潮祭坛）
      const dagonRenderer = new DagonRenderer(device, context, format);
      await dagonRenderer.init();
      registry.register("2-3", dagonRenderer);

      // MODIFIED: 初始化并注册 2-4 伊格渲染器（羽蛇神殿）
      const yigRenderer = new YigRenderer(device, context, format);
      await yigRenderer.init();
      registry.register("2-4", yigRenderer);

      // MODIFIED: 初始化并注册 2-5 撒托古亚渲染器（恩开伊地穴）
      const tsathogguaRenderer = new TsathogguaRenderer(device, context, format);
      await tsathogguaRenderer.init();
      registry.register("2-5", tsathogguaRenderer);
      isUsingWebGPU = true;

      // 在后台静默为每个已觉醒实体渲染首帧并截取预览图，随后进入 STANDBY 休眠省显卡
      await captureImplementedPreviews(() =>
        captureWebGPUPreview(device, context, format, webgpuCanvas));
    } catch (err) {
      console.warn('WebGPU 初始化失败，启用 Canvas 2D 应急渲染：', err);
      isUsingWebGPU = false;
      webgpuCanvas.classList.add('hidden');
      fallbackCanvas.classList.remove('hidden');
      fallbackBanner.classList.remove('hidden');
      fallbackRenderer = new FallbackCanvas2DRenderer(fallbackCanvas);
      await captureImplementedPreviews(() => captureFallbackPreview(fallbackCanvas));
    }
  } else {
    isUsingWebGPU = false;
    webgpuCanvas.classList.add('hidden');
    fallbackCanvas.classList.remove('hidden');
    fallbackBanner.classList.remove('hidden');
    fallbackRenderer = new FallbackCanvas2DRenderer(fallbackCanvas);
    await captureImplementedPreviews(() => captureFallbackPreview(fallbackCanvas));
  }

  renderCategoryTabs();
  renderArchiveGrid();
  requestAnimationFrame(mainLoop);
}

function mainLoop(now) {
  const dt = Math.min(0.1, (now - AppState.lastFrameTime) * 0.001);
  AppState.lastFrameTime = now;

  // 只有在点开进入全屏 3D 观测室（viewMode === "OBSERVE"）时才推进 WebGPU 管线
  if (AppState.viewMode === "OBSERVE" && !AppState.isPausedOrBlurred) {
    AppState.fps = Math.round(AppState.fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1);
    fpsCounter.textContent = `${AppState.fps} FPS`;

    if (AppState.isGazing) {
      AppState.gazeIntensity = Math.min(1.0, AppState.gazeIntensity + dt * 1.35);
      AppState.sanity = Math.max(1, AppState.sanity - dt * 14.0);
      updateSanityUI();
    } else {
      AppState.gazeIntensity = Math.max(0.0, AppState.gazeIntensity - dt * 1.8);
      if (AppState.sanity < 96) {
        AppState.sanity = Math.min(96, AppState.sanity + dt * 2.5);
        updateSanityUI();
      }
    }

    madnessCrimsonOverlay.style.opacity = (AppState.gazeIntensity * 0.85).toFixed(2);
    // MODIFIED: 保持长达数小时的连续非周期演化，同时防止单精度浮点时间溢出
    AppState.accumulatedTime = (AppState.accumulatedTime + dt) % 36000.0;
    if (!AppState.isDragging) AppState.camTheta += dt * 0.12;

    renderSingleFrame(dt);
    eldritchAudio.updateFromGPUState(AppState);
  }

  requestAnimationFrame(mainLoop);
}

window.onload = initWebGPUAndStart;

