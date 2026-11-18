/**
 * 1-4-nyarlathotep.js — 奈亚拉托提普（黑法老假面与血腥巨舌怪动态坍缩 + 沙暴火星）
 * SDF / 色彩光影 / 粒子逻辑逐字保留自 3d.html，无简化。
 */
import { BaseEldritchRenderer } from '../core/webgpu-base.js';

const NYARLATHOTEP_RAYMARCH_WGSL = /* wgsl */`
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

      fn sdOctahedron(p : vec3<f32>, s : f32) -> f32 {
        let ap = abs(p);
        return (ap.x + ap.y + ap.z - s) * 0.57735027;
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
          p = p * 2.07 + vec3<f32>(19.1, 13.7, 29.3);
          amp *= 0.5;
        }
        return val;
      }

      // 奈亚拉托提普千面坍缩 SDF：vec2(最近距离, 材质权重: 0=黑法老黑曜石与圣金, 1=血腥巨舌怪猩红血肉)
      fn mapNyarlathotep(pos : vec3<f32>) -> vec2<f32> {
        let t = u.time * (0.9 + u.gazeIntensity * 1.45);
        let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.75);

        // 无理数准周期相位波：驱动“黑法老威严假面(0)”与“血腥巨舌怪(1)”之间的非线性坍缩
        let t1 = t * 1.4142135;
        let t2 = t * 1.6180339;
        let t3 = t * 2.7182818;
        let shiftWave = 0.5 + 0.35 * sin(t * 0.41421) + 0.25 * cos(t * 0.61803 + 1.1);
        let horrorMorph = clamp(smoothstep(0.32, 0.78, shiftWave) + u.gazeIntensity * 0.85, 0.0, 1.0);

        // 1. 高耸修长的黑法老暗影长袍躯体（底部化作蠕动暗影触须）
        var bodyP = pos - vec3<f32>(0.0, -0.35, 0.0);
        let robeSway = sin(bodyP.y * 2.4 - t2 * 1.5) * 0.16 * (1.0 + horrorMorph * 0.8);
        bodyP.x += robeSway;
        let robeWidth = mix(0.36, 0.88, clamp((-bodyP.y + 0.8) / 2.6, 0.0, 1.0));
        var dRobe = length(vec2<f32>(bodyP.x * 1.15, bodyP.z * 1.35)) - robeWidth;
        dRobe = max(dRobe, abs(bodyP.y + 0.1) - 1.65);

        // 2. 头部形态 A：黑法老棱角假面与太阳神日轮头冠
        var headP = pos - vec3<f32>(robeSway * 0.4, 0.92, 0.08);
        let maskDiamond = sdOctahedron(headP * vec3<f32>(1.25, 0.85, 1.35), 0.56);
        // 头顶悬浮的古埃及日轮圆环
        let haloRing = length(vec2<f32>(length((headP - vec3<f32>(0.0, 0.58, -0.05)).xy) - 0.34, headP.z + 0.05)) - 0.032;
        let dPharaoh = smin(maskDiamond, haloRing, 0.12);

        // 3. 头部形态 B：撕裂面具刺出的“血腥巨舌怪”巨型触手舌（horrorMorph 增强时剧烈伸展）
        var tongueP = pos - vec3<f32>(robeSway * 0.4, 0.88, 0.12);
        let tongueLen = 0.25 + horrorMorph * 2.35;
        let zForward = clamp(tongueP.z, 0.0, tongueLen);
        let whipX = sin(zForward * 3.4 - t3 * 1.8) * (0.28 * horrorMorph) * smoothstep(0.0, 1.8, zForward);
        let whipY = cos(zForward * 2.9 - t1 * 1.6) * (0.24 * horrorMorph) * smoothstep(0.0, 1.8, zForward) + zForward * 0.12;
        let tongueRad = max(0.02, (0.28 * horrorMorph + 0.04) * (1.0 - zForward / (tongueLen + 0.35)));
        var dTongue = length(vec2<f32>(tongueP.x - whipX, tongueP.y - whipY)) - tongueRad;
        dTongue = max(dTongue, max(-tongueP.z, tongueP.z - tongueLen));

        // 4. 两侧肩部伸出的三叉形暗影骨爪 / 祭司权杖臂
        var dArms = 100.0;
        for (var side = -1; side <= 1; side += 2) {
          let fs = f32(side);
          var ap = pos - vec3<f32>(fs * 0.48, 0.32, 0.05);
          let armRot = rot2D(fs * (0.55 + 0.35 * sin(t1 * 1.1 + fs)) + horrorMorph * fs * 0.3) * ap.xy;
          ap.x = armRot.x; ap.y = armRot.y;
          let reach = clamp(fs * ap.x, 0.0, 1.55);
          let wave = sin(reach * 4.0 - t2 * 2.0) * 0.12 * horrorMorph;
          let dArm = length(vec2<f32>(ap.y - wave, ap.z - reach * 0.25)) - (0.085 * (1.0 - reach * 0.45));
          let armMask = max(dArm, max(-fs * ap.x, fs * ap.x - 1.55));
          dArms = min(dArms, armMask);
        }

        // 融合躯干、法老假面、血腥巨舌与骨爪
        var d = smin(dRobe, dPharaoh, 0.18);
        d = smin(d, dTongue, 0.16);
        d = smin(d, dArms, 0.22);

        // 叠加法老几何刻纹与血肉蠕动噪波
        let advect = vec3<f32>(t * 0.1618, -t * 0.2236, t * 0.1414);
        let chaosNoise = fbm3(pos * 2.8 + advect);
        let pharaohCarving = abs(sin(pos.y * 18.0) * cos(pos.x * 18.0)) * 0.025 * (1.0 - horrorMorph);
        d += (chaosNoise - 0.48) * 0.18 * entropy * (0.35 + horrorMorph) - pharaohCarving;

        // 材质权重：0 偏向黑法老圣金，1 偏向血腥巨舌猩红
        let tongueMask = smoothstep(0.18, 0.0, dTongue - d);
        let matWeight = clamp(horrorMorph * 0.55 + tongueMask * 0.75 + (chaosNoise - 0.5) * 0.4 * horrorMorph, 0.0, 1.0);

        return vec2<f32>(d * 0.62, matWeight);
      }

      fn calcNormal(p : vec3<f32>) -> vec3<f32> {
        let e = vec2<f32>(0.0022, -0.0022);
        return normalize(
          e.xyy * mapNyarlathotep(p + e.xyy).x +
          e.yyx * mapNyarlathotep(p + e.yyx).x +
          e.yxy * mapNyarlathotep(p + e.yxy).x +
          e.xxx * mapNyarlathotep(p + e.xxx).x
        );
      }

      fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
        var uv = uv_in;
        let r2 = dot(uv, uv);
        uv *= 1.0 + u.gazeIntensity * 0.25 * r2 * cos(u.time * 4.2 + r2 * 3.0);

        let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.35) * camFwd);

        // 古埃及暗夜沙暴与扭曲星渊背景
        let storm = fbm3(rd * 3.6 + vec3<f32>(u.time * 0.08, u.time * 0.03, 0.0));
        let bgVoid = mix(vec3<f32>(0.012, 0.009, 0.014), vec3<f32>(0.055, 0.032, 0.022), storm);
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
        var avatarGlow = vec3<f32>(0.0);

        for (var i = 0; i < 64; i = i + 1) {
          let p = ro + rd * t;
          let res = mapNyarlathotep(p);
          let d = res.x;
          matWeight = res.y;

          let atten = 1.0 / (1.0 + d * d * 26.0);
          let glowCol = mix(
            vec3<f32>(0.88, 0.62, 0.18), // 黑法老日轮圣金
            vec3<f32>(0.78, 0.06, 0.16), // 血腥巨舌猩红
            matWeight
          );
          avatarGlow += glowCol * atten * 0.012 * u.glowScale * (1.0 + u.gazeIntensity * 0.9);

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

          let lightDir = normalize(vec3<f32>(2.0, 2.8, 2.5));
          let diff = max(dot(n, lightDir), 0.0);
          let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          let spec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 52.0);

          // 黑曜石神袍 + 埃及黄金面具 + 猩红巨舌血肉
          let obsidianRobe = vec3<f32>(0.022, 0.018, 0.028);
          let pharaohGold = vec3<f32>(0.96, 0.72, 0.22);
          let bloodyTongue = vec3<f32>(0.68, 0.04, 0.11);

          // 头部区域偏黄金假面，巨舌与坍缩区域偏猩红血肉
          let headMask = smoothstep(0.35, 0.95, p.y) * (1.0 - matWeight);
          var albedo = mix(obsidianRobe, pharaohGold, headMask * 0.85);
          albedo = mix(albedo, bloodyTongue, smoothstep(0.35, 0.88, matWeight));

          let rimCol = mix(pharaohGold, vec3<f32>(0.95, 0.15, 0.25), matWeight) * fresnel * 0.9;
          col = albedo * (diff * 0.85 + 0.16) + rimCol + vec3<f32>(1.0, 0.88, 0.65) * spec * 0.65;

          let fog = exp(-0.04 * t * t);
          col = mix(bgVoid, col, fog);
        }

        col += avatarGlow;
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
          let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.36 * u.gazeIntensity));
          finalColor *= mix(0.26, 1.0, vignette);
        }

        let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
        finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
        finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

        return vec4<f32>(finalColor, 1.0);
      }
`;

