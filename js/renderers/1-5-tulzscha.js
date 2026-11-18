/**
 * 1-5-tulzscha.js — 图尔兹查（螺旋升腾青炎巨柱 + 结晶灰烬核 + 上升磷火）
 * SDF / 色彩光影 / 粒子逻辑逐字保留自 3d.html，无简化。
 */
import { BaseEldritchRenderer } from '../core/webgpu-base.js';

const TULZSCHA_RAYMARCH_WGSL = /* wgsl */`
      struct Uniforms {
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

      @group(0) @binding(0) var<uniform> u : Uniforms;

      struct VSOut {
        @builtin(position) pos : vec4<f32>,
        @location(0) uv : vec2<f32>,
      };

      @vertex
      fn vs_main(@builtin(vertex_index) vid : u32) -> VSOut {
        var pos = array<vec2<f32>, 3>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>( 3.0, -1.0),
          vec2<f32>(-1.0,  3.0)
        );
        var out : VSOut;
        out.pos = vec4<f32>(pos[vid], 0.999, 1.0);
        out.uv = pos[vid];
        return out;
      }

      fn rot2D(a : f32) -> mat2x2<f32> {
        let s = sin(a);
        let c = cos(a);
        return mat2x2<f32>(c, -s, s, c);
      }

      fn smin(a : f32, b : f32, k : f32) -> f32 {
        let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }

      fn hash31(p3 : vec3<f32>) -> f32 {
        var p = fract(p3 * 0.1031);
        p += dot(p, p.zyx + 31.32);
        return fract((p.x + p.y) * p.z);
      }

      fn noise3D(x : vec3<f32>) -> f32 {
        let i = floor(x);
        let f = fract(x);
        let u_f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash31(i), hash31(i + vec3<f32>(1.0,0.0,0.0)), u_f.x),
              mix(hash31(i + vec3<f32>(0.0,1.0,0.0)), hash31(i + vec3<f32>(1.0,1.0,0.0)), u_f.x), u_f.y),
          mix(mix(hash31(i + vec3<f32>(0.0,0.0,1.0)), hash31(i + vec3<f32>(1.0,0.0,1.0)), u_f.x),
              mix(hash31(i + vec3<f32>(0.0,1.0,1.0)), hash31(i + vec3<f32>(1.0,1.0,1.0)), u_f.x), u_f.y),
          u_f.z
        );
      }

      fn fbm3(p_in : vec3<f32>) -> f32 {
        var p = p_in;
        var val = 0.0;
        var amp = 0.5;
        for (var i = 0; i < 2; i = i + 1) {
          val += amp * noise3D(p);
          p = p * 2.09 + vec3<f32>(11.3, 23.7, 17.9);
          amp *= 0.5;
        }
        return val;
      }

      // 图尔兹查青炎巨柱 SDF：vec2(最近距离, 材质权重: 0=灰白结晶灰烬核, 1=外层冷冽翠绿火焰)
      fn mapTulzscha(pos : vec3<f32>) -> vec2<f32> {
        let t = u.time * (1.05 + u.gazeIntensity * 1.5);
        let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.8);

        // 无理数准周期上升气流时间基准
        let t1 = t * 1.4142135;
        let t2 = t * 1.6180339;
        let t3 = t * 2.7182818;

        // 1. 贯穿天地的非欧螺旋火焰柱主干（随高度产生无理数扭转与收束）
        var p = pos;
        let heightTwist = p.y * (1.35 + 0.45 * u.gazeIntensity) - t2 * 1.45;
        let rXZ = rot2D(heightTwist) * p.xz;
        p.x = rXZ.x;
        p.z = rXZ.y;

        // 柱体粗细随高度呼吸波动，上下延伸超出视野形成通天巨柱感
        let radiusProfile = 0.72 + 0.16 * sin(p.y * 2.1 - t1 * 1.8) + 0.10 * cos(p.y * 3.7 + t3 * 1.1);
        var dCore = length(p.xz) - radiusProfile * 0.52;
        dCore = max(dCore, abs(p.y) - 3.6);

        // 2. 四股逆重力向上撕裂盘旋的外层青炎火舌（Helical Cold-Flame Tongues）
        var dFlames = 100.0;
        for (var k = 0; k < 4; k = k + 1) {
          let fk = f32(k);
          let ang = fk * 1.570796 + p.y * 1.85 - t1 * 2.1;
          let orbitR = 0.58 + 0.24 * sin(p.y * 2.6 - t2 * 1.7 + fk * 1.9);
          let tongueCenter = vec2<f32>(cos(ang), sin(ang)) * orbitR;
          let tongueRad = (0.24 + 0.10 * sin(p.y * 4.2 - t3 * 2.3 + fk)) * (1.0 + 0.2 * u.gazeIntensity);
          let dTongue = length(pos.xz - tongueCenter) - tongueRad;
          dFlames = smin(dFlames, dTongue, 0.28);
        }
        dFlames = max(dFlames, abs(pos.y) - 3.8);

        var d = smin(dCore, dFlames, 0.24);

        // 3. 向上单向平流的冷火湍流撕裂与结晶棱面置换
        let upwardFlow = vec3<f32>(t * 0.1414, -t * 1.25, t * 0.1732);
        let flameTurb = fbm3(p * 2.45 + upwardFlow);
        // 结晶灰烬的锐利几何刻面感
        let crystalFacet = abs(fract(p.x * 4.5 + p.y * 3.2) - 0.5) * 0.14 * (1.0 - smoothstep(0.4, 1.1, length(pos.xz)));

        d += (flameTurb - 0.46) * 0.34 * entropy - crystalFacet;

        // 内部偏向灰白结晶骸骨(0)，外层火舌偏向炽冷翠绿青炎(1)
        let radialBlend = smoothstep(0.32, 0.95, length(pos.xz) + (flameTurb - 0.4) * 0.45);
        return vec2<f32>(d * 0.56, radialBlend);
      }

      fn calcNormal(p : vec3<f32>) -> vec3<f32> {
        let e = vec2<f32>(0.0022, -0.0022);
        return normalize(
          e.xyy * mapTulzscha(p + e.xyy).x +
          e.yyx * mapTulzscha(p + e.yyx).x +
          e.yxy * mapTulzscha(p + e.yxy).x +
          e.xxx * mapTulzscha(p + e.xxx).x
        );
      }

      fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
        var uv = uv_in;
        let r2 = dot(uv, uv);
        // 寒冰冷火折射热浪畸变
        uv.x += sin(uv.y * 12.0 - u.time * 4.5) * 0.006 * (1.0 + u.gazeIntensity * 4.5);
        uv *= 1.0 + u.gazeIntensity * 0.22 * r2;

        let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.32) * camFwd);

        // 极寒深渊墨绿虚空背景
        let bgNoise = fbm3(rd * 3.5 + vec3<f32>(0.0, -u.time * 0.12, 0.0));
        let bgVoid = mix(vec3<f32>(0.005, 0.012, 0.010), vec3<f32>(0.015, 0.045, 0.035), bgNoise);
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
        var flameWeight = 0.0;
        var coldFireHalo = vec3<f32>(0.0);

        for (var i = 0; i < 64; i = i + 1) {
          let p = ro + rd * t;
          let res = mapTulzscha(p);
          let d = res.x;
          flameWeight = res.y;

          // 强烈的外溢冷翠绿磷火体积辉光
          let atten = 1.0 / (1.0 + d * d * 20.0);
          let fireCol = mix(
            vec3<f32>(0.04, 0.85, 0.52), // 幽冥翠绿冷火
            vec3<f32>(0.45, 0.98, 0.82), // 极寒青白磷光
            0.5 + 0.5 * sin(p.y * 3.2 - u.time * 3.5)
          );
          coldFireHalo += fireCol * atten * 0.016 * u.glowScale * (1.0 + u.gazeIntensity * 0.85);

          if (d < 0.002) {
            hit = true;
            break;
          }
          if (t > tEnd) {
            break;
          }
          t += max(d, 0.011);
        }

        if (hit) {
          let p = ro + rd * t;
          let n = calcNormal(p);
          let v = -rd;

          let lightDir = normalize(vec3<f32>(1.5, 2.5, 2.2));
          let diff = max(dot(n, lightDir), 0.0);
          let fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.5);
          // 结晶表面的高锐度冰晶高光
          let crystalSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 64.0);

          // 内部灰白结晶灰烬核 + 外层腐朽翠绿冷火
          let ashCrystal = vec3<f32>(0.68, 0.78, 0.75);
          let emeraldFlame = vec3<f32>(0.05, 0.92, 0.48);
          let toxicTeal = vec3<f32>(0.02, 0.42, 0.32);

          var albedo = mix(ashCrystal, emeraldFlame * 1.35, smoothstep(0.25, 0.85, flameWeight));
          albedo = mix(albedo, toxicTeal, (1.0 - diff) * 0.45);

          let rimCol = vec3<f32>(0.55, 1.0, 0.82) * fresnel * 1.1;
          col = albedo * (diff * 0.75 + 0.35) + rimCol + vec3<f32>(0.9, 1.0, 0.96) * crystalSpec * 0.8;

          let fog = exp(-0.038 * t * t);
          col = mix(bgVoid, col, fog);
        }

        col += coldFireHalo;
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
          let caOffset = uv * (0.019 * u.gazeIntensity * length(uv));
          finalColor.r = mix(finalColor.r, renderScene(uv + caOffset, ro, camRight, camUp, camFwd).r, 0.8);
          finalColor.b = mix(finalColor.b, renderScene(uv - caOffset, ro, camRight, camUp, camFwd).b, 0.8);
          let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.35 * u.gazeIntensity));
          finalColor *= mix(0.28, 1.0, vignette);
        }

        let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
        finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
        finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

        return vec4<f32>(finalColor, 1.0);
      }
`;

