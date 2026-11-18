// MODIFIED: 新增 2-3 达贡（深潜者之父、海底巨石之王）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const DAGON_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  fn sdBox(p : vec3<f32>, b : vec3<f32>) -> f32 {
    let q = abs(p) - b;
    return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  // 达贡与海底玄武岩神庙立柱 SDF：vec2(最近距离, 材质ID: 0=幽冷青铜鱼鳞躯干, 1=凸出死鱼巨眼与呼吸鳃裂, 2=雕刻玄武岩神庙)
  fn mapDagon(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.8 + u.gazeIntensity * 1.35);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.7);

    // 无理数准周期深海潮汐摆动
    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    let swayX = 0.08 * sin(t1 * 0.72);
    let hoverY = 0.07 * cos(t2 * 0.58);
    var p = pos - vec3<f32>(swayX, hoverY, 0.0);

    // 1. 流线型肌肉虬结的两栖鱼人巨神躯干
    var torsoP = p - vec3<f32>(0.0, -0.35, 0.0);
    torsoP.x *= 0.92;
    torsoP.z *= 1.18;
    var dBody = length(torsoP) - (0.86 + 0.04 * sin(t1 * 1.3));

    // 宽厚鱼人头颅与突出阔口下颚
    var headP = p - vec3<f32>(0.0, 0.68, 0.14);
    headP.x *= 1.05;
    headP.y *= 0.92;
    headP.z *= 0.82;
    let dHead = length(headP) - 0.52;
    // 突出鱼吻下颚
    let jawP = p - vec3<f32>(0.0, 0.46, 0.36);
    let dJaw = length(jawP * vec3<f32>(1.15, 1.8, 0.9)) - 0.32;
    dBody = smin(dBody, smin(dHead, dJaw, 0.16), 0.24);

    // 双侧带蹼利爪前臂（向外张开呈祭祀姿态）
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      let shPos = vec3<f32>(fs * 0.76, 0.05, 0.05);
      let elPos = vec3<f32>(fs * 1.28, -0.45 + 0.09 * sin(t2 + fs), 0.38);
      let pa = p - shPos;
      let ba = elPos - shPos;
      let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      let dArm = length(pa - ba * h) - mix(0.26, 0.16, h);
      dBody = smin(dBody, dArm, 0.22);
    }

    // 2. 背部与头顶高耸的锯齿状青铜骨质背鳍（Serrated Dorsal Fin Crest）
    var finP = p - vec3<f32>(0.0, 0.55, -0.38);
    let finRipple = sin(finP.y * 9.0 - t1 * 2.4) * 0.06;
    let finWidth = 0.028 + 0.015 * smoothstep(0.4, -0.2, finP.z);
    let finSpikes = 0.14 * max(0.0, sin(finP.y * 11.0 + 0.5));
    var dFin = sdBox(finP - vec3<f32>(finRipple, 0.0, -finSpikes * 0.5), vec3<f32>(finWidth, 1.05, 0.34 + finSpikes));
    dBody = smin(dBody, dFin, 0.12);

    // 叠加细密青铜鱼鳞浮雕纹理
    let scaleGrid = abs(sin(p.x * 22.0 + sin(p.y * 11.0)) * cos(p.y * 22.0) * sin(p.z * 22.0));
    let bodyNoise = fbm3(p * 3.2 + vec3<f32>(0.0, -t * 0.1, 0.0));
    dBody += (bodyNoise - 0.48) * 0.10 * entropy - scaleGrid * 0.022;

    // 3. 凸出的金色死鱼巨眼 + 颈部两侧搏动的猩红鳃裂（材质 1）
    var dOrgans = 100.0;
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      // 头部两侧凸出的死鱼巨眼
      let eyePos = vec3<f32>(fs * 0.42, 0.76, 0.32);
      let dEye = length(p - eyePos) - (0.115 + 0.015 * u.gazeIntensity);
      dOrgans = min(dOrgans, dEye);

      // 颈侧三道呼吸开合的发光鳃裂
      for (var g = 0; g < 3; g = g + 1) {
        let fg = f32(g);
        let gillPulse = 0.018 + 0.014 * sin(t3 * 1.8 - fg * 0.9) + 0.015 * u.gazeIntensity;
        let gillPos = vec3<f32>(fs * 0.54, 0.28 - fg * 0.12, 0.22 - fg * 0.03);
        let dGill = length((p - gillPos) * vec3<f32>(2.4, 1.0 / gillPulse * 0.03, 1.2)) - 0.065;
        dOrgans = min(dOrgans, dGill);
      }
    }

    // 4. 海底黑色玄武岩雕刻神庙立柱阵（环绕祭坛的半圆形巨石群，材质 2）
    var dTemple = 100.0;
    for (var m = 0; m < 5; m = m + 1) {
      let fm = f32(m);
      let ang = (fm - 2.0) * 0.68 + 3.14159; // 环绕在达贡后方与两侧
      let dist = 1.95;
      var mp = pos - vec3<f32>(sin(ang) * dist, -1.25, cos(ang) * dist);
      let rY = rot2D(-ang) * mp.xz;
      mp.x = rY.x; mp.z = rY.y;
      let pillarH = 1.65 - abs(fm - 2.0) * 0.18;
      let dCol = sdBox(mp, vec3<f32>(0.28, pillarH, 0.22));
      dTemple = min(dTemple, dCol);
    }
    // 底部祭坛石台
    let dAltarBase = sdBox(pos - vec3<f32>(0.0, -1.85, 0.0), vec3<f32>(2.6, 0.35, 2.6));
    dTemple = min(dTemple, dAltarBase);

    if (dOrgans < dBody && dOrgans < dTemple) {
      return vec2<f32>(dOrgans * 0.65, 1.0);
    }
    if (dTemple < dBody) {
      return vec2<f32>(dTemple * 0.65, 2.0);
    }
    return vec2<f32>(dBody * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapDagon(p + e.xyy).x +
      e.yyx * mapDagon(p + e.yyx).x +
      e.yxy * mapDagon(p + e.yxy).x +
      e.xxx * mapDagon(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    // 满月海潮水波波动折射
    uv.x += sin(uv.y * 10.0 - u.time * 2.1) * 0.007 * (1.0 + u.gazeIntensity * 3.2);

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

    // 满月冷光穿透深海的幽蓝银辉背景
    let moonBeam = pow(max(0.0, dot(rd, normalize(vec3<f32>(0.0, 0.85, -0.45)))), 6.0);
    let caustics = fbm3(rd * 4.2 + vec3<f32>(u.time * 0.07, -u.time * 0.1, 0.0));
    let bgSea = mix(vec3<f32>(0.005, 0.011, 0.018), vec3<f32>(0.022, 0.055, 0.072), caustics)
              + vec3<f32>(0.28, 0.45, 0.55) * moonBeam * (0.45 + 0.55 * u.gazeIntensity);
    var col = bgSea;

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
    var tidalHalo = vec3<f32>(0.0);

    for (var i = 0; i < 64; i = i + 1) {
      let p = ro + rd * t;
      let res = mapDagon(p);
      let d = res.x;
      matId = res.y;

      let atten = 1.0 / (1.0 + d * d * 24.0);
      let glowCol = mix(
        vec3<f32>(0.12, 0.52, 0.48), // 青铜海潮冷光
        vec3<f32>(0.85, 0.65, 0.22), // 满月献祭金辉
        0.5 + 0.5 * sin(p.y * 3.0 - u.time * 2.0)
      );
      tidalHalo += glowCol * atten * 0.011 * u.glowScale * (1.0 + u.gazeIntensity * 0.8);

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
      let lightDir = normalize(vec3<f32>(0.5, 3.6, 1.6));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);

      if (matId > 1.5) {
        // 材质 2：雕刻深潜者图腾的黑色玄武岩神庙巨石
        let stoneNoise = fbm3(p * 4.5);
        let basalt = mix(vec3<f32>(0.025, 0.032, 0.038), vec3<f32>(0.07, 0.085, 0.095), stoneNoise);
        let totemRelief = smoothstep(0.88, 0.97, sin(p.y * 16.0) * cos(p.x * 12.0 + p.z * 12.0));
        let goldInlay = vec3<f32>(0.85, 0.65, 0.25) * totemRelief * (0.35 + 0.65 * u.gazeIntensity);
        col = basalt * (diff * 0.85 + 0.20) + goldInlay + vec3<f32>(0.22, 0.42, 0.48) * fresnel * 0.45;
      } else if (matId > 0.5) {
        // 材质 1：凸出的死鱼金眼与搏动猩红鳃裂
        let isEye = step(0.45, p.y);
        let eyeCol = vec3<f32>(1.0, 0.82, 0.18) * (1.4 + 0.8 * u.gazeIntensity);
        let gillCol = vec3<f32>(0.88, 0.12, 0.18) * (1.2 + 0.7 * sin(u.time * 5.0));
        col = mix(gillCol, eyeCol, isEye);
      } else {
        // 材质 0：闪烁幽冷青铜光泽的太古鱼鳞躯体
        let scaleTex = fbm3(p * 5.2);
        let bronzeScale = vec3<f32>(0.22, 0.28, 0.20);
        let patinaTeal = vec3<f32>(0.08, 0.34, 0.30);
        let bronzeSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 48.0);

        var albedo = mix(patinaTeal, bronzeScale, smoothstep(0.25, 0.78, scaleTex));
        let rimCol = vec3<f32>(0.55, 0.75, 0.48) * fresnel * 0.95;
        col = albedo * (diff * 0.85 + 0.18) + rimCol + vec3<f32>(0.92, 0.82, 0.52) * bronzeSpec * 0.72;
      }

      let fog = exp(-0.04 * t * t);
      col = mix(bgSea, col, fog);
    }

    col += tidalHalo;
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

