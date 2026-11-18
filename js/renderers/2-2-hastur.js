// MODIFIED: 新增 2-2 哈斯塔（无以名状者、黄衣之王、毕宿五的深空君主）独立 WebGPU 渲染器
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const HASTUR_RAYMARCH_WGSL = /* wgsl */`
  ${COMMON_RAYMARCH_HEADER_WGSL}

  // 三维立体“黄印”(The Yellow Sign) 三曲螺旋徽记距离场
  fn sdYellowSign(p : vec3<f32>, t : f32) -> f32 {
    var q = p;
    let rSpin = rot2D(t * 0.65) * q.xy;
    q.x = rSpin.x; q.y = rSpin.y;

    // 外围破损王冠圆环
    let outerRing = length(vec2<f32>(length(q.xy) - 0.52, q.z)) - 0.024;
    // 内部三旋臂螺旋曲线
    let ang = atan2(q.y, q.x);
    let rad = length(q.xy);
    let spiralWave = sin(ang * 3.0 - rad * 9.5 + t * 1.8);
    let innerSigil = length(vec2<f32>(spiralWave * 0.08, q.z)) - 0.022;
    let sigilMask = max(innerSigil, rad - 0.48);

    return min(outerRing, sigilMask);
  }

  // 哈斯塔（黄衣之王）SDF：vec2(最近距离, 材质ID: 0=褴褛硫磺黄袍, 1=苍白空洞假面, 2=炽热黄印圣徽)
  fn mapHastur(pos : vec3<f32>) -> vec2<f32> {
    let t = u.time * (0.85 + u.gazeIntensity * 1.4);
    let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.75);

    // 无理数准周期狂风摆动节律
    let t1 = t * 1.4142135;
    let t2 = t * 1.6180339;
    let t3 = t * 2.7182818;

    let hoverY = 0.12 * sin(t1 * 0.75) + 0.06 * cos(t2 * 0.55);
    var p = pos - vec3<f32>(0.0, hoverY, 0.0);

    // 1. 苍白假面（Pale Mask）：光滑冷峻的椭圆面具，凝视时从中央纵向裂开虚空黑缝
    var maskP = p - vec3<f32>(0.0, 1.08, 0.18);
    maskP.x *= 1.38;
    maskP.y *= 0.88;
    maskP.z *= 1.45;
    var dMask = length(maskP) - 0.36;
    // 削平假面背面形成空壳面具感
    dMask = max(dMask, -maskP.z - 0.08);
    // 长按《黄衣之王》第二幕时，苍白假面裂开深渊缝隙
    let crackWidth = 0.008 + u.gazeIntensity * 0.085;
    let maskSplit = crackWidth - abs(maskP.x + sin(maskP.y * 8.0 + t2) * 0.02);
    dMask = max(dMask, maskSplit);

    // 2. 兜帽与层层叠叠的褴褛黄袍（Tattered Yellow Robe）
    var robeP = p - vec3<f32>(0.0, -0.25, 0.0);
    // 狂风自左侧吹拂产生的非线性布料波浪褶皱
    let windWaveX = sin(robeP.y * 2.6 - t1 * 1.9) * 0.24 + cos(robeP.y * 4.3 - t3 * 1.3) * 0.10;
    let windWaveZ = cos(robeP.y * 2.2 - t2 * 1.7) * 0.18;
    robeP.x -= windWaveX * smoothstep(1.3, -1.8, robeP.y);
    robeP.z -= windWaveZ * smoothstep(1.3, -1.8, robeP.y);

    // 上窄下宽的斗篷圆锥壳体
    let downNorm = clamp((1.35 - robeP.y) / 3.1, 0.0, 1.0);
    let coneRadius = mix(0.32, 1.15, pow(downNorm, 0.85));
    let foldAngle = atan2(robeP.z, robeP.x);
    let clothFolds = sin(foldAngle * 9.0 + robeP.y * 3.5 - t1 * 2.2) * (0.08 + 0.06 * downNorm) * entropy;
    var dRobe = abs(length(robeP.xz) - (coneRadius + clothFolds)) - (0.045 + 0.02 * (1.0 - downNorm));
    dRobe = max(dRobe, abs(robeP.y - 0.05) - 1.55);

    // 3. 8 条向四周狂风中撕裂飘荡的触须状黄绸缎带（Tattered Ribbons / Tendrils）
    var dRibbons = 100.0;
    for (var k = 0; k < 8; k = k + 1) {
      let fk = f32(k);
      var rp = p - vec3<f32>(0.0, 0.35 - fk * 0.14, -0.05);
      let sideDir = select(-1.0, 1.0, k % 2 == 0);
      let yaw = sideDir * (0.45 + 0.25 * sin(fk * 1.7 + t * 0.31)) + sin(t2 * 0.4 + fk) * 0.2;
      let rXZ = rot2D(yaw) * rp.xz;
      rp.x = rXZ.x; rp.z = rXZ.y;

      let span = max(0.0, sideDir * rp.x);
      let flutterY = sin(span * 3.8 - t1 * 2.6 + fk * 1.5) * 0.28 * smoothstep(0.2, 2.5, span) - span * 0.22;
      let flutterZ = cos(span * 3.2 - t3 * 2.1 + fk * 2.1) * 0.24 * smoothstep(0.2, 2.5, span);
      let ribbonThick = max(0.012, 0.075 * exp(-span * 0.55));
      let dRib = length(vec2<f32>(rp.y - flutterY, rp.z - flutterZ)) - ribbonThick;
      let ribMask = max(dRib, max(-sideDir * rp.x + 0.25, sideDir * rp.x - 2.65));
      dRibbons = min(dRibbons, ribMask);
    }

    let clothNoise = fbm3(p * 3.2 + vec3<f32>(-t * 0.35, t * 0.12, 0.0));
    var dGarment = smin(dRobe, dRibbons, 0.16) + (clothNoise - 0.48) * 0.08 * entropy;

    // 4. 悬浮于胸前与头顶的双重立体“黄印”圣徽
    let signChest = sdYellowSign(p - vec3<f32>(0.0, 0.25, 0.68), t);
    let signCrown = sdYellowSign((p - vec3<f32>(0.0, 1.72, 0.05)) * 1.15, -t * 1.3) / 1.15;
    let dSign = min(signChest, signCrown);

    if (dSign < dGarment && dSign < dMask) {
      return vec2<f32>(dSign * 0.65, 2.0);
    }
    if (dMask < dGarment) {
      return vec2<f32>(dMask * 0.65, 1.0);
    }
    return vec2<f32>(dGarment * 0.62, 0.0);
  }

  fn calcNormal(p : vec3<f32>) -> vec3<f32> {
    let e = vec2<f32>(0.0022, -0.0022);
    return normalize(
      e.xyy * mapHastur(p + e.xyy).x +
      e.yyx * mapHastur(p + e.yyx).x +
      e.yxy * mapHastur(p + e.yxy).x +
      e.xxx * mapHastur(p + e.xxx).x
    );
  }

  fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
    var uv = uv_in;
    // 毕宿五狂风与黄印精神螺旋扭曲
    let r2 = dot(uv, uv);
    let swirl = u.gazeIntensity * 0.32 * exp(-r2 * 1.8);
    uv = rot2D(swirl * sin(u.time * 2.5)) * uv;

    let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.32) * camFwd);

    // 卡尔克萨双星暗夜与黑暗哈利湖倒影背景
    let windCloud = fbm3(rd * 3.8 + vec3<f32>(-u.time * 0.14, u.time * 0.03, 0.0));
    let bgCarcosa = mix(vec3<f32>(0.014, 0.010, 0.006), vec3<f32>(0.075, 0.052, 0.015), windCloud);
    var col = bgCarcosa;

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
    var yellowHalo = vec3<f32>(0.0);

    for (var i = 0; i < 64; i = i + 1) {
      let p = ro + rd * t;
      let res = mapHastur(p);
      let d = res.x;
      matId = res.y;

      let atten = 1.0 / (1.0 + d * d * 24.0);
      let glowCol = mix(
        vec3<f32>(0.78, 0.56, 0.12), // 王权硫磺金辉
        vec3<f32>(0.98, 0.86, 0.38), // 炽热黄印圣光
        step(1.5, matId)
      );
      yellowHalo += glowCol * atten * 0.012 * u.glowScale * (1.0 + u.gazeIntensity * 0.95);

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
      let lightDir = normalize(vec3<f32>(1.8, 2.8, 2.4));
      let diff = max(dot(n, lightDir), 0.0);
      let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);

      if (matId > 1.5) {
        // 材质 2：炽热燃烧的“黄印”立体符文
        let signPulse = 1.45 + 0.9 * u.gazeIntensity + 0.25 * sin(u.time * 5.0);
        col = vec3<f32>(1.0, 0.84, 0.28) * signPulse;
      } else if (matId > 0.5) {
        // 材质 1：冰冷死寂的苍白瓷质假面（Pale Mask）
        let porcelain = vec3<f32>(0.86, 0.84, 0.78);
        let maskSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 64.0);
        col = porcelain * (diff * 0.85 + 0.22) + vec3<f32>(1.0, 0.92, 0.65) * fresnel * 0.65 + vec3<f32>(1.0) * maskSpec * 0.5;
      } else {
        // 材质 0：腐朽褴褛的硫磺黄袍（破败金黄、焦褐暗影与丝绸边缘光）
        let fabricTex = fbm3(p * 6.5);
        let sulfurYellow = vec3<f32>(0.76, 0.54, 0.12);
        let charredOchre = vec3<f32>(0.24, 0.14, 0.04);
        var albedo = mix(charredOchre, sulfurYellow, smoothstep(0.2, 0.82, fabricTex));
        let rimCol = vec3<f32>(0.98, 0.78, 0.28) * fresnel * 0.95;
        col = albedo * (diff * 0.85 + 0.16) + rimCol;
      }

      let fog = exp(-0.04 * t * t);
      col = mix(bgCarcosa, col, fog);
    }

    col += yellowHalo;
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
      let caOffset = uv * (0.02 * u.gazeIntensity * length(uv));
      finalColor.r = mix(finalColor.r, renderScene(uv + caOffset, ro, camRight, camUp, camFwd).r, 0.8);
      finalColor.b = mix(finalColor.b, renderScene(uv - caOffset, ro, camRight, camUp, camFwd).b, 0.8);
      let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
      finalColor *= mix(0.25, 1.0, vignette);
    }

    let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
    finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
    finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

    return vec4<f32>(finalColor, 1.0);
  }
`;

