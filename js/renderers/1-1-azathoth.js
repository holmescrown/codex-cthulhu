/**
 * 1-1-azathoth.js — 阿撒托斯（奇点黑洞肉团 + 4 条触须 + 吹笛粒子）
 * SDF / 色彩光影 / 粒子逻辑逐字保留自 3d.html，无简化。
 */
import { BaseEldritchRenderer, COMMON_RAYMARCH_HEADER_WGSL } from '../core/webgpu-base.js';

const AZATHOTH_RAYMARCH_BODY_WGSL = /* wgsl */`
  // MODIFIED: 1-1 阿撒托斯采用无理数频率准周期调制 + 持续平流涌动，消除几秒一循环的机械感
      fn mapAzathoth(pos : vec3<f32>) -> vec2<f32> {
        let t = u.time * (0.85 + u.gazeIntensity * 1.4);
        let entropy = u.entropyScale * (1.0 + u.gazeIntensity * 0.8);

        // 无理数时间基准 (sqrt(2), phi, e, sqrt(3))，永不产生公倍数周期
        let tIrr1 = t * 1.4142135;
        let tIrr2 = t * 1.6180339;
        let tIrr3 = t * 2.7182818;
        let tIrr4 = t * 1.7320508;

        var q = pos;
        let twist = length(q) * (0.55 + 0.45 * u.gazeIntensity) - t * 0.2718 + 0.18 * sin(tIrr1 * 0.37);
        let rXZ = rot2D(twist) * q.xz;
        q.x = rXZ.x;
        q.z = rXZ.y;

        // 1. 中央暗物质主核 + 6个非周期独立游走的子肿瘤
        let coreBreath = 0.96 + 0.07 * sin(tIrr1 * 1.3) + 0.05 * cos(tIrr3 * 0.91);
        var d = length(pos) - coreBreath;

        for (var i = 0; i < 6; i = i + 1) {
          let fi = f32(i);
          let w1 = 0.61803 + fi * 0.1732;
          let w2 = 0.73205 + fi * 0.2236;
          let w3 = 0.85410 + fi * 0.1414;
          let rad = 0.64 + 0.34 * sin(t * w1 + fi * 2.3999) + 0.18 * cos(t * w3);

          let offset = vec3<f32>(
            sin(t * w1 + fi * 1.7) * cos(t * w2 * 0.7),
            cos(t * w2 + fi * 2.3) * sin(t * w3 * 0.8),
            sin(t * w3 - fi * 1.9) * cos(t * w1 * 0.6)
          ) * rad;

          let blobSize = 0.32 + 0.11 * sin(t * w2 * 1.7 + fi * 3.14159) + 0.06 * cos(tIrr4 + fi);
          let dBlob = length(pos - offset) - blobSize;
          d = smin(d, dBlob, 0.46);
        }

        // 2. 4条非周期异步抽搐甩动的混沌暗物质触须
        for (var k = 0; k < 4; k = k + 1) {
          let fk = f32(k);
          var tp = pos;
          let rotA = rot2D(fk * 1.570796 + t * (0.19 + fk * 0.0414));
          let rxz = rotA * tp.xz;
          tp.x = rxz.x;
          tp.z = rxz.y;
          let rotB = rot2D(sin(t * (0.2718 + fk * 0.0732) + fk * 2.1) * 0.92);
          let rxy = rotB * tp.xy;
          tp.x = rxy.x;
          tp.y = rxy.y;

          let radialLen = length(tp.xz);
          let waveY = (sin(radialLen * 3.6 - tIrr2 * 1.8 + fk * 2.0) * 0.22
                     + cos(radialLen * 5.1 - tIrr3 * 1.1 + fk) * 0.11) * smoothstep(0.55, 2.7, radialLen);
          let waveZ = (cos(radialLen * 3.1 - tIrr1 * 1.7 + fk) * 0.20
                     + sin(radialLen * 4.7 - tIrr4 * 1.2) * 0.09) * smoothstep(0.55, 2.7, radialLen);
          let tendrilRadius = max(0.015, 0.22 * exp(-radialLen * 0.68));
          let dTendril = length(vec2<f32>(tp.y - waveY, tp.z - waveZ)) - tendrilRadius;
          let maskRange = max(dTendril, radialLen - 3.05);
          d = smin(d, maskRange, 0.35);
        }

        // 3. 破碎非欧王座圆环（无理数双轴进动）
        var ringP1 = pos;
        let rRing1 = rot2D(0.55 + sin(tIrr1 * 0.17) * 0.22 + cos(tIrr3 * 0.11) * 0.14) * ringP1.xy;
        ringP1.x = rRing1.x;
        ringP1.y = rRing1.y;
        let ringRipple = sin(atan2(ringP1.z, ringP1.x) * 7.0 + tIrr2 * 2.1) * cos(atan2(ringP1.z, ringP1.x) * 3.0 - tIrr4 * 1.3);
        let dRing1 = length(vec2<f32>(length(ringP1.xz) - 1.95, ringP1.y)) - (0.042 + 0.024 * ringRipple);
        d = smin(d, dRing1, 0.22);

        // 4. 持续向外部涌出的非周期 FBM 病变组织（单向平流 + 交叉扭曲，永不回退重复）
        let advect1 = vec3<f32>(t * 0.1732, -t * 0.2236, t * 0.1414);
        let advect2 = vec3<f32>(-t * 0.1618, t * 0.1324, -t * 0.1912);
        let g1 = sdGyroid(q + advect1, 4.2);
        let g2 = sdGyroid(q * 1.9 + advect2, 8.5);
        let fbmVal = fbm3(q * 2.1 + advect1 * 1.65);

        d += (g1 - 0.16) * 0.26 * entropy + (g2 - 0.08) * 0.12 * entropy - (fbmVal - 0.45) * 0.34 * entropy;
        let fissureMat = clamp((0.36 - g1) * 1.8 + fbmVal * 0.65, 0.0, 1.0);

        return vec2<f32>(d * 0.58, fissureMat);
      }

      fn calcNormal(p : vec3<f32>) -> vec3<f32> {
        let e = vec2<f32>(0.0022, -0.0022);
        return normalize(
          e.xyy * mapAzathoth(p + e.xyy).x +
          e.yyx * mapAzathoth(p + e.yyx).x +
          e.yxy * mapAzathoth(p + e.yxy).x +
          e.xxx * mapAzathoth(p + e.xxx).x
        );
      }

      fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
        var uv = uv_in;
        let r2 = dot(uv, uv);
        // 黑洞引力透镜空间扭曲 + 凝视畸变
        let gravLens = 1.0 - 0.16 * exp(-r2 * 2.8) + u.gazeIntensity * 0.26 * r2;
        uv *= gravLens;

        let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.35) * camFwd);

        // 深渊宇宙背景（暗黑星尘 + 腐败紫暗云）
        let bgNoise = fbm3(rd * 3.8 + vec3<f32>(u.time * 0.04));
        let bgVoid = mix(vec3<f32>(0.008, 0.007, 0.012), vec3<f32>(0.035, 0.012, 0.048), bgNoise);
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
        var volumetricGlow = vec3<f32>(0.0);

        // MODIFIED: 步进次数由 88 降至 64，显著提升高分屏帧率
        for (var i = 0; i < 64; i = i + 1) {
          let p = ro + rd * t;
          let res = mapAzathoth(p);
          let d = res.x;
          matWeight = res.y;

          // 体积光晕：以暗金吸积光与惨绿辐射为主，摒弃亮粉色
          let glowAtten = 1.0 / (1.0 + d * d * 24.0);
          let abyssGlowCol = mix(
            vec3<f32>(0.68, 0.36, 0.08), // 混沌暗金
            vec3<f32>(0.06, 0.58, 0.36), // 病态惨绿
            0.5 + 0.5 * sin(length(p) * 3.0 - u.time * 1.8)
          );
          volumetricGlow += abyssGlowCol * glowAtten * 0.013 * u.glowScale * (1.0 + u.gazeIntensity * 0.95);

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

          let lightDir1 = normalize(vec3<f32>(2.2, 3.0, 2.4));
          let diff1 = max(dot(n, lightDir1), 0.0);
          let fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.4);
          let spec = pow(max(dot(n, normalize(lightDir1 + v)), 0.0), 42.0);

          // 高对比深渊色彩：黑曜石暗物质基底 + 暗金/惨绿撕裂能量脉络
          let obsidianBase = vec3<f32>(0.018, 0.012, 0.028);
          let voidPurple = vec3<f32>(0.14, 0.03, 0.22);
          let goldMagma = vec3<f32>(0.92, 0.56, 0.16);
          let eldritchGreen = vec3<f32>(0.08, 0.78, 0.48);

          var albedo = mix(obsidianBase, voidPurple, smoothstep(0.15, 0.65, matWeight));
          let crackMask = smoothstep(0.62, 0.92, matWeight);
          let crackCol = mix(goldMagma, eldritchGreen, 0.45 + 0.55 * sin(u.time * 2.5 + length(p) * 5.0));
          albedo = mix(albedo, crackCol * 1.65, crackMask);

          // 长按“盲目痴愚注视”时，中心撕裂出刺目的混沌奇点之眼
          if (u.gazeIntensity > 0.05) {
            let coreEye = exp(-dot(p.xy, p.xy) * 4.5) * u.gazeIntensity;
            albedo += vec3<f32>(1.4, 0.25, 0.12) * coreEye;
          }

          let rimCol = mix(vec3<f32>(0.85, 0.62, 0.24), vec3<f32>(0.12, 0.82, 0.52), 0.5 + 0.5 * sin(u.time)) * fresnel * 0.95;
          col = albedo * (diff1 * 0.8 + 0.15) + rimCol + vec3<f32>(0.95, 0.82, 0.58) * spec * 0.55;

          let fog = exp(-0.042 * t * t);
          col = mix(bgVoid, col, fog);
        }

        col += volumetricGlow;
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
          let vignette = smoothstep(1.55, 0.32, length(uv) * (1.0 + 0.38 * u.gazeIntensity));
          finalColor *= mix(0.25, 1.0, vignette);
        }

        let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
        finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
        finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

        return vec4<f32>(finalColor, 1.0);
      }
`;

