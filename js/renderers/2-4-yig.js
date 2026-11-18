// MODIFIED: 修复 WGSL for 循环步进语法与未使用变量，完整保存为 js/renderers/2-4-yig.js
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const YIG_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  fn sdCapsule(p : vec3<f32>, a : vec3<f32>, b : vec3<f32>, r : f32) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  // 计算巨蟒脊柱在参数 s ∈ [0, 1] (0=尾尖, 1=颈部) 处的真实 3D 空间坐标
  fn getSerpentSpine(s : f32, t1 : f32, t2 : f32, gaze : f32) -> vec3<f32> {
    let turns = 2.65;
    let ang = s * turns * 6.2831853 - t1 * 1.15 + 0.22 * sin(t2 * 0.7 + s * 5.0);
    let baseR = mix(1.32, 0.25, pow(s, 1.35)) + 0.10 * sin(s * 10.0 - t2 * 1.4);
    let y = mix(-1.45, 0.72, pow(s, 0.88)) + 0.08 * cos(s * 8.0 - t1);

    let neckBlend = smoothstep(0.68, 1.0, s);
    let x = cos(ang) * baseR * (1.0 - neckBlend * 0.92) + 0.10 * sin(t2 * 1.1) * neckBlend;
    let z = sin(ang) * baseR * (1.0 - neckBlend * 0.85) + neckBlend * (0.68 + 0.28 * gaze);
    return vec3<f32>(x, y, z);
  }

  // 伊格（羽蛇之神）SDF：vec2(最近距离, 材质ID: 0=翡翠金斑斓蛇躯, 1=金瞳竖眼/毒牙/蛇信, 2=斑斓羽蛇翼膜)
  fn mapYig(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.85 + u.gazeIntensity * 1.35);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.65);

    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    // 1. 真正的 3D 螺旋巨蟒躯干（22 段连续胶囊体无缝平滑拼接）
    var dSerpent = 100.0;
    var prevP = getSerpentSpine(0.0, t1, t2, u.gazeIntensity);
    let segs = 22;
    for (var i = 1; i <= segs; i = i + 1) {
      let s = f32(i) / f32(segs);
      let currP = getSerpentSpine(s, t1, t2, u.gazeIntensity);
      let thickness = mix(0.045, 0.29, sin(s * 2.35 + 0.15)) * (1.0 + 0.06 * sin(s * 24.0 - t3 * 2.5));
      let dSeg = sdCapsule(pos, prevP, currP, thickness);
      dSerpent = smin(dSerpent, dSeg, 0.08);
      prevP = currP;
    }

    // 2. 昂起的三角蝰蛇头颅（Viper Head：上颚 + 张开的血盆下颚）
    let headCenter = prevP + vec3<f32>(0.0, 0.06, 0.14);
    var hp = pos - headCenter;
    let yaw = rot2D(0.10 * sin(t1 * 0.9)) * hp.xz;
    hp.x = yaw.x; hp.z = yaw.y;

    var upperP = hp - vec3<f32>(0.0, 0.06, 0.12);
    let taper = clamp(1.15 - upperP.z * 0.75, 0.48, 1.25);
    upperP.x /= taper;
    let dUpperJaw = length(upperP * vec3<f32>(0.95, 1.65, 0.72)) - 0.30;

    let jawOpenAngle = 0.34 + 0.26 * u.gazeIntensity + 0.06 * sin(t2 * 2.2);
    var lowerP = hp - vec3<f32>(0.0, -0.04, 0.02);
    let rJaw = rot2D(jawOpenAngle) * lowerP.yz;
    lowerP.y = rJaw.x; lowerP.z = rJaw.y;
    lowerP.x /= taper;
    let dLowerJaw = length((lowerP - vec3<f32>(0.0, -0.05, 0.14)) * vec3<f32>(1.05, 1.9, 0.78)) - 0.25;

    dSerpent = smin(dSerpent, min(dUpperJaw, dLowerJaw), 0.09);

    // 雕刻菱形几何蛇鳞凹凸纹理
    let scaleGrid = abs(sin(pos.x * 22.0 + pos.y * 22.0) * sin(pos.z * 22.0 - pos.y * 22.0));
    let scaleNoise = fbm3(pos * 3.2 + vec3<f32>(0.0, -t * 0.12, 0.0));
    dSerpent += (scaleNoise - 0.48) * 0.07 * entropy - scaleGrid * 0.016;

    // 3. 羽蛇神双翼（肩背两侧展开的带翼膜羽翼，材质 2）
    var dWings = 100.0;
    for (var side : i32 = -1; side <= 1; side = side + 2) {
      let fs = f32(side);
      var wp = pos - vec3<f32>(fs * 0.22, 0.48, 0.36);
      let flap = 0.18 * sin(t2 * 1.9) + 0.24 * u.gazeIntensity;
      let rXZ = rot2D(-fs * (0.42 - flap)) * wp.xz;
      wp.x = rXZ.x; wp.z = rXZ.y;
      let rXY = rot2D(fs * 0.28) * wp.xy;
      wp.x = rXY.x; wp.y = rXY.y;

      let span = clamp(fs * wp.x, 0.0, 1.55);
      let spanNorm = span / 1.55;
      let topEdge = 0.55 * sin(spanNorm * 2.4 + 0.2);
      let botEdge = -0.68 * (1.0 - spanNorm * 0.45) + 0.09 * sin(span * 11.0 - t1 * 2.0);
      let inSpan = max(-fs * wp.x, fs * wp.x - 1.55);
      let inHeight = max(wp.y - topEdge, botEdge - wp.y);
      let wingThickness = 0.022 + 0.025 * (1.0 - spanNorm);
      let dMembrane = max(max(inSpan, inHeight), abs(wp.z - sin(span * 2.5 - t2 * 2.2) * 0.12) - wingThickness);
      dWings = min(dWings, dMembrane);
    }

    // 4. 金瞳竖眼、弯曲剧毒尖牙与分叉蛇信（材质 1）
    var dDetails = 100.0;
    for (var side : i32 = -1; side <= 1; side = side + 2) {
      let fs = f32(side);
      let eyeP = hp - vec3<f32>(fs * 0.21, 0.11, 0.18);
      dDetails = min(dDetails, length(eyeP) - 0.068);

      let fangStart = headCenter + vec3<f32>(fs * 0.11, 0.01, 0.34);
      let fangEnd = headCenter + vec3<f32>(fs * 0.10, -0.15 - 0.08 * u.gazeIntensity, 0.31);
      dDetails = min(dDetails, sdCapsule(pos, fangStart, fangEnd, 0.018));
    }

    let tongueOut = 0.28 + 0.18 * sin(t3 * 3.5) + 0.22 * u.gazeIntensity;
    let tStart = headCenter + vec3<f32>(0.0, -0.04, 0.26);
    let tEnd = headCenter + vec3<f32>(0.04 * sin(t1 * 6.0), -0.08, 0.26 + tongueOut);
    dDetails = min(dDetails, sdCapsule(pos, tStart, tEnd, 0.014));

    if (dDetails < dSerpent && dDetails < dWings) {
      return vec2<f32>(dDetails * 0.65, 1.0);
    }
    if (dWings < dSerpent) {
      return vec2<f32>(dWings * 0.62, 2.0);
    }
    return vec2<f32>(dSerpent * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0024, -0.0024);
    return normalize(
      e.xyy * mapYig(p + e.xyy).x +
      e.yyx * mapYig(p + e.yyx).x +
      e.yxy * mapYig(p + e.yxy).x +
      e.xxx * mapYig(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    uv += sin(uv.yx * 16.0 + u.time * 2.8) * 0.006 * u.gazeIntensity;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

    let jungleMist = fbm3(rd * 3.4 + vec3<f32>(u.time * 0.04, 0.0, 0.0));
    let bgTemple = mix(vec3<f32>(0.008, 0.012, 0.007), vec3<f32>(0.038, 0.032, 0.012), jungleMist);

    let bSphere = dot(ro, rd);
    let cSphere = dot(ro, ro) - 10.89;
    let hSphere = bSphere * bSphere - cSphere;
    if (hSphere < 0.0) {
      return vec4<f32>(bgTemple, 14.0);
    }

    var t = max(0.1, -bSphere - sqrt(hSphere));
    let tEnd = min(14.0, -bSphere + sqrt(hSphere));
    var hit = false;
    var matId = 0.0;
    var venomHalo = vec3<f32>(0.0);

    for (var i = 0; i < 48; i = i + 1) {
      let p = ro + rd * t;
      let res = mapYig(p);
      let d = res.x;
      matId = res.y;

      let atten = 1.0 / (1.0 + d * d * 24.0);
      let glowCol = mix(
        vec3<f32>(0.12, 0.62, 0.22),
        vec3<f32>(0.85, 0.52, 0.14),
        0.5 + 0.5 * sin(p.y * 3.2 - u.time * 2.0)
      );
      venomHalo += glowCol * atten * 0.010 * u.glowScale * (1.0 + u.gazeIntensity * 0.8);

      if (d < 0.0025) {
        hit = true;
        break;
      }
      if (t > tEnd) {
        break;
      }
      t += max(d * 1.1, 0.015);
    }

    var col = bgTemple;
    if (hit) {
      let p = ro + rd * t;
      let n = calcNormal(p);
      let v = -rd;
      let lightDir = normalize(vec3<f32>(1.8, 3.0, 2.4));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.8);

      if (matId > 1.5) {
        let featherRibs = 0.5 + 0.5 * sin(abs(p.x) * 26.0 - p.y * 10.0);
        let wingEmerald = vec3<f32>(0.06, 0.42, 0.22);
        let wingGold = vec3<f32>(0.92, 0.62, 0.16);
        let wingCrimson = vec3<f32>(0.72, 0.14, 0.10);
        var wCol = mix(wingEmerald, wingGold, smoothstep(0.35, 0.85, featherRibs));
        wCol = mix(wCol, wingCrimson, smoothstep(1.1, 1.6, abs(p.x)));
        col = wCol * (diff * 0.82 + 0.22) + vec3<f32>(0.95, 0.78, 0.32) * fresnel * 0.85;
      } else if (matId > 0.5) {
        let isEye = step(0.05, p.y - 0.98);
        let isTongue = step(0.45, p.z - 0.68);
        let goldEye = vec3<f32>(1.0, 0.84, 0.16) * (1.5 + 0.85 * u.gazeIntensity);
        let venomFang = vec3<f32>(0.55, 1.0, 0.62) * 1.3;
        let redTongue = vec3<f32>(0.92, 0.12, 0.16) * 1.25;
        col = mix(venomFang, goldEye, isEye);
        col = mix(col, redTongue, isTongue * (1.0 - isEye));
      } else {
        let bandPattern = 0.5 + 0.5 * sin(p.y * 10.0 + sin(p.x * 5.0) * 2.2);
        let scaleShimmer = fbm3(p * 7.2);
        let obsidianScale = vec3<f32>(0.025, 0.035, 0.028);
        let emeraldScale = vec3<f32>(0.08, 0.54, 0.22);
        let crimsonGold = vec3<f32>(0.82, 0.38, 0.10);

        var albedo = mix(obsidianScale, emeraldScale, smoothstep(0.25, 0.75, bandPattern));
        albedo = mix(albedo, crimsonGold, smoothstep(0.68, 0.92, scaleShimmer));

        let scaleSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 56.0);
        let rimCol = mix(vec3<f32>(0.24, 0.88, 0.38), vec3<f32>(0.96, 0.68, 0.20), bandPattern) * fresnel * 0.95;
        col = albedo * (diff * 0.86 + 0.18) + rimCol + vec3<f32>(0.95, 0.92, 0.72) * scaleSpec * 0.72;
      }

      let fog = exp(-0.04 * t * t);
      col = mix(bgTemple, col, fog);
    }

    col += venomHalo;
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

    var finalColor = renderScene(uv, ro, camRight, camUp, camFwd).rgb;

    if (u.gazeIntensity > 0.02) {
      let edgeFactor = length(uv) * u.gazeIntensity;
      finalColor.r *= 1.0 + 0.32 * edgeFactor;
      finalColor.b *= max(0.38, 1.0 - 0.25 * edgeFactor);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.28, 1.0, vignette);
    }

    let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
    finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

    return vec4<f32>(finalColor, 1.0);
  }
