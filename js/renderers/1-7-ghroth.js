// MODIFIED: 新增 1-7 格赫罗斯（毁灭之先驱、审判之星、群星唤醒者）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const GHROTH_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  // 格赫罗斯审判天体 SDF：vec2(最近距离, 材质ID: 0=锈铁大陆地壳, 1=裂谷深处赤红审判独眼)
  fn mapGhroth(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.75 + u.gazeIntensity * 1.25);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.7);

    // 无理数准周期天体自转与裂谷开合节律
    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    // 1. 内部光滑的赤红审判独眼球核（半径 1.24，位于地壳裂谷之内）
    let eyeRadius = 1.24 + 0.04 * sin(t2 * 1.8) + 0.06 * u.gazeIntensity;
    let dEyeSphere = length(pos) - eyeRadius;

    // 2. 外部锈铁天体地壳（半径 1.42），赤道被大陆尺度裂谷上下撕开
    var pCrust = pos;
    let tiltAngle = 0.22 * sin(t1 * 0.31) + 0.14 * cos(t3 * 0.23);
    let rXY = rot2D(tiltAngle) * pCrust.xy;
    pCrust.x = rXY.x;
    pCrust.y = rXY.y;

    // 裂谷开合宽度：随无理数呼吸波动，长按凝视时裂谷完全怒睁
    let lidBase = 0.24 + 0.14 * sin(t * 0.61803) + 0.08 * cos(t * 1.41421);
    let lidOpening = clamp(lidBase + u.gazeIntensity * 0.48, 0.08, 0.88);
    // 裂谷呈杏仁状眼睑轮廓（正面宽、两侧收窄）
    let horizontalTaper = smoothstep(1.35, 0.0, abs(pCrust.x)) * smoothstep(-0.2, 0.6, pCrust.z);
    let riftHalfHeight = lidOpening * horizontalTaper + 0.03 * sin(pCrust.x * 7.0 + t1);

    // 雕刻地壳表面陨石坑、铁海平原与锯齿状裂谷边缘
    let crustNoise = fbm3(pCrust * 2.3 + vec3<f32>(t * 0.05, -t * 0.03, t * 0.04));
    let crater = abs(sin(pCrust.x * 4.5) * cos(pCrust.y * 4.5) * sin(pCrust.z * 4.5));
    var dCrust = length(pos) - (1.42 + (crustNoise - 0.45) * 0.16 * entropy - crater * 0.05);

    // 用布尔差集从正面地壳中挖出赤道大陆裂谷，暴露出内部的赤红独眼
    let dRiftCut = riftHalfHeight - abs(pCrust.y + sin(pCrust.x * 3.5 + t2) * 0.04);
    dCrust = max(dCrust, dRiftCut);

    // 3. 天体赤道外围倾斜旋转的破碎铁陨石小行星带（Gravitational Debris Ring）
    var ringP = pos;
    let rRing1 = rot2D(0.42 + sin(t1 * 0.15) * 0.08) * ringP.xy;
    ringP.x = rRing1.x; ringP.y = rRing1.y;
    let rRing2 = rot2D(t * 0.19) * ringP.xz;
    ringP.x = rRing2.x; ringP.z = rRing2.y;
    let ringChunks = sin(atan2(ringP.z, ringP.x) * 14.0 + t2) * cos(length(ringP.xz) * 9.0);
    let dRing = length(vec2<f32>(length(ringP.xz) - 2.35, ringP.y)) - (0.045 + 0.025 * ringChunks);

    let dTerrain = min(dCrust, dRing);

    if (dEyeSphere < dTerrain) {
      return vec2<f32>(dEyeSphere * 0.68, 1.0);
    }
    return vec2<f32>(dTerrain * 0.68, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapGhroth(p + e.xyy).x +
      e.yyx * mapGhroth(p + e.yyx).x +
      e.yxy * mapGhroth(p + e.yxy).x +
      e.xxx * mapGhroth(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    let r2 = dot(uv, uv);

    // 苍穹魔音引力波空间涟漪（同心圆引力波扭曲背景星空与视野）
    let gravWave = sin(sqrt(r2) * 18.0 - u.time * 4.2) * 0.012 * (0.35 + u.gazeIntensity * 1.45) * exp(-r2 * 0.85);
    uv += normalize(uv + vec2<f32>(0.0001)) * gravWave;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.32) * camFwd);

    // 深空星空与铁锈星云背景
    let starSeed = fract(sin(dot(floor(rd * 190.0), vec3<f32>(12.9898, 78.233, 37.719))) * 43758.5453);
    let stars = smoothstep(0.992, 1.0, starSeed) * (0.5 + 0.5 * sin(u.time * 2.5 + starSeed * 40.0));
    let nebula = fbm3(rd * 3.2 + vec3<f32>(u.time * 0.02));
    let bgVoid = mix(vec3<f32>(0.010, 0.006, 0.008), vec3<f32>(0.055, 0.014, 0.016), nebula) + vec3<f32>(1.0, 0.85, 0.75) * stars * 0.6;
    var col = bgVoid;

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
    var crimsonHalo = vec3<f32>(0.0);

    for (var i = 0; i < 64; i = i + 1) {
      let p = ro + rd * t;
      let res = mapGhroth(p);
      let d = res.x;
      matId = res.y;

      // 天体大气与苍穹魔音赤红引力辉光
      let atten = 1.0 / (1.0 + d * d * 22.0);
      let wavePulse = 0.5 + 0.5 * sin(length(p) * 5.5 - u.time * 4.0);
      let haloCol = mix(
        vec3<f32>(0.68, 0.16, 0.08), // 锈铁红晕
        vec3<f32>(0.95, 0.45, 0.14), // 审判熔岩金光
        wavePulse
      );
      crimsonHalo += haloCol * atten * 0.013 * u.glowScale * (1.0 + u.gazeIntensity * 0.9);

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
      let lightDir = normalize(vec3<f32>(2.0, 2.6, 2.8));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);

      if (matId > 0.5) {
        // 材质 1：裂谷深处的硕大赤红审判独眼（瞳孔随鼠标移动追踪观测者）
        let gazeTarget = normalize(vec3<f32>(u.mouseOffset.x * 0.55, u.mouseOffset.y * 0.45, 1.0));
        let pNorm = normalize(p);
        let angularDist = acos(clamp(dot(pNorm, gazeTarget), -1.0, 1.0));

        // 瞳孔收缩（凝视时竖瞳/奇点瞳孔剧烈收缩并燃起金红烈焰）
        let pupilRadius = 0.22 - u.gazeIntensity * 0.08 + 0.02 * sin(u.time * 4.5);
        let irisRadius = 0.56;

        // 虹膜放射状熔岩血管纤维
        let irisAngle = atan2(pNorm.y - gazeTarget.y, pNorm.x - gazeTarget.x);
        let irisFibers = fbm3(vec3<f32>(cos(irisAngle) * 6.0, sin(irisAngle) * 6.0, angularDist * 14.0 - u.time * 1.4));

        let scleraCol = vec3<f32>(0.55, 0.04, 0.06) * (0.7 + 0.3 * irisFibers); // 充血赤红巩膜
        let irisCol = mix(vec3<f32>(0.92, 0.18, 0.08), vec3<f32>(1.0, 0.72, 0.18), irisFibers) * 1.45;
        let pupilCol = vec3<f32>(0.02, 0.005, 0.01);

        var eyeAlbedo = mix(irisCol, scleraCol, smoothstep(irisRadius - 0.06, irisRadius + 0.08, angularDist));
        eyeAlbedo = mix(pupilCol, eyeAlbedo, smoothstep(pupilRadius - 0.02, pupilRadius + 0.02, angularDist));

        let corneaSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 80.0);
        col = eyeAlbedo * (0.65 + 0.45 * diff) + vec3<f32>(1.0, 0.85, 0.7) * corneaSpec * 0.9 + vec3<f32>(1.0, 0.25, 0.1) * fresnel * 0.6;
      } else {
        // 材质 0：锈红色天体地壳（酸化铁红、暗褐陨铁与裂谷边缘熔岩余烬）
        let crustTex = fbm3(p * 3.8);
        let rustRed = vec3<f32>(0.36, 0.09, 0.06);
        let darkIron = vec3<f32>(0.11, 0.07, 0.08);
        let emberGold = vec3<f32>(0.85, 0.38, 0.10);

        var albedo = mix(darkIron, rustRed, smoothstep(0.25, 0.75, crustTex));
        // 靠近赤道裂谷边缘的地壳被独眼热量烤成暗金熔岩色
        let riftHeat = exp(-abs(p.y) * 4.5) * smoothstep(-0.2, 0.8, p.z);
        albedo = mix(albedo, emberGold * 1.3, riftHeat * 0.65);

        let rimCol = vec3<f32>(0.88, 0.32, 0.16) * fresnel * 0.85;
        col = albedo * (diff * 0.88 + 0.14) + rimCol;
      }

      let fog = exp(-0.038 * t * t);
      col = mix(bgVoid, col, fog);
    }

    col += crimsonHalo;
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
      let caOffset = uv * (0.022 * u.gazeIntensity * length(uv));
      finalColor.r = mix(finalColor.r, renderScene(uv + caOffset, ro, camRight, camUp, camFwd).r, 0.82);
      finalColor.b = mix(finalColor.b, renderScene(uv - caOffset, ro, camRight, camUp, camFwd).b, 0.82);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.25, 1.0, vignette);
    }

    let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
    finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

    return vec4<f32>(finalColor, 1.0);
  }
