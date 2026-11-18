/**
 * 1-6-abhoth.js — 阿布霍斯（不净者之源、终极污秽之池）
 * 复用 BaseEldritchRenderer 与 COMMON_RAYMARCH_HEADER_WGSL，SDF/配色/粒子逻辑按片段逐字保留。
 */
// MODIFIED: 新增 1-6 阿布霍斯（不净者之源、终极污秽之池）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const ABHOTH_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  // 阿布霍斯污秽原生质巨池 SDF：vec2(最近距离, 材质权重: 0=灰白粘稠原生质池面, 1=撕裂紫红消化腔与眼球裂隙)
  fn mapAbhoth(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.85 + u.gazeIntensity * 1.4);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.8);

    // 无理数准周期时间基准
    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    // 1. 广袤沸腾的原生质沼泽盆地主池（扁平椭球池体 + 中心凹陷吞噬口）
    var poolP = pos - vec3<f32>(0.0, -0.45, 0.0);
    poolP.y *= 2.35;
    let rXZ = length(pos.xz);
    // 中心吞噬漩涡下凹，边缘隆起
    let mawDip = 0.42 * exp(-rXZ * rXZ * 1.35) * (1.0 + 0.5 * u.gazeIntensity);
    var d = length(poolP) - (1.85 - mawDip);

    // 2. 池面 8 团不断鼓胀分裂的灰白原生质囊泡与畸形胎体（smin 高粘滞度融合）
    for (var i = 0; i < 8; i = i + 1) {
      let fi = f32(i);
      let wA = 0.61803 + fi * 0.1414;
      let wB = 0.73205 + fi * 0.1732;
      let ang = fi * 0.785398 + sin(t * wA) * 0.4;
      let dist = 0.55 + 0.85 * fract(sin(fi * 12.9898 + t * wB * 0.25) * 43758.5453);
      let bubbleH = -0.35 + 0.48 * sin(t * wB * 1.6 + fi * 2.1) * entropy;
      let bPos = vec3<f32>(cos(ang) * dist, bubbleH, sin(ang) * dist);
      let bRad = 0.24 + 0.14 * cos(t * wA * 1.8 + fi * 1.7);
      d = smin(d, length(pos - bPos) - bRad, 0.36);
    }

    // 3. 6 条拱起探出并向池心拖拽回收的灰暗捕食触腕（Engulfing Pseudopods）
    for (var k = 0; k < 6; k = k + 1) {
      let fk = f32(k);
      var tp = pos - vec3<f32>(0.0, -0.35, 0.0);
      let yaw = fk * 1.047197 + sin(t * (0.2718 + fk * 0.0414)) * 0.32;
      let rxz = rot2D(yaw) * tp.xz;
      tp.x = rxz.x; tp.z = rxz.y;

      // 触腕从池心向外拱起形成爪状弧线
      let reach = clamp(tp.x, 0.2, 2.35);
      let archCycle = sin(t1 * 1.1 + fk * 1.9);
      let archY = sin((reach - 0.2) * 1.45) * (0.75 + 0.32 * archCycle) - (reach - 1.1) * (reach - 1.1) * 0.22;
      let swayZ = cos(reach * 3.1 - t2 * 1.7 + fk) * 0.18;
      let tentRad = max(0.018, 0.19 * exp(-(reach - 0.3) * 0.55));

      let dTent = length(vec2<f32>(tp.y - archY, tp.z - swayZ)) - tentRad;
      let tentMask = max(dTent, max(-tp.x + 0.2, tp.x - 2.35));
      d = smin(d, tentMask, 0.28);
    }

    // 4. 粘稠原生质沸腾褶皱与 Gyroid 消化孔隙
    let advect = vec3<f32>(t * 0.1414, -t * 0.2236, t * 0.1732);
    let protoNoise = fbm3(pos * 2.4 + advect);
    let pores = sdGyroid(pos * 1.6 - advect * 0.8, 5.2);

    d += (protoNoise - 0.47) * 0.26 * entropy + (pores - 0.14) * 0.14 * entropy;

    // 消化腔裂隙权重：中心漩涡与孔隙深处露出暗紫红消化内壁
    let centerMaw = smoothstep(1.25, 0.15, rXZ);
    let fissure = clamp(centerMaw * 0.75 + (0.28 - pores) * 1.8 + (protoNoise - 0.52) * 0.8, 0.0, 1.0);

    return vec2<f32>(d * 0.58, fissure);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapAbhoth(p + e.xyy).x +
      e.yyx * mapAbhoth(p + e.yyx).x +
      e.yxy * mapAbhoth(p + e.yxy).x +
      e.xxx * mapAbhoth(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    let r2 = dot(uv, uv);
    // 凝视时产生粘稠液面波纹吸力畸变
    uv *= 1.0 - u.gazeIntensity * 0.22 * exp(-r2 * 2.2) + u.gazeIntensity * 0.18 * r2;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.32) * camFwd);

    // 恩开伊地下无底洞窟幽暗背景
    let caveNoise = fbm3(rd * 3.5 + vec3<f32>(u.time * 0.04));
    let bgVoid = mix(vec3<f32>(0.008, 0.009, 0.009), vec3<f32>(0.032, 0.028, 0.034), caveNoise);
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
    var matWeight = 0.0;
    var slimeGlow = vec3<f32>(0.0);

    for (var i = 0; i < 64; i = i + 1) {
      let p = ro + rd * t;
      let res = mapAbhoth(p);
      let d = res.x;
      matWeight = res.y;

      let atten = 1.0 / (1.0 + d * d * 24.0);
      let glowCol = mix(
        vec3<f32>(0.42, 0.46, 0.36), // 病态灰白原生质冷光
        vec3<f32>(0.52, 0.10, 0.24), // 消化腔暗紫红内光
        matWeight
      );
      slimeGlow += glowCol * atten * 0.012 * u.glowScale * (1.0 + u.gazeIntensity * 0.85);

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

      let lightDir = normalize(vec3<f32>(1.6, 3.4, 2.0));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.8);
      // 极度湿滑粘稠的原生质胶质高光
      let mucusSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 64.0);

      // 灰白色粘稠原生质 + 病态脓黄 + 紫红消化内腔
      let paleProtoplasm = vec3<f32>(0.46, 0.48, 0.42);
      let sicklyBile = vec3<f32>(0.58, 0.54, 0.26);
      let digestiveCrimson = vec3<f32>(0.42, 0.05, 0.15);

      var albedo = mix(paleProtoplasm, sicklyBile, smoothstep(0.2, 0.6, matWeight));
      albedo = mix(albedo, digestiveCrimson * 1.35, smoothstep(0.58, 0.92, matWeight));

      let rimCol = mix(vec3<f32>(0.68, 0.72, 0.62), vec3<f32>(0.85, 0.22, 0.38), matWeight) * fresnel * 0.85;
      col = albedo * (diff * 0.82 + 0.18) + rimCol + vec3<f32>(0.92, 0.95, 0.88) * mucusSpec * 0.75;

      let fog = exp(-0.04 * t * t);
      col = mix(bgVoid, col, fog);
    }

    col += slimeGlow;
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

