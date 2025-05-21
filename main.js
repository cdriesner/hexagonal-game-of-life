const conwayShaderCode = workgroupSize => /*wgsl*/ `

  fn pointy_hex_corner(
    center: vec2f,
    size: f32,
    i: f32,
    screenSize: vec2<f32>,
  ) -> vec2f {
    var out: vec2f = vec2f(0,0);
    var angle_deg: f32 = 60 * i -30;
    var angle_rad: f32 = 3.1415926535 / 180 * angle_deg;
    out.x = center.x + size * 0.85 * cos(angle_rad);
    out.y = center.y + size * 0.85 * sin(angle_rad);

    out.x = (out.x / screenSize.x);
    out.y = (out.y / screenSize.y);
    
    return out;
  }

  fn xy_to_index(x:u32, y:u32, gridSize:f32) -> i32 {
    var rowSize:u32 = u32(gridSize + gridSize - 1);

    if x > rowSize {return -1;}
    if y > rowSize {return -1;}
    if abs(f32(x) - gridSize + 1 + f32(y) - gridSize + 1) >= gridSize {return -1;}

    var i:i32 = i32(x * rowSize + y);
    return i;
  }

  @group(0) @binding(0) var<storage, read_write> vertex: array<vec2f>;
  @group(0) @binding(1) var<storage, read_write> vertexColors: array<vec4f>;
  @group(0) @binding(2) var<storage, read_write> out: array<f32>;
  @group(0) @binding(3) var<storage, read> grid: array<f32>;
  @group(0) @binding(4) var<uniform> gridSize: f32;
  @group(0) @binding(5) var<uniform> tileSize: f32;
  @group(0) @binding(6) var<uniform> screenSize: vec2<f32>;

  @compute @workgroup_size(${workgroupSize}) fn conway(
    @builtin(global_invocation_id) global_invocation_id: vec3<u32>
  ){
    var arrayCoords: vec2u = vec2u(global_invocation_id.x, global_invocation_id.y);
    var hexCoords: vec2i = vec2i(i32(f32(global_invocation_id.x) - gridSize + 1), i32(f32(global_invocation_id.y) - gridSize + 1));
    
    var x: f32 = tileSize * sqrt(3) * (f32(hexCoords.x) + f32(hexCoords.y)/2) ;
    var y: f32 = tileSize * 3/2 * f32(hexCoords.y);
    var center: vec2f = vec2f(x,y);

    var p0: vec2f = pointy_hex_corner(center,tileSize,0,screenSize);
    var p1: vec2f = pointy_hex_corner(center,tileSize,1,screenSize);
    var p2: vec2f = pointy_hex_corner(center,tileSize,2,screenSize);
    var p3: vec2f = pointy_hex_corner(center,tileSize,3,screenSize);
    var p4: vec2f = pointy_hex_corner(center,tileSize,4,screenSize);
    var p5: vec2f = pointy_hex_corner(center,tileSize,5,screenSize);

    var originIndex = xy_to_index(arrayCoords.x,arrayCoords.y,gridSize);
    var n1Index = xy_to_index(arrayCoords.x + 1,arrayCoords.y,gridSize);
    var n2Index = xy_to_index(arrayCoords.x + 1,arrayCoords.y - 1,gridSize);
    var n3Index = xy_to_index(arrayCoords.x,arrayCoords.y - 1,gridSize);
    var n4Index = xy_to_index(arrayCoords.x - 1,arrayCoords.y,gridSize);
    var n5Index = xy_to_index(arrayCoords.x - 1,arrayCoords.y + 1,gridSize);
    var n6Index = xy_to_index(arrayCoords.x,arrayCoords.y + 1,gridSize);

    var aliveNeighbors = 0;

    if n1Index >= 0 && grid[n1Index] == 1 {aliveNeighbors++;}
    if n2Index >= 0 && grid[n2Index] == 1 {aliveNeighbors++;}
    if n3Index >= 0 && grid[n3Index] == 1 {aliveNeighbors++;}
    if n4Index >= 0 && grid[n4Index] == 1 {aliveNeighbors++;}
    if n5Index >= 0 && grid[n5Index] == 1 {aliveNeighbors++;}
    if n6Index >= 0 && grid[n6Index] == 1 {aliveNeighbors++;}

    var isAlive: f32 = 0;

    if originIndex >= 0 {
      if aliveNeighbors == 2 {
        isAlive = 1;
      } else {
        isAlive = 0;
      }
      out[originIndex] = isAlive;
    }

    var color = vec4f(0.192,0.184,0.09,1.0);

    if isAlive == 1 {
      color = vec4f(1.0,0.794,0.0,1.0);
    }

    if originIndex >= 0 {
      var i = originIndex * 12;
      //tri 1
      vertex[i] = p0;
      vertex[i+1] = p1;
      vertex[i+2] = p2;

      vertexColors[i] = color;
      vertexColors[i+1] = color;
      vertexColors[i+2] = color;

      //tri 2
      vertex[i+3] = p0;
      vertex[i+4] = p2;
      vertex[i+5] = p3;

      vertexColors[i+3] = color;
      vertexColors[i+4] = color;
      vertexColors[i+5] = color;

      //tri 3
      vertex[i+6] = p0;
      vertex[i+7] = p3;
      vertex[i+8] = p5;

      vertexColors[i+6] = color;
      vertexColors[i+7] = color;
      vertexColors[i+8] = color;

      //tri 4
      vertex[i+9] = p5;
      vertex[i+10] = p3;
      vertex[i+11] = p4;

      vertexColors[i+9] = color;
      vertexColors[i+10] = color;
      vertexColors[i+11] = color;
    }
  }
`;

