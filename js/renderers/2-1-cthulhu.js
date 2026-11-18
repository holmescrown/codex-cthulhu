// MODIFIED: 新增 2-1 克苏鲁（沉睡之神、拉莱耶之主、深海的伟大祭司）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const CTHULHU_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  // 有向长方体距离场（用于构建非欧拉莱耶玄武岩巨石阵）
  fn sdBox(p : vec3<f32>, b : vec3<f32>) -> f32 {
    let q = abs(p) - b;
    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  // 克苏鲁与拉莱耶沉没巨石阵 SDF：vec2(最近距离, 材质ID: 0=深海黏液鳞甲躯体, 1=发光眼眸与拉莱耶符文, 2=玄武岩非欧巨石)
  fn mapCthulhu(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.75 + u.gazeIntensity * 1.3);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.65);

    // 无理数准周期深海呼吸节律
    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    // 整体随深海暗流缓慢沉浮
    let floatY = 0.08 * sin(t1 * 0.65) + 0.05 * cos(t2 * 0.45);
    var p = pos - vec3<f32>(0.0, floatY, 0.0);

    // 1. 巨像躯干与肩膀（宽阔厚重的泰坦胸膛 + 鳞片肌理）
    var torsoP = p - vec3<f32>(0.0, -0.45, -0.08);
    torsoP.x *= 0.82;
    torsoP.z *= 1.15;
    var dBody = length(torsoP) - (0.92 + 0.04 * sin(t1 * 1.1));

    // 双肩与粗壮上臂轮廓
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      let shoulderPos = vec3<f32>(fs * 0.88, -0.25, -0.05);
      let armEnd = vec3<f32>(fs * 1.25, -1.35 + 0.08 * sin(t2 + fs), 0.25);
      let pa = p - shoulderPos;
      let ba = armEnd - shoulderPos;
      let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      let dArm = length(pa - ba * h) - mix(0.32, 0.22, h);
      dBody = smin(dBody, dArm, 0.28);
    }

    // 2. 章鱼状球根头颅（Bulbous Cephalopod Head）
    var headP = p - vec3<f32>(0.0, 0.62, 0.08);
    headP.y *= 0.85;
    headP.z *= 0.92;
    let dHead = length(headP) - 0.56;
    dBody = smin(dBody, dHead, 0.24);

    // 3. 8 条招牌式章鱼面部口须（Facial Tentacles，无理数异步波浪蠕动）
    for (var k = 0; k < 8; k = k + 1) {
      let fk = f32(k);
      let normIdx = (fk - 3.5) / 3.5; // -1 .. +1 左右对称分布
      var tp = p - vec3<f32>(normIdx * 0.34, 0.34, 0.42);

      let spreadX = normIdx * (0.28 + 0.12 * abs(normIdx));
      let downY = clamp(-tp.y / 1.45, 0.0, 1.0);
      let waveX = spreadX * downY * 1.4 + sin(downY * 4.5 - t1 * 1.6 + fk * 1.3) * (0.14 + 0.08 * u.gazeIntensity);
      let waveZ = 0.18 * sin(downY * 3.2) + cos(downY * 4.2 - t2 * 1.4 + fk * 1.7) * 0.15;
      let tentRad = max(0.016, 0.095 * (1.0 - downY * 0.72));

      let dTent = length(vec2<f32>(tp.x - waveX, tp.z - waveZ)) - tentRad;
      let tentMask = max(dTent, max(tp.y - 0.05, -tp.y - 1.45));
      dBody = smin(dBody, tentMask, 0.14);
    }

    // 4. 背部一对退化却依然遮天蔽日的蝙蝠状龙翼（Bat-like Wings）
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      var wp = p - vec3<f32>(fs * 0.45, 0.15, -0.45);
      // 翼骨随深海呼吸缓缓扇动
      let flap = 0.28 + 0.12 * sin(t2 * 0.85) + 0.22 * u.gazeIntensity;
      let rXZ = rot2D(-fs * (0.55 + flap)) * wp.xz;
      wp.x = rXZ.x; wp.z = rXZ.y;
      let rXY = rot2D(fs * 0.32) * wp.xy;
      wp.x = rXY.x; wp.y = rXY.y;

      // 翼膜薄片 + 翼骨肋条
      let wingSpan = clamp(fs * wp.x, 0.0, 1.95);
      let wingHeight = 1.15 * sin(clamp(wingSpan / 1.95, 0.0, 1.0) * 2.6 + 0.35);
      let dWingMembrane = sdBox(wp - vec3<f32>(fs * 0.95, 0.15, 0.0), vec3<f32>(0.95, wingHeight * 0.55, 0.025));
      dBody = smin(dBody, dWingMembrane, 0.18);
    }

    // 叠加深海黏液鳞片与肌理起伏
    let scaleNoise = fbm3(p * 3.6 + vec3<f32>(0.0, -t * 0.12, 0.0));
    let scales = abs(sin(p.x * 16.0) * cos(p.y * 16.0) * sin(p.z * 16.0)) * 0.018;
    dBody += (scaleNoise - 0.48) * 0.12 * entropy - scales;

    // 5. 四只狭长邪恶的深海磷光复眼（位于章鱼头颅两侧）
    var dEyes = 100.0;
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      let eyePos1 = vec3<f32>(fs * 0.32, 0.66, 0.46);
      let eyePos2 = vec3<f32>(fs * 0.40, 0.54, 0.40);
      // 凝视时眼睑完全张开，平时处于半睡半醒的狭缝状态
      let lidSquint = mix(1.9, 1.0, u.gazeIntensity);
      let e1 = length((p - eyePos1) * vec3<f32>(1.0, lidSquint, 1.2)) - 0.075;
      let e2 = length((p - eyePos2) * vec3<f32>(1.1, lidSquint * 1.1, 1.2)) - 0.055;
      dEyes = min(dEyes, min(e1, e2));
    }

    // 6. 下方非欧几里得拉莱耶玄武岩巨石阵（违背直角的倾斜黑石柱）
    var dMonoliths = 100.0;
    for (var m = 0; m < 6; m = m + 1) {
      let fm = f32(m);
      let mAng = fm * 1.047197 + 0.35;
      let mDist = 1.65 + 0.45 * sin(fm * 2.3);
      var mp = pos - vec3<f32>(cos(mAng) * mDist, -1.65, sin(mAng) * mDist);
      // 非欧锐角倾斜
      let rTilt1 = rot2D(0.28 * sin(fm * 1.9 + 0.5) + u.gazeIntensity * 0.15 * sin(t3 + fm)) * mp.xy;
      mp.x = rTilt1.x; mp.y = rTilt1.y;
      let rTilt2 = rot2D(0.24 * cos(fm * 2.1)) * mp.yz;
      mp.y = rTilt2.x; mp.z = rTilt2.y;

      let pillar = sdBox(mp, vec3<f32>(0.24, 1.15 + 0.35 * fract(fm * 0.618), 0.24));
      dMonoliths = min(dMonoliths, pillar);
    }

    if (dEyes < dBody && dEyes < dMonoliths) {
      return vec2<f32>(dEyes * 0.65, 1.0);
    }
    if (dMonoliths < dBody) {
      return vec2<f32>(dMonoliths * 0.65, 2.0);
    }
    return vec2<f32>(dBody * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapCthulhu(p + e.xyy).x +
      e.yyx * mapCthulhu(p + e.yyx).x +
      e.yxy * mapCthulhu(p + e.yxy).x +
      e.xxx * mapCthulhu(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    // 深海高压水波折射与梦讯空间扭曲
    let wave = sin(uv.y * 9.0 + u.time * 1.8) * 0.008 * (1.0 + u.gazeIntensity * 3.5);
    uv.x += wave;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

    // 南太平洋万米深海幽暗水体背景（深海墨蓝绿 + 顶部微弱水下丁达尔冷光）
    let waterGrad = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    let caustics = fbm3(rd * 4.5 + vec3<f32>(u.time * 0.08, -u.time * 0.12, 0.0));
    let bgAbyss = mix(vec3<f32>(0.004, 0.012, 0.016), vec3<f32>(0.014, 0.048, 0.052), waterGrad * 0.7 + caustics * 0.3);
    var col = bgAbyss;

    // MODIFIED: Bounding Sphere Early-Exit (R=3.5) - skip empty space, 0 raymarch steps
    let maxDist = 14.0;
    let bSphere = dot(ro, rd);
    let cSphere = dot(ro, ro) - 12.25;
    let hSphere = bSphere * bSphere - cSphere;
    if (hSphere < 0.0) {
      return vec4<f32>(col, maxDist);
    }
    var t = max(0.1, -bSphere - sqrt(hSphere));
    let tEnd = min(14.0, -bSphere + sqrt(hSphere));
    var hit = false;
    var matId = 0.0;
    var dreamGlow = vec3<f32>(0.0);

    for (var i = 0; i < 64; i = i + 1) {
      let p = ro + rd * t;
      let res = mapCthulhu(p);
      let d = res.x;
      matId = res.y;

      // 拉莱耶深海磷光与梦讯脉冲光晕
      let atten = 1.0 / (1.0 + d * d * 24.0);
      let pulse = 0.5 + 0.5 * sin(length(p) * 3.5 - u.time * 2.2);
      let glowCol = mix(
        vec3<f32>(0.04, 0.42, 0.38), // 深海幽蓝绿水雾
        vec3<f32>(0.45, 0.85, 0.25), // 梦讯邪恶磷绿光
        pulse * (0.4 + 0.6 * u.gazeIntensity)
      );
      dreamGlow += glowCol * atten * 0.011 * u.glowScale;

      if (d < 0.002) {
        hit = true;
        break;
      }
      if (t > tEnd) {
        break;
      }
      t += max(d, 0.012);
    }

    if (hit) {
      let p = ro + rd * t;
      let n = calcNormal(p);
      let v = -rd;
      let lightDir = normalize(vec3<f32>(0.8, 3.5, 1.8)); // 来自海面上方的幽冷天光
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);

      if (matId > 1.5) {
        // 材质 2：非欧拉莱耶玄武岩巨石 + 发光的古神蚀刻符文
        let stoneNoise = fbm3(p * 4.2);
        let basalt = mix(vec3<f32>(0.02, 0.032, 0.036), vec3<f32>(0.06, 0.09, 0.095), stoneNoise);
        let runePattern = smoothstep(0.92, 0.98, sin(p.y * 14.0 + sin(p.x * 8.0)) * cos(p.z * 14.0));
        let runeGlow = vec3<f32>(0.18, 0.92, 0.62) * runePattern * (0.55 + 0.95 * u.gazeIntensity);
        col = basalt * (diff * 0.85 + 0.18) + runeGlow + vec3<f32>(0.15, 0.45, 0.48) * fresnel * 0.5;
      } else if (matId > 0.5) {
        // 材质 1：克苏鲁苏醒的磷光黄绿巨眼
        let eyePulse = 1.35 + 0.85 * u.gazeIntensity + 0.25 * sin(u.time * 4.0);
        col = vec3<f32>(0.78, 0.96, 0.22) * eyePulse;
      } else {
        // 材质 0：湿滑深海暗绿鳞甲躯体（湿润高光 + 深海次表面散射）
        let skinNoise = fbm3(p * 3.0);
        let deepScaleGreen = vec3<f32>(0.035, 0.11, 0.095);
        let abyssTeal = vec3<f32>(0.08, 0.24, 0.19);
        let wetSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 56.0);

        var albedo = mix(deepScaleGreen, abyssTeal, smoothstep(0.25, 0.78, skinNoise));
        let rimCol = vec3<f32>(0.16, 0.68, 0.58) * fresnel * 0.95;
        col = albedo * (diff * 0.88 + 0.16) + rimCol + vec3<f32>(0.65, 0.92, 0.88) * wetSpec * 0.65;
      }

      // 深海距离雾融合
      let fog = exp(-0.042 * t * t);
      col = mix(bgAbyss, col, fog);
    }

    col += dreamGlow;
    return vec4<f32>(col, select(maxDist, t, hit));
  }

  @fragment
  fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
    let aspect = u.resolution.x / max(u.resolution.y, 1.0);
    let uv = vec2<f32>(in.uv.x * aspect, in.uv.y);

    let ro = u.camPos + vec3<f32>(u.mouseOffset.x * 0.35, u.mouseOffset.y * 0.35, 0.0);
    let camFwd = normalize(u.camTarget - ro);
    let camRight = normalize(cross(camFwd, vec3<f32>(0.0, 1.0, 0.0)));
    let camUp = cross(camRight, camFwd);

    let mainSample = renderScene(uv, ro, camRight, camUp, camFwd);
    var finalColor = mainSample.rgb;

    if (u.gazeIntensity > 0.02) {
      let caOffset = uv * (0.018 * u.gazeIntensity * length(uv));
      finalColor.r = mix(finalColor.r, renderScene(uv + caOffset, ro, camRight, camUp, camFwd).r, 0.78);
      finalColor.b = mix(finalColor.b, renderScene(uv - caOffset, ro, camRight, camUp, camFwd).b, 0.78);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.28, 1.0, vignette);
    }

    let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
    finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

    return vec4<f32>(finalColor, 1.0);
  }
