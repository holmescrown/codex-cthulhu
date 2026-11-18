// MODIFIED: 新增 2-5 撒托古亚（恩开伊的沉睡之神、黑佛、无定形蟾蜍之主）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const TSATHOGGUA_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  // 撒托古亚（黑佛巨蟾）与黑泥祭盆 SDF：vec2(最近距离, 材质ID: 0=蝙蝠黑毛巨蟾躯体, 1=半眯昏黄睡眼, 2=冰冷祭坛与沸腾黑泥)
  fn mapTsathoggua(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.55 + u.gazeIntensity * 1.35);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.7);

    // 无理数准周期慵懒呼吸节律
    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    let bellyBreath = 0.05 * sin(t1 * 0.85) + 0.03 * cos(t2 * 0.55);
    var p = pos - vec3<f32>(0.0, -0.05, 0.0);

    // 1. 肥胖如山岳的慵懒蟾蜍坐姿躯干（下宽上收的梨形肉团 + 垂坠双下巴）
    var bellyP = p - vec3<f32>(0.0, -0.32, 0.05);
    bellyP.x *= 0.86;
    bellyP.y *= 1.08;
    bellyP.z *= 0.88;
    var dToad = length(bellyP) - (0.98 + bellyBreath);

    // 宽扁的巨蟾头颅（直接嵌在肥胖肩膀上，几乎无颈部）
    var headP = p - vec3<f32>(0.0, 0.54, 0.14);
    headP.x *= 0.84;
    headP.y *= 1.28;
    headP.z *= 0.92;
    let dHead = length(headP) - 0.64;
    dToad = smin(dToad, dHead, 0.34);

    // 垂坠膨胀的咽喉鸣囊（Vocal Sac，随呼吸缓慢鼓胀）
    let sacP = p - vec3<f32>(0.0, 0.22, 0.52);
    let dSac = length(sacP * vec3<f32>(0.9, 1.35, 1.1)) - (0.38 + bellyBreath * 1.4);
    dToad = smin(dToad, dSac, 0.25);

    // 头顶一对短钝蝙蝠耳（Bat-like Ears）+ 慵懒搭在腹前的粗短前肢
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      // 蝙蝠尖耳
      var earP = p - vec3<f32>(fs * 0.44, 0.96, 0.04);
      let rEar = rot2D(-fs * 0.38) * earP.xy;
      earP.x = rEar.x; earP.y = rEar.y;
      let dEar = length(earP * vec3<f32>(1.6, 0.7, 1.4)) - 0.16;
      dToad = smin(dToad, dEar, 0.12);

      // 粗短前肢（佛像般交叉搭在圆腹前方）
      let shPos = vec3<f32>(fs * 0.78, 0.08, 0.12);
      let handPos = vec3<f32>(fs * 0.32, -0.52, 0.72);
      let pa = p - shPos;
      let ba = handPos - shPos;
      let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      let dArm = length(pa - ba * h) - mix(0.28, 0.20, h);
      dToad = smin(dToad, dArm, 0.24);

      // 盘坐的粗壮蛙腿
      let legP = p - vec3<f32>(fs * 0.88, -0.78, 0.22);
      let dLeg = length(legP * vec3<f32>(0.85, 1.35, 0.75)) - 0.42;
      dToad = smin(dToad, dLeg, 0.26);
    }

    // 蝙蝠短毛绒质感与肥胖皮肤褶皱
    let furNoise = fbm3(p * 6.5 + vec3<f32>(0.0, -t * 0.04, 0.0));
    let folds = sin(p.y * 11.0 + sin(p.x * 5.0)) * 0.018 * smoothstep(0.3, -0.7, p.y);
    dToad += (furNoise - 0.48) * 0.075 * entropy + folds;

    // 2. 半眯着昏黄睡意的巨型横瞳眼眸（惊扰凝视时猛然睁圆，材质 1）
    var dEyes = 100.0;
    for (var side = -1; side <= 1; side += 2) {
      let fs = f32(side);
      let eyeCenter = vec3<f32>(fs * 0.36, 0.64, 0.56);
      // 平时高度压缩成懒散的半眯眼缝，凝视时睁开
      let squintY = mix(2.6, 1.05, u.gazeIntensity);
      let dEye = length((p - eyeCenter) * vec3<f32>(0.95, squintY, 1.25)) - 0.125;
      dEyes = min(dEyes, dEye);
    }

    // 3. 冰冷黑曜石祭坛底座 + 沸腾蠕动的“无定形之子”黑泥触团（材质 2）
    var altarP = pos - vec3<f32>(0.0, -1.25, 0.0);
    altarP.y *= 2.4;
    var dAltar = length(altarP) - 1.65;

    // 5 团从黑泥祭盆中蠕动探出的“无定形之子”伪足团块
    for (var k = 0; k < 5; k = k + 1) {
      let fk = f32(k);
      let ang = fk * 1.256637 + sin(t * (0.414 + fk * 0.073)) * 0.5;
      let reach = 1.15 + 0.45 * sin(t2 * 1.1 + fk * 2.1) * (1.0 + 0.5 * u.gazeIntensity);
      let spawnPos = vec3<f32>(
        cos(ang) * reach,
        -0.98 + 0.24 * sin(t3 * 1.4 + fk),
        sin(ang) * reach
      );
      let dSpawn = length(pos - spawnPos) - (0.24 + 0.08 * cos(t1 * 1.5 + fk));
      dAltar = smin(dAltar, dSpawn, 0.32);
    }
    let slimeWave = fbm3(pos * 2.8 + vec3<f32>(t * 0.14, -t * 0.18, t * 0.11));
    dAltar += (slimeWave - 0.48) * 0.16 * entropy;

    if (dEyes < dToad && dEyes < dAltar) {
      return vec2<f32>(dEyes * 0.65, 1.0);
    }
    if (dAltar < dToad) {
      return vec2<f32>(dAltar * 0.62, 2.0);
    }
    return vec2<f32>(dToad * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0024, -0.0024);
    return normalize(
      e.xyy * mapTsathoggua(p + e.xyy).x +
      e.yyx * mapTsathoggua(p + e.yyx).x +
      e.yxy * mapTsathoggua(p + e.yxy).x +
      e.xxx * mapTsathoggua(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    let r2 = dot(uv, uv);
    uv *= 1.0 + u.gazeIntensity * 0.18 * r2;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

    // 恩开伊地底无底洞窟幽暗背景
    let caveMist = fbm3(rd * 3.2 + vec3<f32>(u.time * 0.03));
    let bgCave = mix(vec3<f32>(0.006, 0.007, 0.011), vec3<f32>(0.022, 0.024, 0.036), caveMist);

    // 包围球早退剔除（R = 3.2，屏幕四周纯黑洞穴直接跳过 Raymarching，大幅降耗）
    let b = dot(ro, rd);
    let c = dot(ro, ro) - 10.24;
    let h = b * b - c;
    if (h < 0.0) {
      return vec4<f32>(bgCave, 14.0);
    }

    var t = max(0.1, -b - sqrt(h));
    let maxDist = min(14.0, -b + sqrt(h));
    var hit = false;
    var matId = 0.0;
    var slumberHalo = vec3<f32>(0.0);

    for (var i = 0; i < 48; i = i + 1) {
      let p = ro + rd * t;
      let res = mapTsathoggua(p);
      let d = res.x;
      matId = res.y;

      let atten = 1.0 / (1.0 + d * d * 24.0);
      let glowCol = mix(
        vec3<f32>(0.22, 0.28, 0.45), // 恩开伊地穴幽蓝微光
        vec3<f32>(0.78, 0.56, 0.16), // 睡眼昏黄琥珀光
        step(0.5, matId) * (1.0 - step(1.5, matId))
      );
      slumberHalo += glowCol * atten * 0.011 * u.glowScale * (1.0 + u.gazeIntensity * 0.85);

      if (d < 0.0025) {
        hit = true;
        break;
      }
      if (t > maxDist) {
        break;
      }
      t += max(d * 1.1, 0.015);
    }

    var col = bgCave;
    if (hit) {
      let p = ro + rd * t;
      let n = calcNormal(p);
      let v = -rd;
      let lightDir = normalize(vec3<f32>(1.4, 3.2, 2.2));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);

      if (matId > 1.5) {
        // 材质 2：冰冷祭坛与如液态沥青般反光的“无定形之子”黑泥
        let tarSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 72.0);
        let tarBase = vec3<f32>(0.014, 0.016, 0.022);
        let rimOil = vec3<f32>(0.28, 0.36, 0.52) * fresnel * 0.75;
        col = tarBase * (diff * 0.75 + 0.15) + rimOil + vec3<f32>(0.75, 0.85, 0.95) * tarSpec * 0.8;
      } else if (matId > 0.5) {
        // 材质 1：半眯的昏黄睡眼（带有暗黑横瞳缝）
        let pupilSlit = smoothstep(0.012, 0.032, abs(p.y - 0.64));
        let amberEye = vec3<f32>(0.98, 0.72, 0.16) * (1.35 + 0.9 * u.gazeIntensity);
        col = amberEye * pupilSlit;
      } else {
        // 材质 0：覆盖蝙蝠短毛的绒面黑佛巨蟾躯体（Oren-Nayar 绒毛边缘散射质感）
        let furTex = fbm3(p * 8.5);
        let batFurBlack = vec3<f32>(0.032, 0.030, 0.038);
        let charcoalBrown = vec3<f32>(0.085, 0.072, 0.068);
        var albedo = mix(batFurBlack, charcoalBrown, smoothstep(0.25, 0.78, furTex));
        // 绒毛逆光边缘光
        let furRim = vec3<f32>(0.42, 0.38, 0.48) * pow(1.0 - max(dot(n, v), 0.0), 2.2) * 0.85;
        col = albedo * (diff * 0.85 + 0.22) + furRim;
      }

      let fog = exp(-0.04 * t * t);
      col = mix(bgCave, col, fog);
    }

    col += slumberHalo;
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

    // 轻量单次通道后处理色差（避免重跑 3 遍 Raymarching，大幅省显卡）
    if (u.gazeIntensity > 0.02) {
      let edgeFactor = length(uv) * u.gazeIntensity;
      finalColor.r *= 1.0 + 0.28 * edgeFactor;
      finalColor.b *= max(0.4, 1.0 - 0.22 * edgeFactor);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.28, 1.0, vignette);
    }

    let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
    finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

    return vec4<f32>(finalColor, 1.0);
  }