const renderShaderCode = /*wgsl*/ `
  struct Vertex {
    @location(0) position: vec2f,
  }

  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
  };

  @group(0) @binding(0) var<storage, read> vertex: array<vec2f>;
  @group(0) @binding(1) var<storage, read> vertexColors: array<vec4f>;

  @vertex fn vs(
    @builtin(vertex_index) vertexIndex: u32
  ) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = vec4f(vertex[vertexIndex].x, vertex[vertexIndex].y,0.0, 1.0);
    vsOut.color = vec4f(vertexColors[vertexIndex].r,vertexColors[vertexIndex].g,vertexColors[vertexIndex].b,vertexColors[vertexIndex].a);
    return vsOut;
  }

  @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    return vsOut.color;
  }
`;

const canvas = document.querySelector('canvas');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const gameSize = 20;
const numberOfTiles = 1 + 3 * (gameSize - 1) * gameSize;
const tileSize =
  (1 / ((gameSize + gameSize - 1) * 0.75)) * (canvas.height - 60);

let gameGrid = [];

for (let x = -gameSize + 1; x < gameSize; x++) {
  const row = [];
  for (let y = -gameSize + 1; y < gameSize; y++) {
    if (Math.abs(x + y) < gameSize) {
      row.push(Math.random() < 0.9 ? 0 : 1);
    } else {
      row.push(0);
    }
  }
  gameGrid.push(row);
}
gameGrid = gameGrid.flat();

gameGrid = new Float32Array(gameGrid);

const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (!device) {
  fail('need a browser that supports WebGPU');
}

const renderContext = canvas.getContext('webgpu');
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
renderContext.configure({
  device,
  format: presentationFormat
});

const Time = class {
  constructor() {
    this.lastUpdate = Date.now();
  }

  get delta() {
    const currentTime = Date.now();
    let delta = currentTime - this.lastUpdate;
    this.lastUpdate = currentTime;
    return delta;
  }
};

const clock = new Time();
const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

let count = 0;