const AZATHOTH_PARTICLE_COMPUTE_WGSL = /* wgsl */`
      struct Particle {
        pos : vec4<f32>, // xyz: 位置, w: 粒子相位/寿命
        vel : vec4<f32>, // xyz: 速度, w: 尺寸与轨道编号
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
        let orbitType = p.vel.w;

        let dt = clamp(params.deltaTime, 0.001, 0.05) * (1.0 + params.gazeIntensity * 2.2);
        let t = params.time;

        // 非欧几里得旋涡力场 + 吹笛仆役声波驻波调制
        let r = length(pos);
        let safeR = max(r, 0.25);

        // 切向旋转切向量（双轴倾角交错环绕）
        let tilt = sin(orbitType * 6.2831 + t * 0.25) * 0.65;
        let axis = normalize(vec3<f32>(sin(orbitType * 3.14), 1.0, tilt));
        let tangent = normalize(cross(axis, pos));

        // 径向吸引与排斥平衡（维持在半径 1.6 ~ 4.2 的混沌壳层）
        let targetRadius = 2.05 + 1.15 * sin(orbitType * 12.0 + t * 0.4) - params.gazeIntensity * 0.45;
        let radialForce = -normalize(pos) * (r - targetRadius) * 1.85;

        // 魔笛音律高频螺旋扰动 (Curl-like harmonic wave)
        let fluteWave = vec3<f32>(
          sin(pos.y * 3.5 + t * 2.8 + phase),
          cos(pos.z * 3.5 - t * 2.3 + phase),
          sin(pos.x * 3.5 + t * 3.1 - phase)
        ) * (0.65 * params.entropyScale + params.gazeIntensity * 1.2);

        let swirlSpeed = (2.2 / sqrt(safeR)) * (1.0 + 0.8 * params.gazeIntensity);
        let velocity = tangent * swirlSpeed + radialForce + fluteWave;

        pos += velocity * dt;
        phase += dt * (1.2 + fract(orbitType * 7.13));

        // 防止粒子坠入奇点或逃逸过远
        if (length(pos) < 0.95 || length(pos) > 6.8) {
          let angle1 = phase * 6.28318;
          let angle2 = orbitType * 3.14159;
          let resetR = 2.2 + fract(phase * 3.7) * 1.6;
          pos = vec3<f32>(
            cos(angle1) * sin(angle2),
            cos(angle2) * 0.75,
            sin(angle1) * sin(angle2)
          ) * resetR;
        }

        p.pos = vec4<f32>(pos, phase);
        p.vel = vec4<f32>(velocity, orbitType);
        particles[idx] = p;
      }
`;