// 毕宿五狂风中的黄袍余烬与精神腐化金尘 Compute Shader
const HASTUR_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

    let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.95 + params.gazeIntensity * 2.0) * params.entropyScale;
    let t = params.time;

    // 环绕黄衣之王的毕宿五螺旋狂风气流
    let rXZ = max(length(pos.xz), 0.35);
    let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (1.55 / sqrt(rXZ));
    let gale = vec3<f32>(
      0.45 + 0.35 * sin(pos.y * 2.5 + t * 1.618 + seed * 12.0),
      0.28 * cos(rXZ * 3.0 - t * 1.414 + seed * 9.0),
      0.35 * sin(pos.x * 2.8 - t * 1.732 + seed * 15.0)
    );

    let vel = swirl + gale;
    pos += vel * dt;
    phase += dt * 1.5;

    if (pos.x > 4.2 || abs(pos.y) > 3.2 || rXZ > 4.6) {
      let ang = seed * 62.8318 + t * 2.718;
      let resetR = 0.65 + fract(seed * 17.3) * 2.8;
      pos = vec3<f32>(cos(ang) * resetR - 1.2, (fract(seed * 23.1) - 0.5) * 4.4, sin(ang) * resetR);
    }

    p.pos = vec4<f32>(pos, phase);
    p.vel = vec4<f32>(vel, seed);
    particles[idx] = p;
  }
