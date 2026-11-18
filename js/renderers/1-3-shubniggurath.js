/**
 * 1-3-shubniggurath.js — 莎布·尼古拉丝（腐殖黑肉云团 + 5 山羊蹄足 + 8 纠缠触须 + 孕育孢子）
 * SDF / 色彩光影 / 粒子逻辑逐字保留自 3d.html，无简化。
 */
import { BaseEldritchRenderer } from '../core/webgpu-base.js';

const SHUB_RAYMARCH_WGSL = /* wgsl */`
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
          p = p * 2.05 + vec3<f32>(17.3, 11.1, 23.7);
          amp *= 0.5;
        }
        return val;
      }

      // 森之黑山羊距离场：vec2(最近距离, 材质权重: 0=沥青黑肉树皮, 1=强酸毒绿/血红裂口)
      fn mapShubNiggurath(pos : vec3<f32>) -> vec2<f32> {
        let t = u.time * (0.85 + u.gazeIntensity * 1.35);
        let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.75);

        // 无理数准周期时间轴，确保蠕动永不重复
        let t1 = t * 1.4142135;
        let t2 = t * 1.6180339;
        let t3 = t * 2.7182818;

        // 1. 中央翻滚的腐殖黑肉云团躯干（略微扁平宽阔的母体）
        var bodyPos = pos - vec3<f32>(0.0, 0.25, 0.0);
        bodyPos.y *= 1.25;
        var d = length(bodyPos) - (1.05 + 0.08 * sin(t1 * 1.2) + 0.05 * cos(t3 * 0.85));
        var acidMaw = 0.0;

        // 6团不断孕育鼓胀又回缩的母体肉瘤
        for (var i = 0; i < 6; i = i + 1) {
          let fi = f32(i);
          let wA = 0.61803 + fi * 0.1732;
          let wB = 0.73205 + fi * 0.2236;
          let ang = fi * 1.047197 + sin(t * wA) * 0.45;
          let rOff = 0.78 + 0.28 * sin(t * wB + fi * 1.9);
          let blobCenter = vec3<f32>(
            cos(ang) * rOff,
            0.22 + 0.35 * sin(t * wA * 1.3 + fi),
            sin(ang) * rOff
          );
          let dBlob = length(pos - blobCenter) - (0.42 + 0.12 * cos(t * wB * 1.5 + fi));
          d = smin(d, dBlob, 0.48);
        }

        // 2. 底部 5 根粗壮扭曲的漆黑山羊蹄足（扎根向下并缓慢踏动）
        for (var g = 0; g < 5; g = g + 1) {
          let fg = f32(g);
          let legAng = fg * 1.256637 + sin(t * (0.31 + fg * 0.071)) * 0.18;
          var lp = pos;
          let rLeg = rot2D(legAng) * lp.xz;
          lp.x = rLeg.x;
          lp.z = rLeg.y;

          // 蹄足从躯干向斜下方弯曲延伸，末端分趾变硬
          let downT = clamp(-lp.y / 2.35, 0.0, 1.0);
          let kneeBend = sin(downT * 3.14159) * 0.38 + downT * 0.75 + 0.08 * sin(t2 * 1.4 + fg * 2.1);
          let legRadius = mix(0.26, 0.09, downT) + 0.04 * sin(downT * 12.0);
          // 末端山羊分趾蹄裂隙
          let hoofSplit = smoothstep(0.75, 1.0, downT) * max(0.0, 0.045 - abs(lp.z));
          let dLeg = length(vec2<f32>(lp.x - (0.45 + kneeBend), lp.z)) - legRadius + hoofSplit;
          let legMask = max(dLeg, max(lp.y - 0.15, -lp.y - 2.35));
          d = smin(d, legMask, 0.32);
        }

        // 3. 顶部与四周 8 条疯狂抽打蔓延的纠缠黑山羊触须（树冠触腕）
        for (var k = 0; k < 8; k = k + 1) {
          let fk = f32(k);
          var tp = pos - vec3<f32>(0.0, 0.35, 0.0);
          let yaw = fk * 0.785398 + sin(t * (0.2718 + fk * 0.0414)) * 0.35;
          let rxz = rot2D(yaw) * tp.xz;
          tp.x = rxz.x; tp.z = rxz.y;

          let pitch = 0.45 + 0.25 * sin(fk * 1.7 + t * 0.33);
          let rxy = rot2D(pitch) * tp.xy;
          tp.x = rxy.x; tp.y = rxy.y;

          let span = max(0.0, tp.x);
          let whipY = sin(span * 3.2 - t2 * 1.9 + fk * 1.5) * 0.32 * smoothstep(0.3, 2.8, span);
          let whipZ = cos(span * 2.9 - t1 * 1.6 + fk * 2.1) * 0.28 * smoothstep(0.3, 2.8, span);
          let tRad = max(0.014, 0.21 * exp(-span * 0.65));
          let dTentacle = length(vec2<f32>(tp.y - whipY, tp.z - whipZ)) - tRad;
          let tMask = max(dTentacle, max(-tp.x + 0.2, tp.x - 3.1));
          d = smin(d, tMask, 0.28);
        }

        // 4. 腐殖树皮褶皱与流淌强酸的贪婪裂口
        let advect = vec3<f32>(t * 0.1414, -t * 0.2236, t * 0.1732);
        let barkNoise = fbm3(pos * 2.6 + advect);
        let mawWave = sin(pos.x * 5.2 + t1) * cos(pos.y * 6.4 - t2) * sin(pos.z * 5.2 + t3);

        d += (barkNoise - 0.48) * 0.28 * entropy + mawWave * 0.06 * entropy;

        // 裂口与酸液腺体权重：集中在中部凹陷裂隙处
        let mawZone = smoothstep(0.45, 0.85, barkNoise) * smoothstep(1.4, 0.2, abs(pos.y - 0.15));
        acidMaw = clamp(mawZone * 1.5 + max(0.0, -mawWave) * 0.65, 0.0, 1.0);

        return vec2<f32>(d * 0.6, acidMaw);
      }

      fn calcNormal(p : vec3<f32>) -> vec3<f32> {
        let e = vec2<f32>(0.0022, -0.0022);
        return normalize(
          e.xyy * mapShubNiggurath(p + e.xyy).x +
          e.yyx * mapShubNiggurath(p + e.yyx).x +
          e.yxy * mapShubNiggurath(p + e.yxy).x +
          e.xxx * mapShubNiggurath(p + e.xxx).x
        );
      }

      fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
        var uv = uv_in;
        let r2 = dot(uv, uv);
        uv *= 1.0 + u.gazeIntensity * 0.24 * r2 * sin(u.time * 3.5 + r2 * 4.0);

        let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.35) * camFwd);

        // 暗夜腐殖森林瘴气背景（深沼泽墨绿 + 腐黑夜空）
        let mistNoise = fbm3(rd * 3.4 + vec3<f32>(u.time * 0.05, -u.time * 0.03, 0.0));
        let bgVoid = mix(vec3<f32>(0.008, 0.014, 0.010), vec3<f32>(0.024, 0.048, 0.032), mistNoise);
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
        var acidWeight = 0.0;
        var miasmaGlow = vec3<f32>(0.0);

        for (var i = 0; i < 64; i = i + 1) {
          let p = ro + rd * t;
          let res = mapShubNiggurath(p);
          let d = res.x;
          acidWeight = res.y;

          // 森林强酸瘴气与血红生殖孢子体积辉光
          let atten = 1.0 / (1.0 + d * d * 24.0);
          let glowCol = mix(
            vec3<f32>(0.08, 0.56, 0.24), // 腐殖毒绿瘴气
            vec3<f32>(0.58, 0.08, 0.14), // 孕育血红内光
            0.5 + 0.5 * sin(p.y * 2.5 - u.time * 1.6)
          );
          miasmaGlow += glowCol * atten * 0.013 * u.glowScale * (1.0 + u.gazeIntensity * 0.9);

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

          let lightDir = normalize(vec3<f32>(1.8, 3.2, 2.2));
          let diff = max(dot(n, lightDir), 0.0);
          let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          // 粘稠黑液的高光反射
          let wetSpec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 48.0);

          // 漆黑羊皮/古树皮基底 + 贪婪血口与强酸毒绿腺体
          let pitchFlesh = vec3<f32>(0.022, 0.025, 0.020);
          let bloodMaw = vec3<f32>(0.55, 0.04, 0.10);
          let acidBile = vec3<f32>(0.18, 0.85, 0.28);

          var albedo = mix(pitchFlesh, bloodMaw, smoothstep(0.25, 0.68, acidWeight));
          let acidCore = smoothstep(0.68, 0.96, acidWeight);
          albedo = mix(albedo, acidBile * 1.5, acidCore * (0.65 + 0.35 * sin(u.time * 3.2 + p.y * 6.0)));

          let rimCol = mix(vec3<f32>(0.16, 0.68, 0.32), vec3<f32>(0.78, 0.56, 0.22), u.gazeIntensity) * fresnel * 0.85;
          col = albedo * (diff * 0.82 + 0.16) + rimCol + vec3<f32>(0.75, 0.92, 0.78) * wetSpec * 0.55;

          let fog = exp(-0.04 * t * t);
          col = mix(bgVoid, col, fog);
        }

        col += miasmaGlow;
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

const SHUB_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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

        let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.9 + params.gazeIntensity * 1.8) * params.entropyScale;
        let t = params.time;

        // 森林腐殖上升气流 + 螺旋盘绕运动
        let swirl = vec3<f32>(-pos.z, 0.0, pos.x) * (0.85 / max(length(pos.xz), 0.4));
        let turbulence = vec3<f32>(
          sin(pos.y * 2.8 + t * 1.414 + seed * 12.0),
          0.35 * sin(length(pos.xz) * 3.0 - t * 1.618 + seed * 7.0),
          cos(pos.y * 2.8 - t * 1.732 + seed * 9.0)
        ) * 0.55;

        let vel = swirl + turbulence;
        pos += vel * dt;
        life += dt * (0.35 + fract(seed * 5.3) * 0.45);

        // 生命周期结束或飘散过远时，从母神肉团裂口重新“孕育诞生”
        if (life > 1.0 || length(pos) > 5.8) {
          life = fract(life);
          let ang = seed * 62.8318 + t * 2.718;
          let elev = (fract(seed * 17.3) - 0.35) * 1.4;
          let birthR = 0.75 + fract(seed * 31.1) * 0.55;
          pos = vec3<f32>(cos(ang) * birthR, elev, sin(ang) * birthR);
        }

        p.pos = vec4<f32>(pos, life);
        p.vel = vec4<f32>(vel, seed);
        particles[idx] = p;
      }
`;

