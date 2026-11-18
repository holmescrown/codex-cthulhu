// MODIFIED: 新增 2-6 伊塔库亚（风行者、温迪戈、极北冰原的寂静死神）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const ITHAQUA_RAYMARCH_WGSL = /* wgsl */`
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

  // 伊塔库亚（风行者/温迪戈）SDF：vec2(最近距离, 材质ID: 0=极寒黑影巨躯与风雪披风, 1=燃烧猩红空洞眼窝, 2=枯骨冰霜鹿角冠冕)
  fn mapIthaqua(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.9 + u.gazeIntensity * 1.4);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.7);

    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    // 整体悬浮于暴风雪高空，随无理数罡风产生幽灵般的侧向漂移
    let hoverOffset = vec3<f32>(
      0.14 * sin(t1 * 0.85),
      0.10 * cos(t2 * 0.65),
      0.08 * sin(t3 * 0.55)
    );
    var p = pos - hoverOffset;

    // 1. 瘦削修长、令人毛骨悚然的温迪戈黑影巨躯（上身前倾俯瞰，双腿渐隐化作狂风尾迹）
    let pelvis = vec3<f32>(0.0, -0.35, -0.08);
    let chest = vec3<f32>(0.0, 0.42, 0.08);
    let neck = vec3<f32>(0.0, 0.78, 0.22);
    let headCenter = vec3<f32>(0.0, 0.96, 0.34);

    // 骨瘦如柴的肋骨躯干
    var dBody = sdRoundCone(p, pelvis, chest, 0.24, 0.36);
    dBody = smin(dBody, sdRoundCone(p, chest, neck, 0.32, 0.14), 0.14);

    // 排骨状冰霜肋骨棱脊
    let ribWave = sin(p.y * 24.0) * 0.024 * smoothstep(-0.25, 0.45, p.y) * smoothstep(0.65, 0.35, p.y);
    dBody -= ribWave;

    // 悬垂在空中的瘦长双腿（脚踝处如原典般冻碎化入风雪）
    for (var side : i32 = 0; side < 2; side = side + 1) {
      let fs = select(-1.0, 1.0, side == 1i);
      let hip = pelvis + vec3<f32>(fs * 0.18, 0.0, 0.0);
      let knee = vec3<f32>(fs * 0.24, -0.95 + 0.06 * sin(t1 + fs), 0.06);
      let ankle = vec3<f32>(fs * 0.20 + 0.08 * sin(t2 * 1.3 + fs), -1.68, -0.18);
      dBody = smin(dBody, sdRoundCone(p, hip, knee, 0.14, 0.095), 0.10);
      dBody = smin(dBody, sdRoundCone(p, knee, ankle, 0.095, 0.025), 0.08);

      // 修长及膝的枯爪双臂（凝视时张开双臂扑向观测者）
      let shoulder = chest + vec3<f32>(fs * 0.38, 0.04, -0.02);
      let elbow = vec3<f32>(fs * (0.68 + 0.15 * u.gazeIntensity), -0.12 + 0.08 * sin(t2 + fs), 0.05 + 0.18 * u.gazeIntensity);
      let wrist = vec3<f32>(fs * (0.76 + 0.12 * u.gazeIntensity), -0.78 + 0.12 * sin(t1 * 1.4 + fs), 0.36 + 0.35 * u.gazeIntensity);
      dBody = smin(dBody, sdRoundCone(p, shoulder, elbow, 0.13, 0.085), 0.10);
      dBody = smin(dBody, sdRoundCone(p, elbow, wrist, 0.085, 0.055), 0.08);

      // 每只手三根修长冰锥利爪
      for (var c : i32 = 0; c < 3; c = c + 1) {
        let fc = f32(c) - 1.0;
        let clawTip = wrist + vec3<f32>(fs * 0.06 + fc * 0.05, -0.26, 0.16 + abs(fc) * -0.03);
        dBody = min(dBody, sdRoundCone(p, wrist, clawTip, 0.022, 0.002));
      }
    }

    // 2. 狭长干瘪的温迪戈骷髅头颅
    var hp = p - headCenter;
    let dSkull = length(hp * vec3<f32>(1.28, 0.85, 1.05)) - 0.24;
    let dJaw = sdRoundCone(p, headCenter + vec3<f32>(0.0, -0.06, 0.04), headCenter + vec3<f32>(0.0, -0.22 - 0.06 * u.gazeIntensity, 0.16), 0.14, 0.06);
    dBody = smin(dBody, smin(dSkull, dJaw, 0.06), 0.10);

    // 3. 肩背向后狂舞的 8 条暴风雪暗影披风触须（Storm-Wind Shadow Tendrils）
    for (var k : i32 = 0; k < 8; k = k + 1) {
      let fk = f32(k);
      let isEven = (k - (k / 2i) * 2i) == 0i;
      let side = select(-1.0, 1.0, isEven);
      let tier = f32(k / 2i);
      var wp = p - vec3<f32>(side * (0.28 + tier * 0.06), 0.45 - tier * 0.24, -0.14);

      let spread = side * (0.38 + tier * 0.12) + sin(t1 * 0.8 + fk) * 0.14;
      let rXZ = rot2D(-spread) * wp.xz;
      wp.x = rXZ.x; wp.z = rXZ.y;

      let span = clamp(side * wp.x, 0.0, 1.65);
      let galeY = sin(span * 3.6 - t1 * 2.8 + fk * 1.4) * 0.26 * smoothstep(0.1, 1.5, span) - span * 0.18;
      let galeZ = -span * 0.35 + cos(span * 3.2 - t3 * 2.3 + fk * 1.9) * 0.22 * smoothstep(0.1, 1.5, span);
      let rad = max(0.012, 0.085 * exp(-span * 0.62));

      let dWind = length(vec2<f32>(wp.y - galeY, wp.z - galeZ)) - rad;
      let wMask = max(dWind, max(-side * wp.x + 0.05, side * wp.x - 1.65));
      dBody = smin(dBody, wMask, 0.12);
    }

    // 暴风雪冰霜侵蚀与烟雾边缘置换
    let windNoise = fbm3(p * 3.8 + vec3<f32>(-t * 0.45, t * 0.25, 0.0));
    dBody += (windNoise - 0.48) * 0.095 * entropy;

    // 4. 燃烧着猩红寒光的空洞眼窝（材质 1，原典核心特征）
    var dEyes = 100.0;
    for (var side : i32 = 0; side < 2; side = side + 1) {
      let fs = select(-1.0, 1.0, side == 1i);
      let eyePos = headCenter + vec3<f32>(fs * 0.095, 0.03, 0.19);
      let dEye = length((p - eyePos) * vec3<f32>(1.1, 1.45, 1.3)) - (0.048 + 0.015 * u.gazeIntensity);
      dEyes = min(dEyes, dEye);
    }

    // 5. 头顶分叉的枯骨冰霜鹿角冠冕（Wendigo Antler Crown，材质 2）
    var dAntlers = 100.0;
    for (var side : i32 = 0; side < 2; side = side + 1) {
      let fs = select(-1.0, 1.0, side == 1i);
      let root = headCenter + vec3<f32>(fs * 0.11, 0.16, -0.02);
      let mid = headCenter + vec3<f32>(fs * 0.36, 0.46, -0.14);
      let tip1 = headCenter + vec3<f32>(fs * 0.52, 0.84, -0.22);
      let tine1 = mid + vec3<f32>(fs * 0.08, 0.26, 0.16);
      let tine2 = mid + vec3<f32>(fs * 0.28, 0.18, -0.04);

      dAntlers = min(dAntlers, sdRoundCone(p, root, mid, 0.036, 0.022));
      dAntlers = min(dAntlers, sdRoundCone(p, mid, tip1, 0.022, 0.004));
      dAntlers = min(dAntlers, sdRoundCone(p, mid, tine1, 0.018, 0.003));
      dAntlers = min(dAntlers, sdRoundCone(p, mid, tine2, 0.016, 0.003));
    }

    if (dEyes < dBody && dEyes < dAntlers) {
      return vec2<f32>(dEyes * 0.65, 1.0);
    }
    if (dAntlers < dBody) {
      return vec2<f32>(dAntlers * 0.65, 2.0);
    }
    return vec2<f32>(dBody * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapIthaqua(p + e.xyy).x +
      e.yyx * mapIthaqua(p + e.yyx).x +
      e.yxy * mapIthaqua(p + e.yxy).x +
      e.xxx * mapIthaqua(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    // 极北罡风空间颤抖畸变
    uv.x += sin(uv.y * 14.0 - u.time * 5.2) * 0.006 * (0.3 + u.gazeIntensity * 2.5);

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

    // 极北寒夜暴风雪与幽蓝极光背景
    let blizzardCloud = fbm3(rd * 3.8 + vec3<f32>(-u.time * 0.22, u.time * 0.08, 0.0));
    let auroraBand = exp(-pow((rd.y - 0.35 - sin(rd.x * 4.0 + u.time * 0.5) * 0.12) * 6.0, 2.0));
    let bgArctic = mix(vec3<f32>(0.007, 0.012, 0.020), vec3<f32>(0.032, 0.058, 0.085), blizzardCloud)
                 + vec3<f32>(0.06, 0.28, 0.34) * auroraBand * 0.45;

    // 包围球早退剔除（R = 3.3）
    let bSphere = dot(ro, rd);
    let cSphere = dot(ro, ro) - 10.89;
    let hSphere = bSphere * bSphere - cSphere;
    if (hSphere < 0.0) {
      return vec4<f32>(bgArctic, 14.0);
    }

    var t = max(0.1, -bSphere - sqrt(hSphere));
    let tEnd = min(14.0, -bSphere + sqrt(hSphere));
    var hit = false;
    var matId = 0.0;
    var frostHalo = vec3<f32>(0.0);

    for (var i : i32 = 0; i < 48; i = i + 1) {
      let p = ro + rd * t;
      let res = mapIthaqua(p);
      let d = res.x;
      matId = res.y;

      // 冰蓝寒气与猩红眼窝杀意辉光
      let atten = 1.0 / (1.0 + d * d * 28.0);
      let eyeProximity = exp(-length(p - vec3<f32>(0.0, 0.96, 0.34)) * 2.8);
      let glowCol = mix(
        vec3<f32>(0.18, 0.48, 0.72), // 极地冰蓝寒雾
        vec3<f32>(0.92, 0.10, 0.14), // 猩红空洞眼窝杀意
        eyeProximity * (0.45 + 0.55 * u.gazeIntensity)
      );
      frostHalo += glowCol * atten * 0.009 * u.glowScale;

      if (d < 0.0022) {
        hit = true;
        break;
      }
      if (t > tEnd) {
        break;
      }
      t += max(d * 1.1, 0.014);
    }

    var col = bgArctic;
    if (hit) {
      let p = ro + rd * t;
      let n = calcNormal(p);
      let v = -rd;
      let lightDir = normalize(vec3<f32>(-1.5, 2.8, 2.2));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.8);

      if (matId > 1.5) {
        // 材质 2：覆盖冰霜的枯骨鹿角冠冕
        let frost = fbm3(p * 8.0);
        let boneWhite = mix(vec3<f32>(0.45, 0.52, 0.58), vec3<f32>(0.82, 0.92, 0.98), frost);
        let iceSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 64.0);
        col = boneWhite * (diff * 0.85 + 0.25) + vec3<f32>(0.55, 0.85, 1.0) * fresnel * 0.8 + vec3<f32>(1.0) * iceSpec * 0.65;
      } else if (matId > 0.5) {
        // 材质 1：暴风雪中唯一清晰可见的燃烧猩红空洞眼窝
        let crimsonFire = vec3<f32>(1.0, 0.08, 0.12) * (1.85 + 1.2 * u.gazeIntensity);
        col = crimsonFire;
      } else {
        // 材质 0：顶天立地的极寒黑影巨躯（暗夜黑曜影 + 寒霜冰蓝逆光轮廓）
        let frostCrust = fbm3(p * 6.2);
        let shadowBlack = vec3<f32>(0.012, 0.016, 0.024);
        let rimeIce = vec3<f32>(0.16, 0.34, 0.48);
        let albedo = mix(shadowBlack, rimeIce, smoothstep(0.45, 0.88, frostCrust) * 0.65);
        let coldRim = vec3<f32>(0.38, 0.78, 0.98) * fresnel * 1.05;
        col = albedo * (diff * 0.75 + 0.12) + coldRim;
      }

      let fog = exp(-0.04 * t * t);
      col = mix(bgArctic, col, fog);
    }

    col += frostHalo;
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
      finalColor.r *= 1.0 + 0.38 * edgeFactor;
      finalColor.b *= max(0.35, 1.0 - 0.25 * edgeFactor);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.25, 1.0, vignette);
    }

    let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
    finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

    return vec4<f32>(finalColor, 1.0);
  }