// 满月潮汐银光微粒与海底献祭黄金砂 Compute Shader
const DAGON_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.9 + params.gazeIntensity * 1.8) * params.entropyScale;
    let t = params.time;

    // 潮汐涨落升降 + 绕神庙祭坛的缓慢环流
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (0.72 / max(length(pos.xz), 0.45));
    let tideY = sin(t * 1.25 + seed * 8.0) * 0.38 + 0.22;
    let turbulence = vec3<f32>(
      cos(pos.y * 2.6 + t * 1.414 + seed * 10.0) * 0.25,
      tideY,
      sin(pos.y * 2.6 - t * 1.618 + seed * 10.0) * 0.25
    );

    let vel = swirl + turbulence;
    pos += vel * dt;
    phase += dt * 1.4;

    if (pos.y > 3.1 || length(pos.xz) > 4.5) {
      let ang = seed * 62.8318 + t * 2.718;
      let resetR = 0.75 + fract(seed * 15.7) * 2.7;
      pos = vec3<f32>(cos(ang) * resetR, -2.2 - fract(seed * 6.1) * 0.5, sin(ang) * resetR);
    }

    p.pos = vec4<f32>(pos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 献祭黄金砂、满月银辉与深海青铜光点渲染着色器
const DAGON_PARTICLE_RENDER_WGSL = /* wgsl */`
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

    let size = ((0.011 + 0.014 * fract(seed * 13.7)) * (1.0 + u.gazeIntensity * 0.3)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.3;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 印斯茅斯献祭黄金、满月冷银与海潮青绿配色
    let cSacrificeGold = vec3<f32>(0.96, 0.74, 0.24);
    let cMoonSilver = vec3<f32>(0.68, 0.88, 0.96);
    let cTidalTeal = vec3<f32>(0.15, 0.82, 0.65);

    var col = mix(cSacrificeGold, cMoonSilver, fract(seed * 4.1));
    col = mix(col, cTidalTeal, smoothstep(0.68, 1.0, fract(seed * 9.3)));

    let glint = 0.5 + 0.5 * sin(phase * 3.8 + seed * 15.0);
    out.color = col * u.glowScale * glint;
    out.alpha = (0.38 + 0.45 * glint) * smoothstep(3.1, -2.0, abs(worldPos.y));
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

export class DagonRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: DAGON_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: DAGON_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: DAGON_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.005, g: 0.011, b: 0.018, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.75 + Math.random() * 2.9;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 4.4;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}