`;

// 苍穹魔音引力波驻波尘埃环 Compute Shader
const GHROTH_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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
    var phase = p.pos.w;
    let seed = p.vel.w;

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.9 + params.gazeIntensity * 1.9) * params.entropyScale;
    let t = params.time;

    // 70% 粒子构成倾斜陨石尘埃环，30% 粒子作为向外扩散的苍穹引力波驻波球壳
    let isWaveShell = seed > 0.70;
    var newPos = vec3<f32>(0.0);

    if (isWaveShell) {
      phase = fract(phase + dt * 0.32);
      let shellR = 1.65 + phase * 3.8;
      let theta = seed * 62.8318 + t * 0.414;
      let phi = acos(2.0 * fract(seed * 17.31) - 1.0);
      // 声波驻波振幅调制
      let harmonic = 1.0 + 0.08 * sin(theta * 6.0 + t * 4.0) * sin(phi * 5.0);
      newPos = vec3<f32>(
        sin(phi) * cos(theta),
        cos(phi),
        sin(phi) * sin(theta)
      ) * (shellR * harmonic);
    } else {
      phase += dt * (0.65 / max(0.5, fract(seed * 3.7)));
      let ringR = 1.85 + fract(seed * 11.7) * 1.45;
      let ang = phase + seed * 6.28318;
      let ySpread = (fract(seed * 29.3) - 0.5) * 0.14;
      // 倾斜天体光环平面
      let rawX = cos(ang) * ringR;
      let rawZ = sin(ang) * ringR;
      let tilt = 0.42 + sin(t * 0.212) * 0.08;
      newPos = vec3<f32>(
        rawX * cos(tilt) - ySpread * sin(tilt),
        rawX * sin(tilt) + ySpread * cos(tilt),
        rawZ
      );
    }

    let vel = (newPos - p.pos.xyz) / max(dt, 0.001);
    p.pos = vec4<f32>(newPos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 锈铁陨石尘与审判金红引力波粒子渲染着色器
const GHROTH_PARTICLE_RENDER_WGSL = /* wgsl */`
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

    let isWaveShell = seed > 0.70;
    let size = (select(0.011 + 0.012 * fract(seed * 13.1), 0.015, isWaveShell)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.32;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 锈铁暗红、熔岩审判金与苍穹电波白配色
    let cRustRed = vec3<f32>(0.88, 0.22, 0.12);
    let cJudgmentGold = vec3<f32>(0.98, 0.65, 0.22);
    let cSignalWhite = vec3<f32>(1.0, 0.88, 0.75);

    var col = mix(cRustRed, cJudgmentGold, fract(seed * 5.3));
    if (isWaveShell) {
      col = mix(cJudgmentGold, cSignalWhite, 0.5 + 0.5 * sin(phase * 12.0));
    }

    out.color = col * u.glowScale;
    out.alpha = select(0.65, sin(phase * 3.14159) * 0.55, isWaveShell);
    return out;
  }

  @fragment
  fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
    let r2 = dot(in.localUV, in.localUV);
    if (r2 > 1.0) {
      discard;
    }
    let glow = exp(-r2 * 3.5);
    return vec4<f32>(in.color * glow, in.alpha * glow);
  }
`;

export class GhrothRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: GHROTH_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: GHROTH_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: GHROTH_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.010, g: 0.006, b: 0.008, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 1.85 + Math.random() * 1.45;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 0.2;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random();
          data[base + 7] = seed;
        }
      }
    });
  }
}