const AZATHOTH_PARTICLE_RENDER_WGSL = /* wgsl */`
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
        let orbitType = p.vel.w;

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

        // 沿速度切线拉长成锐利的魔笛音浪流光丝线
        let velDir = normalize(p.vel.xyz + vec3<f32>(0.0001));
        let thickness = ((0.008 + 0.009 * fract(orbitType * 13.7)) * (1.0 + u.gazeIntensity * 0.3)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
        let streakLen = thickness * (4.2 + u.gazeIntensity * 3.5);
        let quv = quad[vid];
        let billboardOffset = camRight * quv.x * thickness + velDir * quv.y * streakLen;

        let pVert = relPos + billboardOffset;
        let xCam = dot(pVert, camRight);
        let yCam = dot(pVert, camUp);
        let zVert = dot(pVert, camFwd);

        let focal = 1.65 - u.gazeIntensity * 0.35;
        out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
        out.localUV = quv;

        // 彻底移除玫粉，采用混沌暗金、幽冥惨绿与深渊暗琥珀配色
        let cGold = vec3<f32>(0.95, 0.62, 0.18);
        let cEmerald = vec3<f32>(0.08, 0.85, 0.52);
        let cAmberRed = vec3<f32>(0.78, 0.22, 0.08);

        var col = mix(cGold, cEmerald, smoothstep(0.15, 0.85, fract(orbitType * 3.17)));
        col = mix(col, cAmberRed, smoothstep(0.65, 1.0, fract(orbitType * 7.31 + u.gazeIntensity * 0.45)));

        let centerDist = length(worldPos);
        let behindCore = select(1.0, 0.15, zCam > length(ro) && length(cross(normalize(relPos), normalize(-ro))) < 0.32);

        // 魔笛声波律动闪烁
        let flutePulse = 0.5 + 0.5 * sin(phase * 4.5 + orbitType * 18.0);
        out.color = col * u.glowScale * (0.75 + 0.5 * flutePulse);
        out.alpha = (0.35 + 0.55 * flutePulse) * behindCore * smoothstep(6.5, 1.3, centerDist);
        return out;
      }

      @fragment
      fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
        // 横向锐利边缘 + 纵向流线渐隐
        let d = abs(in.localUV.x) * 1.4 + abs(in.localUV.y) * 0.65;
        if (d > 1.2) {
          discard;
        }
        let streakGlow = exp(-d * d * 3.2);
        return vec4<f32>(in.color * streakGlow, in.alpha * streakGlow);
      }
`;

export class AzathothRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: COMMON_RAYMARCH_HEADER_WGSL + '\n' + AZATHOTH_RAYMARCH_BODY_WGSL,
      // 各神祇自带专属 helper（fbm3 常量 / sdGyroid / 4D 投影等），关闭公共头自动拼接以逐字保留原始 WGSL
      useCommonHeader: false,
      computeCode: AZATHOTH_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: AZATHOTH_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.012, g: 0.02, b: 0.018, a: 1.0 },
      initParticles: (data, numParticles) => {
        for (let i = 0; i < numParticles; i++) {
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          const radius = 1.65 + Math.random() * 2.6;

          const base = i * 8;
          data[base + 0] = radius * Math.sin(phi) * Math.cos(theta);
          data[base + 1] = radius * Math.cos(phi) * 0.75;
          data[base + 2] = radius * Math.sin(phi) * Math.sin(theta);
          data[base + 3] = Math.random() * 10.0; // phase

          data[base + 4] = 0.0;
          data[base + 5] = 0.0;
          data[base + 6] = 0.0;
          data[base + 7] = i / numParticles; // orbitType 归一化标识
        }
      }
    });
  }
}