const NYAR_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

        let dt = clamp(params.deltaTime, 0.001, 0.05) * (1.0 + params.gazeIntensity * 2.0) * params.entropyScale;
        let t = params.time;

        // 螺旋上升的黄金沙暴涡流
        let rXZ = max(length(pos.xz), 0.35);
        let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (1.65 / sqrt(rXZ));
        let lift = vec3<f32>(
          sin(pos.y * 3.0 + t * 1.618 + seed * 10.0) * 0.35,
          0.42 + 0.25 * sin(seed * 20.0 + t * 1.414),
          cos(pos.y * 3.0 - t * 1.732 + seed * 10.0) * 0.35
        );

        let vel = swirl + lift;
        pos += vel * dt;
        phase += dt * 1.5;

        if (pos.y > 2.8 || rXZ > 4.6) {
          let ang = seed * 62.8318 + t * 2.718;
          let resetR = 0.65 + fract(seed * 13.7) * 2.6;
          pos = vec3<f32>(cos(ang) * resetR, -2.4 - fract(seed * 7.1) * 0.6, sin(ang) * resetR);
        }

        p.pos = vec4<f32>(pos, phase);
        p.vel = vec4<f32>(vel, seed);
        particles[idx] = p;
      }
`;

const NYAR_PARTICLE_RENDER_WGSL = /* wgsl */`
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
        let thickness = (0.008 + 0.008 * fract(seed * 15.3)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
        let quv = quad[vid];
        let pVert = relPos + camRight * quv.x * thickness + velDir * quv.y * thickness * 3.8;

        let xCam = dot(pVert, camRight);
        let yCam = dot(pVert, camUp);
        let zVert = dot(pVert, camFwd);

        let focal = 1.65 - u.gazeIntensity * 0.35;
        out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
        out.localUV = quv;

        // 随千面坍缩波在“法老金沙”与“血腥猩红火星”间流转
        let shiftWave = clamp(0.5 + 0.35 * sin(u.time * 0.41421) + 0.25 * cos(u.time * 0.61803 + 1.1) + u.gazeIntensity * 0.6, 0.0, 1.0);
        let cGoldSand = vec3<f32>(0.98, 0.74, 0.24);
        let cBloodSpark = vec3<f32>(0.92, 0.12, 0.18);
        let cObsidianGlow = vec3<f32>(0.55, 0.28, 0.85);

        var col = mix(cGoldSand, cBloodSpark, smoothstep(0.2, 0.85, shiftWave * 0.75 + fract(seed * 3.1) * 0.35));
        col = mix(col, cObsidianGlow, smoothstep(0.82, 1.0, fract(seed * 9.7)));

        out.color = col * u.glowScale;
        out.alpha = (0.4 + 0.45 * sin(phase * 3.5)) * smoothstep(2.8, -2.0, worldPos.y);
        return out;
      }

      @fragment
      fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
        let d = abs(in.localUV.x) * 1.4 + abs(in.localUV.y) * 0.65;
        if (d > 1.15) {
          discard;
        }
        let glow = exp(-d * d * 3.3);
        return vec4<f32>(in.color * glow, in.alpha * glow);
      }
`;

export class NyarlathotepRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: NYARLATHOTEP_RAYMARCH_WGSL,
      // 本尊 WGSL 自带专属 helper 与独立 fbm3 常量，关闭公共头自动拼接以逐字保留原始 WGSL
      useCommonHeader: false,
      computeCode: NYAR_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: NYAR_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.012, g: 0.009, b: 0.014, a: 1.0 },
      initParticles: (data, numParticles) => {
        for (let i = 0; i < numParticles; i++) {
          const seed = i / numParticles;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.75 + Math.random() * 2.8;
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