`;

// 极北暴风雪高速横向卷袭与螺旋上升冰晶 Compute Shader
const ITHAQUA_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (1.0 + params.gazeIntensity * 2.2) * params.entropyScale;
    let t = params.time;

    // 裹挟猎物卷上万米高空的狂暴上升暴风雪涡旋
    let rXZ = max(length(pos.xz), 0.35);
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (2.45 / sqrt(rXZ));
    let blizzardLift = vec3<f32>(
      0.85 + 0.45 * sin(pos.y * 2.8 + t * 1.618 + seed * 12.0),
      0.95 + 0.55 * fract(seed * 7.9),
      0.45 * cos(pos.x * 2.6 - t * 1.414 + seed * 12.0)
    );

    let vel = swirl + blizzardLift;
    pos += vel * dt;
    phase += dt * 1.8;

    if (pos.y > 3.2 || rXZ > 4.6) {
      let ang = seed * 62.8318 + t * 2.718;
      let resetR = 0.55 + fract(seed * 17.3) * 2.9;
      pos = vec3<f32>(cos(ang) * resetR - 0.8, -2.5 - fract(seed * 5.9) * 0.6, sin(ang) * resetR);
    }

    p.pos = vec4<f32>(pos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 冰蓝雪片、极光霜尘与猩红寒芒粒子渲染着色器
const ITHAQUA_PARTICLE_RENDER_WGSL = /* wgsl */`
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

    // 沿暴风雪风速切线拉成高速飞雪丝线
    let velDir = normalize(p.vel.xyz + vec3<f32>(0.0001));
    let thickness = (0.009 + 0.010 * fract(seed * 14.3)) * (1.0 + u.gazeIntensity * 0.25);
    let streakLen = thickness * (3.8 + u.gazeIntensity * 3.0);
    let quv = quad[vid];
    let pVert = relPos + camRight * quv.x * thickness + velDir * quv.y * streakLen;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.3;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 冰霜雪白、极光天蓝与零星猩红寒光配色
    let cSnowWhite = vec3<f32>(0.88, 0.95, 1.0);
    let cGlacierCyan = vec3<f32>(0.32, 0.78, 0.98);
    let cWendigoRed = vec3<f32>(0.95, 0.14, 0.18);

    var col = mix(cSnowWhite, cGlacierCyan, fract(seed * 4.3));
    col = mix(col, cWendigoRed, smoothstep(0.88, 1.0, fract(seed * 11.7 + u.gazeIntensity * 0.35)));

    let glint = 0.5 + 0.5 * sin(phase * 4.2 + seed * 15.0);
    out.color = col * u.glowScale * glint;
    out.alpha = (0.38 + 0.45 * glint) * smoothstep(3.2, -2.4, abs(worldPos.y));
    return out;
  }

  @fragment
  fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
    let d = abs(in.localUV.x) * 1.4 + abs(in.localUV.y) * 0.65;
    if (d > 1.15) {
      discard;
    }
    let glow = exp(-d * d * 3.4);
    return vec4<f32>(in.color * glow, in.alpha * glow);
  }
`;

export class IthaquaRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: ITHAQUA_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: ITHAQUA_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: ITHAQUA_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.007, g: 0.012, b: 0.020, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.55 + Math.random() * 2.9;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 5.0;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}