const TULZSCHA_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

        let dt = clamp(params.deltaTime, 0.001, 0.05) * (1.0 + params.gazeIntensity * 2.1) * params.entropyScale;
        let t = params.time;

        // 强烈向上的螺旋冷火热对流（向上升腾 + 绕轴旋进）
        let rXZ = max(length(pos.xz), 0.25);
        let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (1.45 / sqrt(rXZ));
        let updraft = vec3<f32>(
          sin(pos.y * 3.4 + t * 1.618 + seed * 14.0) * 0.35,
          1.25 + 0.65 * fract(seed * 9.1),
          cos(pos.y * 3.4 - t * 1.414 + seed * 14.0) * 0.35
        );

        let vel = swirl + updraft;
        pos += vel * dt;
        phase += dt * 1.8;

        if (pos.y > 3.6 || rXZ > 4.2) {
          let ang = seed * 62.8318 + t * 2.718;
          let resetR = 0.45 + fract(seed * 17.3) * 2.1;
          pos = vec3<f32>(cos(ang) * resetR, -3.4 - fract(seed * 5.7) * 0.6, sin(ang) * resetR);
        }

        p.pos = vec4<f32>(pos, phase);
        p.vel = vec4<f32>(vel, seed);
        particles[idx] = p;
      }
`;

const TULZSCHA_PARTICLE_RENDER_WGSL = /* wgsl */`
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
        let thickness = (0.007 + 0.008 * fract(seed * 13.9)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
        let quv = quad[vid];
        let pVert = relPos + camRight * quv.x * thickness + velDir * quv.y * thickness * 3.4;

        let xCam = dot(pVert, camRight);
        let yCam = dot(pVert, camUp);
        let zVert = dot(pVert, camFwd);

        let focal = 1.65 - u.gazeIntensity * 0.32;
        out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
        out.localUV = quv;

        // 翠绿磷火、青白极光与灰白结晶灰烬配色
        let cEmeraldFire = vec3<f32>(0.06, 0.95, 0.54);
        let cFrostCyan = vec3<f32>(0.42, 0.98, 0.86);
        let cAshWhite = vec3<f32>(0.85, 0.92, 0.90);

        var col = mix(cEmeraldFire, cFrostCyan, smoothstep(0.15, 0.85, fract(seed * 4.3)));
        col = mix(col, cAshWhite, smoothstep(0.75, 1.0, fract(seed * 11.1)));

        out.color = col * u.glowScale;
        out.alpha = (0.42 + 0.45 * sin(phase * 4.0)) * smoothstep(3.6, -2.5, abs(worldPos.y));
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

export class TulzschaRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: TULZSCHA_RAYMARCH_WGSL,
      // 本尊 WGSL 自带专属 helper 与独立 fbm3 常量，关闭公共头自动拼接以逐字保留原始 WGSL
      useCommonHeader: false,
      computeCode: TULZSCHA_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: TULZSCHA_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.005, g: 0.012, b: 0.010, a: 1.0 },
      initParticles: (data, numParticles) => {
        for (let i = 0; i < numParticles; i++) {
          const seed = i / numParticles;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.55 + Math.random() * 2.4;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.5) * 6.8;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random() * 10.0;
          data[base + 7] = seed;
        }
      }
    });
  }
}
