/**
 * 1-2-yogsothoth.js — 犹格·索托斯（薄膜干涉虹彩光球 + 4D 超立方体 + 时空测地线粒子）
 * SDF / 色彩光影 / 粒子逻辑逐字保留自 3d.html，无简化。
 */
import { BaseEldritchRenderer } from '../core/webgpu-base.js';

const YOGSOTHOTH_RAYMARCH_WGSL = /* wgsl */`
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

      // 空间线段距离场（用于构建 4D 超立方体投影棱边）
      fn sdCapsule(p : vec3<f32>, a : vec3<f32>, b : vec3<f32>, r : f32) -> f32 {
        let pa = p - a;
        let ba = b - a;
        let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - r;
      }

      // MODIFIED: 4D 超立方体采用四平面无理数角速度旋转（XW/YW/ZW/XY 耦合进动），轨迹永远不闭合重复
      fn project4D(v4_in : vec4<f32>, t : f32) -> vec3<f32> {
        var v = v4_in;
        let rxw = rot2D(t * 0.41421) * vec2<f32>(v.x, v.w);
        v.x = rxw.x; v.w = rxw.y;

        let ryw = rot2D(t * 0.31831 + 0.7) * vec2<f32>(v.y, v.w);
        v.y = ryw.x; v.w = ryw.y;

        let rzw = rot2D(t * 0.22360 + 1.3) * vec2<f32>(v.z, v.w);
        v.z = rzw.x; v.w = rzw.y;

        let rxz = rot2D(t * 0.17320) * vec2<f32>(v.x, v.z);
        v.x = rxz.x; v.z = rxz.y;

        let wDist = 2.65 - v.w;
        return v.xyz * (2.35 / max(wDist, 0.65));
      }

      // 薄膜干涉虹彩光谱 (Thin-Film Iridescence)
      fn thinFilmIridescence(cosTheta : f32, phase : f32) -> vec3<f32> {
        let shift = (1.0 - cosTheta) * 3.8 + phase;
        let a = vec3<f32>(0.55, 0.52, 0.62);
        let b = vec3<f32>(0.45, 0.45, 0.42);
        let c = vec3<f32>(1.0, 1.0, 1.0);
        let d = vec3<f32>(0.05, 0.28, 0.58); // 青蓝 -> 铂金 -> 星界紫光谱偏移
        return a + b * cos(6.28318 * (c * shift + d));
      }

      // 犹格·索托斯距离场：vec2(最近距离, 材质ID: 0=虹彩光球, 1=4D超立方体金丝门之钥)
      fn mapYogSothoth(pos : vec3<f32>) -> vec2<f32> {
        let t = u.time * (0.85 + u.gazeIntensity * 1.25);
        let entropy = u.entropyScale;

        // 1. 13 个聚集分裂的高维虹彩光球群（中央母球 + 12 颗时空相位球）
        let mainPulse = 0.72 + 0.08 * sin(t * 2.4) + 0.14 * u.gazeIntensity;
        var dGlobes = length(pos) - mainPulse;

        // MODIFIED: 12 颗时空相位球采用黄金分割与无理数频率呼吸，每颗球独立进动永不重合
        for (var i = 0; i < 12; i = i + 1) {
          let fi = f32(i);
          let goldenAngle = fi * 2.3999632;
          let yNorm = 1.0 - (fi / 11.0) * 2.0;
          let ringR = sqrt(max(0.0, 1.0 - yNorm * yNorm));

          let freqA = 0.61803 + fi * 0.14142;
          let freqB = 0.73205 + fi * 0.17320;
          let breathe = 0.86 + 0.42 * sin(t * freqA + fi * 1.45) * entropy + 0.22 * cos(t * freqB * 1.3);
          let orbitAng = goldenAngle + t * (0.2718 + fract(fi * 0.61803) * 0.35);
          let center = vec3<f32>(
            cos(orbitAng) * ringR,
            yNorm * (0.85 + 0.28 * cos(t * freqB + fi)),
            sin(orbitAng) * ringR
          ) * (1.28 * breathe);

          let gRadius = (0.24 + 0.11 * sin(t * freqB * 1.4 + fi * 2.1) + 0.05 * cos(t * freqA * 1.9)) * (1.0 + 0.15 * u.gazeIntensity);
          let dSphere = length(pos - center) - gRadius;
          dGlobes = smin(dGlobes, dSphere, 0.18);
        }

        // 2. 四维超立方体 (Tesseract / 门与钥匙) 3D 骨架投影
        // 抽取超立方体内外双层核心棱边（共 16 条关键维度连接线）
        let s = 0.82 + 0.12 * u.gazeIntensity;
        let p0000 = project4D(vec4<f32>(-s, -s, -s, -s), t);
        let p1000 = project4D(vec4<f32>( s, -s, -s, -s), t);
        let p0100 = project4D(vec4<f32>(-s,  s, -s, -s), t);
        let p1100 = project4D(vec4<f32>( s,  s, -s, -s), t);
        let p0010 = project4D(vec4<f32>(-s, -s,  s, -s), t);
        let p1010 = project4D(vec4<f32>( s, -s,  s, -s), t);
        let p0110 = project4D(vec4<f32>(-s,  s,  s, -s), t);
        let p1110 = project4D(vec4<f32>( s,  s,  s, -s), t);

        let p0001 = project4D(vec4<f32>(-s, -s, -s,  s), t);
        let p1001 = project4D(vec4<f32>( s, -s, -s,  s), t);
        let p0101 = project4D(vec4<f32>(-s,  s, -s,  s), t);
        let p1101 = project4D(vec4<f32>( s,  s, -s,  s), t);
        let p0011 = project4D(vec4<f32>(-s, -s,  s,  s), t);
        let p1011 = project4D(vec4<f32>( s, -s,  s,  s), t);
        let p0111 = project4D(vec4<f32>(-s,  s,  s,  s), t);
        let p1111 = project4D(vec4<f32>( s,  s,  s,  s), t);

        let wireR = 0.016 + 0.008 * u.gazeIntensity;
        var dWire = 100.0;
        // W = -s 胞体主棱
        dWire = min(dWire, sdCapsule(pos, p0000, p1000, wireR));
        dWire = min(dWire, sdCapsule(pos, p0100, p1100, wireR));
        dWire = min(dWire, sdCapsule(pos, p0010, p1010, wireR));
        dWire = min(dWire, sdCapsule(pos, p0110, p1110, wireR));
        dWire = min(dWire, sdCapsule(pos, p0000, p0100, wireR));
        dWire = min(dWire, sdCapsule(pos, p1000, p1100, wireR));
        dWire = min(dWire, sdCapsule(pos, p0010, p0110, wireR));
        dWire = min(dWire, sdCapsule(pos, p1010, p1110, wireR));
        // W = +s 胞体主棱
        dWire = min(dWire, sdCapsule(pos, p0001, p1001, wireR));
        dWire = min(dWire, sdCapsule(pos, p0101, p1101, wireR));
        dWire = min(dWire, sdCapsule(pos, p0011, p1011, wireR));
        dWire = min(dWire, sdCapsule(pos, p0111, p1111, wireR));
        // 第四维度 W 轴跨维连接桥（门与钥匙的跨维通道）
        dWire = min(dWire, sdCapsule(pos, p0000, p0001, wireR));
        dWire = min(dWire, sdCapsule(pos, p1000, p1001, wireR));
        dWire = min(dWire, sdCapsule(pos, p0100, p0101, wireR));
        dWire = min(dWire, sdCapsule(pos, p1100, p1101, wireR));
        dWire = min(dWire, sdCapsule(pos, p0010, p0011, wireR));
        dWire = min(dWire, sdCapsule(pos, p1010, p1011, wireR));
        dWire = min(dWire, sdCapsule(pos, p0110, p0111, wireR));
        dWire = min(dWire, sdCapsule(pos, p1110, p1111, wireR));

        if (dWire < dGlobes) {
          return vec2<f32>(dWire * 0.78, 1.0);
        }
        return vec2<f32>(dGlobes * 0.78, 0.0);
      }

      fn calcNormal(p : vec3<f32>) -> vec3<f32> {
        let e = vec2<f32>(0.002, -0.002);
        return normalize(
          e.xyy * mapYogSothoth(p + e.xyy).x +
          e.yyx * mapYogSothoth(p + e.yyx).x +
          e.yxy * mapYogSothoth(p + e.yxy).x +
          e.xxx * mapYogSothoth(p + e.xxx).x
        );
      }

      fn renderScene(uv_in : vec2<f32>, ro : vec3<f32>, camRight : vec3<f32>, camUp : vec3<f32>, camFwd : vec3<f32>) -> vec4<f32> {
        var uv = uv_in;
        // 全知之门开启时的万花筒四维空间折叠镜像
        if (u.gazeIntensity > 0.05) {
          let foldAng = u.gazeIntensity * 0.35 * sin(u.time * 2.2);
          uv = rot2D(foldAng) * uv;
          uv = mix(uv, abs(uv) - vec2<f32>(0.18 * u.gazeIntensity), u.gazeIntensity * 0.45);
        }

        let rd = normalize(uv.x * camRight + uv.y * camUp + (1.65 - u.gazeIntensity * 0.3) * camFwd);

        // 深邃星界靛蓝与时空裂隙虚空背景
        let starGrid = fract(sin(dot(floor(rd * 180.0), vec3<f32>(12.9898, 78.233, 37.719))) * 43758.5453);
        let stars = smoothstep(0.992, 1.0, starGrid) * (0.5 + 0.5 * sin(u.time * 3.0 + starGrid * 50.0));
        let bgVoid = vec3<f32>(0.012, 0.016, 0.036) + vec3<f32>(0.65, 0.78, 1.0) * stars * 0.55;
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
        var matId = 0.0;
        var iridescentAccum = vec3<f32>(0.0);

        for (var i = 0; i < 64; i = i + 1) {
          let p = ro + rd * t;
          let res = mapYogSothoth(p);
          let d = res.x;
          matId = res.y;

          // 光球外围神圣时空光晕累积
          let glowAtten = 1.0 / (1.0 + d * d * 28.0);
          let haloCol = thinFilmIridescence(0.5 + 0.5 * sin(length(p) * 2.5 - u.time), u.time * 0.25);
          iridescentAccum += haloCol * glowAtten * 0.012 * u.glowScale * (1.0 + u.gazeIntensity * 0.8);

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
          let ndotv = max(dot(n, v), 0.0);
          let fresnel = pow(1.0 - ndotv, 2.6);

          if (matId > 0.5) {
            // 材质 1：4D 超立方体（门与钥匙）炽热铂金与圣金几何棱边
            let goldCore = vec3<f32>(1.0, 0.82, 0.42) * (1.35 + 0.8 * u.gazeIntensity);
            let cyanEdge = vec3<f32>(0.35, 0.92, 1.0) * fresnel;
            col = goldCore + cyanEdge;
          } else {
            // 材质 0：薄膜干涉虹彩光球 + 内部时空星图与全视之眼纹理
            let filmColor = thinFilmIridescence(ndotv, length(p) * 0.65 - u.time * 0.35);

            // 内部时空同心环纹（象征全知全视）
            let radialAngle = atan2(p.y, p.x);
            let irisRings = sin(length(p.xy) * 18.0 - u.time * 3.5) * cos(radialAngle * 8.0 + u.time * 1.5);
            let innerGold = vec3<f32>(0.98, 0.78, 0.32) * smoothstep(0.35, 0.95, irisRings) * (0.45 + 0.95 * u.gazeIntensity);

            // 内部半透明星界折射底色
            let glassCore = mix(vec3<f32>(0.04, 0.08, 0.18), filmColor * 1.25, fresnel * 0.85 + 0.25);
            let lightDir = normalize(vec3<f32>(1.8, 2.8, 2.2));
            let spec = pow(max(dot(n, normalize(lightDir + v)), 0.0), 64.0);

            col = glassCore + innerGold + vec3<f32>(1.0, 0.96, 0.9) * spec * 0.85;
          }

          let fog = exp(-0.038 * t * t);
          col = mix(bgVoid, col, fog);
        }

        col += iridescentAccum;
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

        // 全知之门开启时的三棱镜虹彩色散
        if (u.gazeIntensity > 0.02) {
          let caOffset = uv * (0.022 * u.gazeIntensity * length(uv));
          finalColor.r = mix(finalColor.r, renderScene(uv + caOffset, ro, camRight, camUp, camFwd).r, 0.82);
          finalColor.b = mix(finalColor.b, renderScene(uv - caOffset, ro, camRight, camUp, camFwd).b, 0.82);
        }

        let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
        finalColor = clamp((finalColor * (a * finalColor + b)) / (finalColor * (c * finalColor + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
        finalColor = pow(finalColor, vec3<f32>(1.0 / 2.15));

        return vec4<f32>(finalColor, 1.0);
      }
`;