`;

// 硫磺金绸余烬与苍白面具碎屑粒子渲染着色器
const HASTUR_PARTICLE_RENDER_WGSL = /* wgsl */`
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

    let velDir = normalize(p.vel.xyz + vec3<f32>(0.0001));
    let thickness = (0.008 + 0.008 * fract(seed * 14.3)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
    let quv = quad[vid];
    let pVert = relPos + camRight * quv.x * thickness + velDir * quv.y * thickness * 3.6;

    let xCam = dot(pVert, camRight);
    let yCam = dot(pVert, camUp);
    let zVert = dot(pVert, camFwd);

    let focal = 1.65 - u.gazeIntensity * 0.32;
    out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
    out.localUV = quv;

    // 硫磺王权金、焦褐余烬与苍白假面微光配色
    let cSulfurGold = vec3<f32>(0.98, 0.76, 0.22);
    let cOchreEmber = vec3<f32>(0.85, 0.45, 0.12);
    let cPaleIvory = vec3<f32>(0.96, 0.92, 0.80);

    var col = mix(cSulfurGold, cOchreEmber, fract(seed * 4.3));
    col = mix(col, cPaleIvory, smoothstep(0.75, 1.0, fract(seed * 9.7)));

    let flutter = 0.5 + 0.5 * sin(phase * 4.2 + seed * 14.0);
    out.color = col * u.glowScale * flutter;
    out.alpha = (0.4 + 0.45 * flutter) * smoothstep(3.2, -2.5, abs(worldPos.y));
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

export class HasturRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: HASTUR_RAYMARCH_WGSL,
      useCommonHeader: false,
      computeCode: HASTUR_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: HASTUR_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.014, g: 0.010, b: 0.006, a: 1.0 },
      initParticles: (data, count) => {
        for (let i = 0; i < count; i++) {
          const seed = i / count;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.65 + Math.random() * 2.9;
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