`;

// 恩开伊地底幽蓝磷光孢子与昏黄睡梦微尘 Compute Shader
const TSATHOGGUA_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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
    if (idx >= 16384u) {
      return;
    }

    var p = particles[idx];
    var pos = p.pos.xyz;
    var phase = p.pos.w;
    let seed = p.vel.w;

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.65 + params.gazeIntensity * 1.8) * params.entropyScale;
    let t = params.time;

    // 极缓慢的催眠盘旋气流
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (0.48 / max(length(pos.xz), 0.45));
    let drift = vec3<f32>(
      sin(pos.y * 2.2 + t * 1.414 + seed * 10.0) * 0.18,
      0.16 + 0.15 * sin(t * 0.8 + seed * 12.0),
      cos(pos.y * 2.2 - t * 1.618 + seed * 10.0) * 0.18
    );

    let vel = swirl + drift;
    pos += vel * dt;
    phase += dt * 1.1;

    if (pos.y > 2.6 || length(pos.xz) > 4.2) {
      let ang = seed * 62.8318 + t * 1.732;
      let resetR = 0.65 + fract(seed * 17.3) * 2.5;
      pos = vec3<f32>(cos(ang) * resetR, -1.5 - fract(seed * 5.7) * 0.4, sin(ang) * resetR);
    }

    p.pos = vec4<f32>(pos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 幽蓝地穴磷光与睡眼昏黄琥珀微粒渲染着色器
const TSATHOGGUA_PARTICLE_RENDER_WGSL = /* wgsl */`
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

    let size = (0.011 + 0.013 * fract(seed * 13.3)) * (1.0 + u.gazeIntensity * 0.3);
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.3;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 恩开伊地穴幽蓝磷光、昏黄睡梦琥珀与黑泥紫灰配色
    let cCaveBlue = vec3<f32>(0.32, 0.52, 0.92);
    let cDrowsyAmber = vec3<f32>(0.96, 0.72, 0.24);
    let cVoidViolet = vec3<f32>(0.55, 0.38, 0.78);

    var col = mix(cCaveBlue, cDrowsyAmber, fract(seed * 4.1));
    col = mix(col, cVoidViolet, smoothstep(0.7, 1.0, fract(seed * 8.9)));

    let pulse = 0.45 + 0.55 * sin(phase * 2.8 + seed * 14.0);
    out.color = col * u.glowScale * pulse;
    out.alpha = (0.35 + 0.45 * pulse) * smoothstep(2.6, -1.6, abs(worldPos.y));
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

export class TsathogguaRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: TSATHOGGUA_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: TSATHOGGUA_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: TSATHOGGUA_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.006, g: 0.007, b: 0.011, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.65 + Math.random() * 2.6;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.4) * 3.6;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}