`;

const YIG_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.9 + params.gazeIntensity * 1.9) * params.entropyScale;
    let t = params.time;

    let rXZ = max(length(pos.xz), 0.35);
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (1.45 / sqrt(rXZ));
    let lift = vec3<f32>(
      sin(pos.y * 3.2 + t * 1.414 + seed * 12.0) * 0.28,
      0.38 + 0.25 * fract(seed * 8.3),
      cos(pos.y * 3.2 - t * 1.618 + seed * 12.0) * 0.28
    );

    let vel = swirl + lift;
    pos += vel * dt;
    phase += dt * 1.5;

    if (pos.y > 2.8 || rXZ > 4.4) {
      let ang = seed * 62.8318 + t * 2.718;
      let resetR = 0.55 + fract(seed * 15.1) * 2.4;
      pos = vec3<f32>(cos(ang) * resetR, -2.3 - fract(seed * 6.7) * 0.5, sin(ang) * resetR);
    }

    p.pos = vec4<f32>(pos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

const YIG_PARTICLE_RENDER_WGSL = /* wgsl */`
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

    let size = ((0.011 + 0.013 * fract(seed * 14.9)) * (1.0 + u.gazeIntensity * 0.3)) * 1.63;
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.3;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    let cVenomGreen = vec3<f32>(0.14, 0.92, 0.36);
    let cAutumnGold = vec3<f32>(0.96, 0.68, 0.18);
    let cPlumeRed = vec3<f32>(0.88, 0.24, 0.12);

    var col = mix(cVenomGreen, cAutumnGold, fract(seed * 4.5));
    col = mix(col, cPlumeRed, smoothstep(0.72, 1.0, fract(seed * 9.1)));

    let glint = 0.5 + 0.5 * sin(phase * 3.6 + seed * 15.0);
    out.color = col * u.glowScale * glint;
    out.alpha = (0.38 + 0.45 * glint) * smoothstep(2.8, -2.1, abs(worldPos.y));
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

export class YigRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: YIG_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: YIG_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: YIG_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.009, g: 0.013, b: 0.007, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.55 + Math.random() * 2.5;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 4.6;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}