const YOGSOTHOTH_PARTICLE_COMPUTE_WGSL = /* wgsl */`
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
        var phase = p.pos.w;
        let orbitType = p.vel.w;

        let dt = clamp(params.deltaTime, 0.001, 0.05) * (0.85 + params.gazeIntensity * 1.8) * params.entropyScale;
        phase += dt * (0.45 + fract(orbitType * 5.17) * 0.55);

        // 严谨的高维 Lissajous / Clifford Torus 时空测地线轨道
        let shell = 1.45 + fract(orbitType * 11.3) * 2.35;
        let freqA = 2.0 + floor(fract(orbitType * 3.0) * 3.0);
        let freqB = 3.0 + floor(fract(orbitType * 7.0) * 2.0);
        let uAng = phase * freqA + orbitType * 6.28318;
        let vAng = phase * freqB * 0.5 + orbitType * 12.5663;

        let newPos = vec3<f32>(
          (shell + 0.48 * cos(vAng)) * cos(uAng),
          0.95 * sin(vAng) * cos(uAng * 0.5),
          (shell + 0.48 * cos(vAng)) * sin(uAng)
        );

        let velocity = (newPos - p.pos.xyz) / max(dt, 0.001);
        p.pos = vec4<f32>(newPos, phase);
        p.vel = vec4<f32>(velocity, orbitType);
        particles[idx] = p;
      }
`;