const dispatchCount = [
  Math.ceil((gameSize + gameSize - 1) / 8),
  Math.ceil((gameSize + gameSize - 1) / 8),
  1
];
const workgroupSize = [8, 8, 1];
while (count < 100) {
  count++;

  const conwayShaderModule = device.createShaderModule({
    label: 'conway shader module',
    code: conwayShaderCode(workgroupSize)
  });

  const renderShaderModule = device.createShaderModule({
    label: 'render shader module',
    code: renderShaderCode
  });

  const conwayComputePipeline = device.createComputePipeline({
    label: 'conway compute pipeline',
    layout: 'auto',
    compute: {
      module: conwayShaderModule
    }
  });

  const renderPipeline = device.createRenderPipeline({
    label: 'render pipeline',
    layout: 'auto',
    vertex: {
      module: renderShaderModule
    },
    fragment: {
      module: renderShaderModule,
      targets: [{ format: presentationFormat }]
    }
  });

  const gameSizeBuffer = device.createBuffer({
    labe: 'game size buffer',
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const tileSizeBuffer = device.createBuffer({
    labe: 'tile size buffer',
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const screenSizeBuffer = device.createBuffer({
    labe: 'screen size buffer',
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const gameGridBuffer = device.createBuffer({
    label: 'game grid buffer',
    size: gameGrid.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  const outputBuffer = device.createBuffer({
    label: 'output buffer',
    size: gameGrid.byteLength,
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  });

  const mapBuffer = device.createBuffer({
    label: 'map buffer',
    size: gameGrid.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: 12 * 8 * (gameSize + gameSize - 1) * (gameSize + gameSize - 1),
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  });

  const vertexColorBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: 12 * 16 * (gameSize + gameSize - 1) * (gameSize + gameSize - 1),
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  });

  device.queue.writeBuffer(gameGridBuffer, 0, gameGrid);
  device.queue.writeBuffer(gameSizeBuffer, 0, new Float32Array([gameSize]));
  device.queue.writeBuffer(tileSizeBuffer, 0, new Float32Array([tileSize]));
  device.queue.writeBuffer(
    screenSizeBuffer,
    0,
    new Float32Array([canvas.width, canvas.height])
  );

  const conwayBindGroup = device.createBindGroup({
    label: 'input bind group',
    layout: conwayComputePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: vertexBuffer } },
      { binding: 1, resource: { buffer: vertexColorBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
      { binding: 3, resource: { buffer: gameGridBuffer } },
      { binding: 4, resource: { buffer: gameSizeBuffer } },
      { binding: 5, resource: { buffer: tileSizeBuffer } },
      { binding: 6, resource: { buffer: screenSizeBuffer } }
    ]
  });

  const renderPassDescriptor = {
    label: 'basic render pass',
    colorAttachments: [
      {
        clearValue: [0.803, 0.364, 0.0, 1.0],
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  };

  renderPassDescriptor.colorAttachments[0].view = renderContext
    .getCurrentTexture()
    .createView();

  const renderBindGroup = device.createBindGroup({
    label: 'render Bind Group',
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: vertexBuffer } },
      { binding: 1, resource: { buffer: vertexColorBuffer } }
    ]
  });

  clock.delta;
  const gameEncoder = device.createCommandEncoder({
    label: 'game encoder'
  });

  const conwayPass = gameEncoder.beginComputePass({
    label: 'conway compute pass'
  });

  conwayPass.setPipeline(conwayComputePipeline);
  conwayPass.setBindGroup(0, conwayBindGroup);
  conwayPass.dispatchWorkgroups(...dispatchCount);
  conwayPass.end();

  gameEncoder.copyBufferToBuffer(
    outputBuffer,
    0,
    mapBuffer,
    0,
    outputBuffer.size
  );

  const renderPass = gameEncoder.beginRenderPass(renderPassDescriptor);

  renderPass.setPipeline(renderPipeline);
  renderPass.setBindGroup(0, renderBindGroup);
  renderPass.draw(12 * (gameSize + gameSize - 1) * (gameSize + gameSize - 1));
  renderPass.end();

  const commandBuffer = gameEncoder.finish();
  device.queue.submit([commandBuffer]);

  await mapBuffer.mapAsync(GPUMapMode.READ);
  const result = new Uint32Array(mapBuffer.getMappedRange());
  gameGrid = result;

  await sleep(1000 / 2 - clock.delta);
}