`;

// 深海生物荧光浮游微粒、上浮气泡与梦讯波纹 Compute Shader
const CTHULHU_PARTICLE_COMPUTE_WGSL = /* wgsl */`
  struct Particle {
    pos : vec4<f32>,
    vel : vec4<f32>,
  };

  struct SimParams {
    deltaTime : f32,
    time : f32,
    gazeIntensity : f32,
    entropyScale : f32,
  };

  @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
  @group(0) @binding(1) var<uniform> params : SimParams;

  @compute @workgroup_size(64)
  fn cs_main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let idx = gid.x;
    if (idx >= 6144u) {
      return;
    }

    var p = particles[idx];
    var pos = p.pos.xyz;
    var phase = p.pos.w;
    let seed = p.vel.w;

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.85 + params.gazeIntensity * 1.8) * params.entropyScale;
    let t = params.time;

    // 缓缓上浮的深海热液气泡与暗流涡旋
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (0.55 / max(length(pos.xz), 0.5));
    let current = vec3<f32>(
      sin(pos.y * 2.4 + t * 1.414 + seed * 12.0) * 0.28,
      0.32 + 0.25 * fract(seed * 7.3),
      cos(pos.y * 2.4 - t * 1.618 + seed * 12.0) * 0.28
    );

    let vel = swirl + current;
    pos += vel * dt;
    phase += dt * 1.2;

    if (pos.y > 3.2 || length(pos.xz) > 4.6) {
      let ang = seed * 62.8318 + t * 1.732;
      let resetR = 0.75 + fract(seed * 19.1) * 2.9;
      pos = vec3<f32>(cos(ang) * resetR, -2.6 - fract(seed * 5.3) * 0.6, sin(ang) * resetR);
    }

    p.pos = vec4<f32>(pos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 深海青蓝生物荧光与梦讯磷绿微粒渲染着色器
const CTHULHU_PARTICLE_RENDER_WGSL = /* wgsl */`
  struct Particle {
    pos : vec4<f32>,
    vel : vec4<f32>,
  };

  struct RenderUniforms {
    resolution : vec2<f32>,
    time : f32,
    gazeIntensity : f32,
    camPos : vec3<f32>,
    entropyScale : f32,
    camTarget : vec3<f32>,
    glowScale : f32,
    mouseOffset : vec2<f32>,
    _pad0 : f32,
    _pad1 : f32,
  };

  @group(0) @binding(0) var<storage, read> particles : array<Particle>;
  @group(0) @binding(1) var<uniform> u : RenderUniforms;

  struct VSOut {
    @builtin(position) clipPos : vec4<f32>,
    @location(0) localUV : vec2<f32>,
    @location(1) color : vec3<f32>,
    @location(2) alpha : f32,
  };

  @vertex
  fn vs_main(
    @builtin(vertex_index) vid : u32,
    @builtin(instance_index) iid : u32
  ) -> VSOut {
    var quad = array<vec2<f32>, 6>(
      vec2<f32>(-1.0, -1.0),
      vec2<f32>( 1.0, -1.0),
      vec2<f32>(-1.0,  1.0),
      vec2<f32>(-1.0,  1.0),
      vec2<f32>( 1.0, -1.0),
      vec2<f32>( 1.0,  1.0)
    );

    let p = particles[iid];
    let worldPos = p.pos.xyz;
    let phase = p.pos.w;
    let seed = p.vel.w;

    let aspect = u.resolution.x / max(u.resolution.y, 1.0);
    let ro = u.camPos + vec3<f32>(u.mouseOffset.x * 0.35, u.mouseOffset.y * 0.35, 0.0);
    let camFwd = normalize(u.camTarget - ro);
    let camRight = normalize(cross(camFwd, vec3<f32>(0.0, 1.0, 0.0)));
    let camUp = cross(camRight, camFwd);

    let relPos = worldPos - ro;
    let zCam = dot(relPos, camFwd);

    var out : VSOut;
    if (zCam <= 0.15) {
      out.clipPos = vec4<f32>(0.0, 0.0, 2.0, 1.0);
      return out;
    }

    let size = ((0.011 + 0.014 * fract(seed * 15.7)) * (1.0 + u.gazeIntensity * 0.35)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.3;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 深海幽蓝荧光、古神符文青绿与苏醒黄绿眼眸光点
    let cAbyssCyan = vec3<f32>(0.12, 0.72, 0.85);
    let cRlyehTeal = vec3<f32>(0.15, 0.92, 0.58);
    let cAwakeLime = vec3<f32>(0.75, 0.96, 0.25);

    var col = mix(cAbyssCyan, cRlyehTeal, fract(seed * 3.9));
    col = mix(col, cAwakeLime, smoothstep(0.65, 1.0, fract(seed * 8.1) * (0.4 + 0.6 * u.gazeIntensity)));

    let pulse = 0.45 + 0.55 * sin(phase * 3.2 + seed * 16.0);
    out.color = col * u.glowScale * pulse;
    out.alpha = (0.35 + 0.45 * pulse) * smoothstep(3.2, -2.2, abs(worldPos.y));
    return out;
  }

  @fragment
  fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
    let r2 = dot(in.localUV, in.localUV);
    if (r2 > 1.0) {
      discard;
    }
    let glow = exp(-r2 * 3.4);
    return vec4<f32>(in.color * glow, in.alpha * glow);
  }
`;

export class CthulhuRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: CTHULHU_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: CTHULHU_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: CTHULHU_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.004, g: 0.012, b: 0.016, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.8 + Math.random() * 3.1;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 5.2;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}