const YOGSOTHOTH_PARTICLE_RENDER_WGSL = /* wgsl */`
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

        let velDir = normalize(p.vel.xyz + vec3<f32>(0.0001));
        let thickness = ((0.006 + 0.007 * fract(orbitType * 17.3)) * (1.0 + u.gazeIntensity * 0.25)) * 1.63; // MODIFIED: 优化4 粒子精简后光晕半径补偿 sqrt(16384/6144)≈1.63
        let streakLen = thickness * (5.5 + u.gazeIntensity * 4.0);
        let quv = quad[vid];
        let billboardOffset = camRight * quv.x * thickness + velDir * quv.y * streakLen;

        let pVert = relPos + billboardOffset;
        let xCam = dot(pVert, camRight);
        let yCam = dot(pVert, camUp);
        let zVert = dot(pVert, camFwd);

        let focal = 1.65 - u.gazeIntensity * 0.3;
        out.clipPos = vec4<f32>((xCam * focal) / (zVert * aspect), (yCam * focal) / zVert, clamp(zVert / 20.0, 0.0, 0.99), 1.0);
        out.localUV = quv;

        // 铂金、天青与星界虹彩配色
        let cPlatinum = vec3<f32>(0.98, 0.85, 0.52);
        let cAzure = vec3<f32>(0.25, 0.85, 1.0);
        let cAstralViolet = vec3<f32>(0.68, 0.45, 1.0);

        var col = mix(cPlatinum, cAzure, smoothstep(0.1, 0.7, fract(orbitType * 4.1)));
        col = mix(col, cAstralViolet, smoothstep(0.6, 1.0, fract(orbitType * 9.7 + sin(phase) * 0.3)));

        let pulse = 0.55 + 0.45 * sin(phase * 3.5 + orbitType * 14.0);
        out.color = col * u.glowScale * pulse;
        out.alpha = (0.38 + 0.48 * pulse) * smoothstep(6.5, 1.4, length(worldPos));
        return out;
      }

      @fragment
      fn fs_main(in : VSOut) -> @location(0) vec4<f32> {
        let d = abs(in.localUV.x) * 1.5 + abs(in.localUV.y) * 0.55;
        if (d > 1.15) {
          discard;
        }
        let glow = exp(-d * d * 3.5);
        return vec4<f32>(in.color * glow, in.alpha * glow);
      }
`;

export class YogSothothRenderer extends BaseEldritchRenderer {
  constructor(device, context, format) {
    super(device, context, format, {
      raymarchCode: YOGSOTHOTH_RAYMARCH_WGSL,
      // 各神祇自带专属 helper（fbm3 常量 / sdGyroid / 4D 投影等），关闭公共头自动拼接以逐字保留原始 WGSL
      useCommonHeader: false,
      computeCode: YOGSOTHOTH_PARTICLE_COMPUTE_WGSL,
      particleRenderCode: YOGSOTHOTH_PARTICLE_RENDER_WGSL,
      clearColor: { r: 0.012, g: 0.016, b: 0.036, a: 1.0 },
      initParticles: (data, numParticles) => {
        for (let i = 0; i < numParticles; i++) {
          const orbitType = i / numParticles;
          const phase = Math.random() * 12.0;
          const shell = 1.45 + ((orbitType * 11.3) % 1) * 2.35;
          const base = i * 8;
          data[base + 0] = Math.cos(phase) * shell;
          data[base + 1] = Math.sin(phase * 0.7) * 0.95;
          data[base + 2] = Math.sin(phase) * shell;
          data[base + 3] = phase;
          data[base + 7] = orbitType;
        }
      }
    });
  }
}
