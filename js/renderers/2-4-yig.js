// MODIFIED: 修复 WGSL i32/f32 类型严格匹配，完整覆盖保存为 js/renderers/2-4-yig.js
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const YIG_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  fn sdCapsule(p : vec3<f32>, a : vec3<f32>, b : vec3<f32>, r : f32) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  fn sdRoundCone(p : vec3<f32>, a : vec3<f32>, b : vec3<f32>, r1 : f32, r2 : f32) -> f32 {
    let ba = b - a;
    let l2 = dot(ba, ba);
    let rr = r1 - r2;
    let a2 = l2 - rr * rr;
    let il2 = 1.0 / l2;

    let pa = p - a;
    let y = dot(pa, ba);
    let z = y - l2;
    let x2 = dot(pa * l2 - ba * y, pa * l2 - ba * y);
    let y2 = y * y * l2;
    let z2 = z * z * l2;

    let k = sign(rr) * rr * rr * x2;
    if (sign(z) * a2 * z2 > k) {
      return sqrt(x2 + z2) * il2 - r2;
    }
    if (sign(y) * a2 * y2 < k) {
      return sqrt(x2 + y2) * il2 - r1;
    }
    return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  }

  fn getSerpentSpine(s : f32, t1 : f32, t2 : f32, gaze : f32) -> vec3<f32> {
    let rise = smoothstep(0.58, 1.0, s);
    let ang = s * 13.8 - t1 * 0.95 + 0.16 * sin(t2 * 0.7 + s * 4.0);
    let coilR = mix(1.38, 0.12, pow(s, 1.15)) * (1.0 - rise * 0.88);

    let baseY = mix(-1.42, -0.35, min(s / 0.62, 1.0));
    let neckY = mix(-0.35, 0.86, rise);
    let y = mix(baseY, neckY, rise) + 0.04 * sin(s * 9.0 - t1);

    let swayX = 0.09 * sin(t2 * 1.15) * rise;
    let forwardZ = rise * (0.48 + 0.25 * gaze) - sin(rise * 3.14159) * 0.22;

    return vec3<f32>(
      cos(ang) * coilR + swayX,
      y,
      sin(ang) * coilR + forwardZ
    );
  }

  fn mapYig(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.8 + u.gazeIntensity * 1.3);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.6);

    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    // 1. 盘踞并昂起的黑曜石巨蟒主躯干
    var dBody = 100.0;
    var prevP = getSerpentSpine(0.0, t1, t2, u.gazeIntensity);
    var prevR = 0.035;
    for (var i : i32 = 1; i <= 24; i = i + 1) {
      let s = f32(i) / 24.0;
      let currP = getSerpentSpine(s, t1, t2, u.gazeIntensity);
      let currR = mix(0.035, 0.31, sin(s * 2.35 + 0.12)) * (1.0 + 0.04 * sin(s * 20.0 - t3 * 2.0));
      let dSeg = sdRoundCone(pos, prevP, currP, prevR, currR);
      dBody = smin(dBody, dSeg, 0.06);
      prevP = currP;
      prevR = currR;
    }

    // 2. 威严眼镜蛇王兜帽
    let headCenter = prevP + vec3<f32>(0.0, 0.08, 0.14);
    var hoodP = pos - (prevP + vec3<f32>(0.0, -0.22, -0.04));
    let hoodYaw = rot2D(0.09 * sin(t1 * 1.1)) * hoodP.xz;
    hoodP.x = hoodYaw.x; hoodP.z = hoodYaw.y;

    let hoodHeightNorm = clamp((hoodP.y + 0.45) / 0.72, 0.0, 1.0);
    let hoodWidth = 0.62 * sin(hoodHeightNorm * 2.75 + 0.18) * (1.0 + 0.15 * u.gazeIntensity);
    let hoodCurveZ = -0.06 - 0.18 * (hoodP.x * hoodP.x);
    let dHood = length(vec3<f32>(
      max(0.0, abs(hoodP.x) - hoodWidth),
      max(0.0, abs(hoodP.y + 0.08) - 0.36),
      (hoodP.z - hoodCurveZ) * 2.2
    )) - 0.065;

    // 3. 肩背爆发出 6 条狂舞的毒蛇触腕（显式 i32 字面量，消除 WGSL 编译器类型歧义）
    var dSnakes = 100.0;
    for (var k : i32 = 0; k < 6; k = k + 1) {
      let fk = f32(k);
      let isEven = (k - (k / 2i) * 2i) == 0i;
      let side = select(-1.0, 1.0, isEven);
      let tier = f32(k / 2i);
      var sp = pos - vec3<f32>(side * 0.24, 0.42 - tier * 0.28, -0.05 - tier * 0.06);

      let spreadAng = side * (0.45 + tier * 0.18) + sin(t1 * 0.9 + fk) * 0.15;
      let rXZ = rot2D(-spreadAng) * sp.xz;
      sp.x = rXZ.x; sp.z = rXZ.y;

      let reach = clamp(side * sp.x, 0.0, 1.35 - tier * 0.15);
      let snakeWaveY = sin(reach * 4.5 - t2 * 2.4 + fk * 1.7) * 0.22 * smoothstep(0.1, 1.2, reach) + (0.25 - tier * 0.15) * reach;
      let snakeWaveZ = cos(reach * 4.0 - t3 * 2.1 + fk * 2.1) * 0.18 * smoothstep(0.1, 1.2, reach);
      let snakeRad = max(0.015, 0.075 * exp(-reach * 0.65));

      let dTendril = length(vec2<f32>(sp.y - snakeWaveY, sp.z - snakeWaveZ)) - snakeRad;
      let tMask = max(dTendril, max(-side * sp.x + 0.05, side * sp.x - (1.35 - tier * 0.15)));
      dSnakes = smin(dSnakes, tMask, 0.08);
    }

    // 4. 棱角分明的凶厉蝰蛇邪神头颅
    var hp = pos - headCenter;
    hp.x = hoodYaw.x; hp.z = hoodYaw.y;

    var upperP = hp - vec3<f32>(0.0, 0.05, 0.12);
    let snoutTaper = clamp(1.18 - upperP.z * 0.85, 0.42, 1.25);
    upperP.x /= snoutTaper;
    let dUpper = length(upperP * vec3<f32>(1.05, 1.75, 0.68)) - 0.28;

    var dHorns = 100.0;
    for (var sIdx : i32 = 0; sIdx < 2; sIdx = sIdx + 1) {
      let fs = select(-1.0, 1.0, sIdx == 1i);
      let browA = headCenter + vec3<f32>(fs * 0.15, 0.13, 0.10);
      let browB = headCenter + vec3<f32>(fs * 0.28, 0.26, -0.14);
      dHorns = min(dHorns, sdRoundCone(pos, browA, browB, 0.055, 0.012));
    }
    dHorns = min(dHorns, sdRoundCone(pos, headCenter + vec3<f32>(0.0, 0.15, 0.02), headCenter + vec3<f32>(0.0, 0.34, -0.22), 0.06, 0.01));

    let jawAngle = 0.38 + 0.28 * u.gazeIntensity + 0.05 * sin(t2 * 2.0);
    var lowerP = hp - vec3<f32>(0.0, -0.04, 0.02);
    let rJaw = rot2D(jawAngle) * lowerP.yz;
    lowerP.y = rJaw.x; lowerP.z = rJaw.y;
    lowerP.x /= snoutTaper;
    let dLower = length((lowerP - vec3<f32>(0.0, -0.04, 0.14)) * vec3<f32>(1.15, 2.1, 0.72)) - 0.23;

    let dHeadTotal = smin(min(dUpper, dLower), dHorns, 0.05);
    dBody = smin(dBody, dHeadTotal, 0.07);
    dBody = smin(dBody, dSnakes, 0.10);

    let microScale = sin(pos.x * 36.0 + pos.y * 28.0) * sin(pos.z * 36.0 - pos.y * 28.0) * 0.006;
    let organicNoise = fbm3(pos * 3.5 + vec3<f32>(0.0, -t * 0.1, 0.0));
    dBody += (organicNoise - 0.48) * 0.055 * entropy + microScale;

    // 5. 熔岩金竖瞳眼眸 + 粗壮弯曲的象牙毒牙（材质 1）
    var dFangsEyes = 100.0;
    for (var sIdx : i32 = 0; sIdx < 2; sIdx = sIdx + 1) {
      let fs = select(-1.0, 1.0, sIdx == 1i);
      let eyeCenter = headCenter + vec3<f32>(fs * 0.19, 0.09, 0.18);
      dFangsEyes = min(dFangsEyes, length(pos - eyeCenter) - 0.062);

      let fRoot = headCenter + vec3<f32>(fs * 0.11, 0.01, 0.34);
      let fMid = headCenter + vec3<f32>(fs * 0.11, -0.09 - 0.04 * u.gazeIntensity, 0.36);
      let fTip = headCenter + vec3<f32>(fs * 0.10, -0.19 - 0.08 * u.gazeIntensity, 0.30);
      dFangsEyes = min(dFangsEyes, sdRoundCone(pos, fRoot, fMid, 0.026, 0.016));
      dFangsEyes = min(dFangsEyes, sdRoundCone(pos, fMid, fTip, 0.016, 0.003));
    }

    if (dFangsEyes < dBody && dFangsEyes < dHood) {
      return vec2<f32>(dFangsEyes * 0.65, 1.0);
    }
    if (dHood < dBody) {
      return vec2<f32>(dHood * 0.65, 2.0);
    }
    return vec2<f32>(dBody * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapYig(p + e.xyy).x +
      e.yyx * mapYig(p + e.yyx).x +
      e.yxy * mapYig(p + e.yxy).x +
      e.xxx * mapYig(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    uv += sin(uv.yx * 15.0 + u.time * 2.6) * 0.005 * u.gazeIntensity;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

    let bgNoise = fbm3(rd * 3.2 + vec3<f32>(u.time * 0.03, 0.0, 0.0));
    let bgTemple = mix(vec3<f32>(0.006, 0.008, 0.007), vec3<f32>(0.026, 0.022, 0.012), bgNoise);

    let bSphere = dot(ro, rd);
    let cSphere = dot(ro, ro) - 10.24;
    let hSphere = bSphere * bSphere - cSphere;
    if (hSphere < 0.0) {
      return vec4<f32>(bgTemple, 14.0);
    }

    var t = max(0.1, -bSphere - sqrt(hSphere));
    let tEnd = min(14.0, -bSphere + sqrt(hSphere));
    var hit = false;
    var matId = 0.0;
    var subtleAura = vec3<f32>(0.0);

    for (var i : i32 = 0; i < 48; i = i + 1) {
      let p = ro + rd * t;
      let res = mapYig(p);
      let d = res.x;
      matId = res.y;

      let atten = 1.0 / (1.0 + d * d * 42.0);
      let glowCol = mix(
        vec3<f32>(0.08, 0.34, 0.16),
        vec3<f32>(0.68, 0.38, 0.08),
        0.5 + 0.5 * sin(p.y * 2.8 - u.time * 1.8)
      );
      subtleAura += glowCol * atten * 0.0055 * u.glowScale * (1.0 + u.gazeIntensity * 0.85);

      if (d < 0.0022) {
        hit = true;
        break;
      }
      if (t > tEnd) {
        break;
      }
      t += max(d * 1.08, 0.014);
    }

    var col = bgTemple;
    if (hit) {
      let p = ro + rd * t;
      let n = calcNormal(p);
      let v = -rd;
      let lightDir = normalize(vec3<f32>(1.6, 3.2, 2.2));
      let rimLightDir = normalize(vec3<f32>(-2.2, 1.5, -1.8));
      let diff = max(dot(n, lightDir), 0.0);
      let backRim = max(dot(n, rimLightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.2);

      if (matId > 1.5) {
        let totemPattern = smoothstep(0.55, 0.88, sin(abs(p.x) * 18.0 + p.y * 12.0));
        let hoodObsidian = vec3<f32>(0.025, 0.032, 0.028);
        let antiqueGold = vec3<f32>(0.62, 0.42, 0.12);
        let hCol = mix(hoodObsidian, antiqueGold, totemPattern * 0.75);
        let spec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 48.0);
        col = hCol * (diff * 0.85 + 0.15) + vec3<f32>(0.85, 0.62, 0.22) * fresnel * 0.75 + vec3<f32>(0.9, 0.8, 0.6) * spec * 0.45;
      } else if (matId > 0.5) {
        let isEye = step(0.03, p.y - 0.80);
        let slit = smoothstep(0.008, 0.022, abs(p.x - sign(p.x) * 0.19));
        let lavaEye = vec3<f32>(1.0, 0.55, 0.08) * (1.6 + 0.9 * u.gazeIntensity) * mix(0.15, 1.0, slit);
        let ivoryFang = vec3<f32>(0.86, 0.84, 0.74) * (diff * 0.7 + 0.45) + vec3<f32>(0.25, 0.95, 0.45) * fresnel * 0.6;
        col = mix(ivoryFang, lavaEye, isEye);
      } else {
        let bandWave = 0.5 + 0.5 * sin(p.y * 8.5 + sin(p.x * 4.5) * 1.8);
        let tex = fbm3(p * 6.5);
        let obsidian = vec3<f32>(0.018, 0.024, 0.020);
        let deepJade = vec3<f32>(0.045, 0.22, 0.12);
        let bronzeBand = vec3<f32>(0.42, 0.24, 0.06);

        var albedo = mix(obsidian, deepJade, smoothstep(0.25, 0.75, tex));
        albedo = mix(albedo, bronzeBand, smoothstep(0.62, 0.92, bandWave) * 0.75);

        let scaleSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 64.0);
        let rimCol = mix(vec3<f32>(0.18, 0.68, 0.32), vec3<f32>(0.88, 0.54, 0.14), bandWave) * fresnel * 0.85;
        col = albedo * (diff * 0.88 + backRim * 0.22 + 0.10) + rimCol + vec3<f32>(0.88, 0.85, 0.68) * scaleSpec * 0.65;
      }

      let fog = exp(-0.042 * t * t);
      col = mix(bgTemple, col, fog);
    }

    col += subtleAura;
    return vec4<f32>(col, select(14.0, t, hit));
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
      finalColor.r *= 1.0 + 0.34 * edgeFactor;
      finalColor.b *= max(0.35, 1.0 - 0.28 * edgeFactor);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.26, 1.0, vignette);
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

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.85 + params.gazeIntensity * 1.8) * params.entropyScale;
    let t = params.time;

    let rXZ = max(length(pos.xz), 0.35);
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (1.35 / sqrt(rXZ));
    let lift = vec3<f32>(
      sin(pos.y * 3.0 + t * 1.414 + seed * 12.0) * 0.24,
      0.32 + 0.22 * fract(seed * 8.3),
      cos(pos.y * 3.0 - t * 1.618 + seed * 12.0) * 0.24
    );

    let vel = swirl + lift;
    pos += vel * dt;
    phase += dt * 1.4;

    if (pos.y > 2.6 || rXZ > 4.2) {
      let ang = seed * 62.8318 + t * 2.718;
      let resetR = 0.65 + fract(seed * 15.1) * 2.4;
      pos = vec3<f32>(cos(ang) * resetR, -2.1 - fract(seed * 6.7) * 0.4, sin(ang) * resetR);
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

    let size = (0.014 + 0.016 * fract(seed * 14.9)) * (1.0 + u.gazeIntensity * 0.25);
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.3;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    let cBronzeDust = vec3<f32>(0.88, 0.56, 0.16);
    let cJadeMist = vec3<f32>(0.14, 0.72, 0.32);

    let col = mix(cBronzeDust, cJadeMist, fract(seed * 4.5));
    let glint = 0.45 + 0.55 * sin(phase * 3.2 + seed * 15.0);
    out.color = col * u.glowScale * glint;
    out.alpha = (0.30 + 0.38 * glint) * smoothstep(2.6, -2.0, abs(worldPos.y));
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

export class YigRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: YIG_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: YIG_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: YIG_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.006, g: 0.008, b: 0.007, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.65 + Math.random() * 2.5;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 4.2;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}