const SHUB_PARTICLE_RENDER_WGSL = /* wgsl */`
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

        let size = ((0.014 + 0.018 * fract(seed * 19.1)) * sin(life * 3.14159)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
        let quv = quad[vid];
        let pVert = relPos + (camRight * quv.x + camUp * quv.y) * size;

        let xCam = dot(pVert, camRight);
        let yCam = dot(pVert, camUp);
        let zVert = dot(pVert, camFwd);

        let focal = 1.65 - u.gazeIntensity * 0.35;
        out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
        out.localUV = quv;

        // 腐殖毒绿、暗金孢子与猩红血滴配色
        let cAcidGreen = vec3<f32>(0.16, 0.88, 0.35);
        let cSporeGold = vec3<f32>(0.85, 0.65, 0.22);
        let cBlood = vec3<f32>(0.82, 0.12, 0.18);

        var col = mix(cAcidGreen, cSporeGold, smoothstep(0.2, 0.8, fract(seed * 3.7)));
        col = mix(col, cBlood, smoothstep(0.72, 1.0, fract(seed * 8.3 + u.gazeIntensity * 0.4)));

        out.color = col * u.glowScale;
        out.alpha = sin(life * 3.14159) * 0.72;
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

export class ShubNiggurathRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: SHUB_RAYMARCH_WGSL,
      // 各神祇自带专属 helper（fbm3 常量 / sdGyroid / 4D 投影等），关闭公共头自动拼接以逐字保留原始 WGSL
      useCommonHeader: false,
      computeCode: SHUB_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: SHUB_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.008, g: 0.014, b: 0.010, a: 1.0 },
      initParticles: (data, numParticles) => {
        for (let i = 0; i < numParticles; i++) {
          const seed = i / numParticles;
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.9 + Math.random() * 2.8;
          const base = i * 8;
          data[base + 0] = Math.cos(ang) * rad;
          data[base + 1] = (Math.random() - 0.4) * 2.4;
          data[base + 2] = Math.sin(ang) * rad;
          data[base + 3] = Math.random(); // life 0..1
          data[base + 7] = seed;
        }
      }
    });
  }
}
