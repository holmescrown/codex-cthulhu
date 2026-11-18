/**
 * 外神渲染器公共 WGSL 头部：Uniforms 布局、全屏三角形顶点着色器与通用数学函数。
 * 与 BaseEldritchRenderer 的 64B Render Uniform 布局一一对应。
 */
export const COMMON_RAYMARCH_HEADER_WGSL = /* wgsl */`
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
      p = p * 2.08 + vec3<f32>(13.1, 7.7, 19.3);
      amp *= 0.5;
    }
    return val;
  }

  fn sdGyroid(p : vec3<f32>, scale : f32) -> f32 {
    let sp = p * scale;
    return abs(dot(sin(sp), cos(sp.zxy))) / scale;
  }
`;

/**
 * BaseEldritchRenderer — 外神渲染器通用底座
 * 统一封装 64B Render Uniform / 16B Sim Uniform / 粒子 Storage Buffer，
 * 以及 Compute Pass + Raymarch + Additive Particle Render Pass 的标准提交流程。
 * 子类只需在 config 中提供 raymarchCode / computeCode / particleRenderCode /
 * clearColor / initParticles(data) 等差异项。
 */
export class BaseEldritchRenderer {
  constructor(device, context, format, config = {}) {
    this.device = device;
    this.context = context;
    this.format = format;
    this.numParticles = config.numParticles ?? 6144;
    this.clearColor = config.clearColor ?? { r: 0.012, g: 0.02, b: 0.018, a: 1.0 };
    this.raymarchCode = config.raymarchCode ?? '';
    this.computeCode = config.computeCode ?? '';
    this.particleRenderCode = config.particleRenderCode ?? '';
    this.initParticlesFn = config.initParticles ?? null;
    // 默认把公共 WGSL 头部拼到 raymarchCode 前面；子类传 useCommonHeader:false 可自行提供完整源码
    this.useCommonHeader = config.useCommonHeader !== false;
    this.vertexEntry = config.vertexEntry ?? 'vs_main';
    this.fragmentEntry = config.fragmentEntry ?? 'fs_main';
    this.computeEntry = config.computeEntry ?? 'cs_main';
    this.initialized = false;
  }

  /** 构造 Render Uniforms（16 floats = 64 bytes），字段布局与原有五个渲染器完全一致 */
  buildUniformArray(state) {
    return new Float32Array([
      state.width, state.height,
      state.time,
      state.gazeIntensity,
      state.camPos[0], state.camPos[1], state.camPos[2],
      state.entropyScale,
      0.0, 0.0, 0.0,
      state.glowScale,
      state.mouseOffset[0], state.mouseOffset[1],
      0.0, 0.0
    ]);
  }

  /** 构造 Compute Sim Uniforms（4 floats = 16 bytes） */
  buildSimArray(state) {
    return new Float32Array([
      state.deltaTime,
      state.time,
      state.gazeIntensity,
      state.entropyScale
    ]);
  }

  async init() {
    const device = this.device;

    // 1. Raymarching + Particle 共用的 Render Uniform Buffer (64 bytes)
    this.renderUniformBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 2. Compute Simulation Uniform Buffer (16 bytes)
    this.simUniformBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // 3. 粒子初始数据交由子类 initParticles(data, numParticles) 填充
    const particleData = new Float32Array(this.numParticles * 8);
    if (this.initParticlesFn) this.initParticlesFn(particleData, this.numParticles);
    this.particleBuffer = device.createBuffer({
      size: particleData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(this.particleBuffer.getMappedRange()).set(particleData);
    this.particleBuffer.unmap();

    // 4. SDF Raymarching Pipeline（默认自动拼上公共 WGSL 头部）
    if (this.raymarchCode) {
      const code = this.useCommonHeader
        ? COMMON_RAYMARCH_HEADER_WGSL + '\n' + this.raymarchCode
        : this.raymarchCode;
      const raymarchModule = device.createShaderModule({ code });
      this.raymarchPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: raymarchModule, entryPoint: this.vertexEntry },
        fragment: {
          module: raymarchModule,
          entryPoint: this.fragmentEntry,
          targets: [{ format: this.format }]
        },
        primitive: { topology: 'triangle-list' }
      });
      this.raymarchBindGroup = device.createBindGroup({
        layout: this.raymarchPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: this.renderUniformBuffer } }]
      });
    }

    // 5. Compute Pipeline
    if (this.computeCode) {
      const computeModule = device.createShaderModule({ code: this.computeCode });
      this.computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: computeModule, entryPoint: this.computeEntry }
      });
      this.computeBindGroup = device.createBindGroup({
        layout: this.computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer } },
          { binding: 1, resource: { buffer: this.simUniformBuffer } }
        ]
      });
    }

    // 6. Additive 混合的实例化粒子渲染 Pipeline
    if (this.particleRenderCode) {
      const particleRenderModule = device.createShaderModule({ code: this.particleRenderCode });
      this.particleRenderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: particleRenderModule, entryPoint: this.vertexEntry },
        fragment: {
          module: particleRenderModule,
          entryPoint: this.fragmentEntry,
          targets: [{
            format: this.format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
            }
          }]
        },
        primitive: { topology: 'triangle-list' }
      });
      this.particleRenderBindGroup = device.createBindGroup({
        layout: this.particleRenderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer } },
          { binding: 1, resource: { buffer: this.renderUniformBuffer } }
        ]
      });
    }

    this.initialized = true;
  }

  /** 标准双通道提交模板：Compute 推进粒子 → Render 绘制核心 + 叠加粒子 */
  render(state) {
    if (!this.initialized) return;
    const device = this.device;

    device.queue.writeBuffer(this.renderUniformBuffer, 0, this.buildUniformArray(state));
    device.queue.writeBuffer(this.simUniformBuffer, 0, this.buildSimArray(state));

    const commandEncoder = device.createCommandEncoder();

    if (this.computePipeline) {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(this.computePipeline);
      computePass.setBindGroup(0, this.computeBindGroup);
      computePass.dispatchWorkgroups(Math.ceil(this.numParticles / 64));
      computePass.end();
    }

    const textureView = this.context.getCurrentTexture().createView();
    const c = this.clearColor;
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: c.r, g: c.g, b: c.b, a: c.a },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    if (this.raymarchPipeline) {
      renderPass.setPipeline(this.raymarchPipeline);
      renderPass.setBindGroup(0, this.raymarchBindGroup);
      renderPass.draw(3, 1, 0, 0);
    }

    if (this.particleRenderPipeline) {
      renderPass.setPipeline(this.particleRenderPipeline);
      renderPass.setBindGroup(0, this.particleRenderBindGroup);
      renderPass.draw(6, this.numParticles, 0, 0);
    }

    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
  }
}