// 分裂诞生 -> 挣扎外逃 -> 被母池拖拽回心吞噬的畸形造物粒子 Compute Shader
const ABHOTH_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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
    var life = p.pos.w;
    let seed = p.vel.w;

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.9 + params.gazeIntensity * 1.9) * params.entropyScale;
    let t = params.time;

    life += dt * (0.28 + fract(seed * 7.1) * 0.32);

    // 前半段生命周期向外爬行逃离，后半段被母池触腕强行拖拽回池心吞噬
    let escapeOrDrag = select(1.0, -1.65, life > 0.52);
    let rXZ = max(length(pos.xz), 0.15);
    let radialDir = vec3<f32>(pos.x / rXZ, 0.0, pos.z / rXZ);
    let crawlWiggle = vec3<f32>(
      sin(t * 2.718 + seed * 20.0),
      sin(life * 6.28318) * 0.45,
      cos(t * 1.618 + seed * 20.0)
    ) * 0.45;

    let vel = radialDir * (0.85 * escapeOrDrag) + crawlWiggle;
    pos += vel * dt;
    pos.y = max(-0.42, pos.y);

    // 被拖回中心吞噬后，在池面重新冒泡分裂诞生
    if (life >= 1.0 || (life > 0.55 && rXZ < 0.35)) {
      life = fract(life);
      let ang = seed * 62.8318 + t * 1.414;
      let birthR = 0.45 + fract(seed * 19.3) * 1.1;
      pos = vec3<f32>(cos(ang) * birthR, -0.35 + fract(seed * 11.7) * 0.25, sin(ang) * birthR);
    }

    p.pos = vec4<f32>(pos, life);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 灰白原生质孢子与荧光绿/暗红游离眼球粒子渲染着色器
const ABHOTH_PARTICLE_RENDER_WGSL = /* wgsl */`
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
    let life = p.pos.w;
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

    let size = ((0.013 + 0.017 * fract(seed * 17.3)) * sin(life * 3.14159)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
    let quv = quad[vid];
    let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.32;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 灰白原生质孢子 + 脓黄体液 + 猩红吞噬血光
    let cPaleSpawn = vec3<f32>(0.82, 0.85, 0.76);
    let cBileYellow = vec3<f32>(0.78, 0.72, 0.25);
    let cDevourRed = vec3<f32>(0.85, 0.14, 0.28);

    let isBeingDragged = smoothstep(0.45, 0.75, life);
    var col = mix(cPaleSpawn, cBileYellow, fract(seed * 4.7));
    col = mix(col, cDevourRed, isBeingDragged * 0.85);

    out.color = col * u.glowScale;
    out.alpha = sin(life * 3.14159) * 0.75;
    return out;
  }

  @fragment
  fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
    let r2 = dot(in.localUV, in.localUV);
    if (r2 > 1.0) {
      discard;
    }
    let glow = exp(-r2 * 3.3);
    return vec4<f32>(in.color * glow, in.alpha * glow);
  }
`;

export class AbhothRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: ABHOTH_RAYMARCH_WGSL,
      // raymarchCode 已用 ${COMMON_RAYMARCH_HEADER_WGSL} 内嵌公共头，关闭基类自动拼接以免 WGSL 重复定义
      useCommonHeader: false,
      computeCode: ABHOTH_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: ABHOTH_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.008, g: 0.009, b: 0.009, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.45 + Math.random() * 1.9;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = -0.35 + Math.random() * 0.55;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random(); // life 0..1
          data[base + 7] = seed;
        }
      }
    });
  }
}
