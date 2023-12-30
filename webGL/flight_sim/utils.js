/** 
 * Compiles a vertex or fragment shader.
 * @param {WebGLRenderingContext} gl 
 * @param {String} shaderSource
 * @param {GLenum} type, either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @return {WebGLShader}
 */
const compileShader = (gl, shaderSource, type) => {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    let error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw (
      "Unable to compile " +
      (type === gl.VERTEX_SHADER ? "vertex" : "fragment") +
      " shader: " +
      error
    );
  }

  return shader;
};

/** 
 * Compiles a program from vertex and fragment shader sources.
 * @param {WebGLRenderingContext} gl 
 * @param {String} vertexShaderSource
 * @param {String} fragmentShaderSource
 * @return {WebGLProgram}
 */
const compileProgram = (gl, vertexShaderSource, fragmentShaderSource) => {
  let vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  let fragmentShader = compileShader(
    gl,
    fragmentShaderSource,
    gl.FRAGMENT_SHADER
  );

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw (
      "Unable to compile the shader program: " + gl.getProgramInfoLog(program)
    );
  }

  gl.useProgram(program);
  return program;
};

/** 
 * Calculates the unit normal vectors at the vertices of a mesh.
 * @param {Array[float]} vertices coordinates (length = 3 x # vertices)
 * @param {Array[integer]} triangles indices (length = 3 x # triangles)
 * @returns {Array{float]} vertex normals (length = 3 x # vertices)
 */
const computeNormals = (vertices, triangles) => {
  const np = vertices.length / 3;
  const nt = triangles.length / 3;

  // allocate the data
  valency = new Uint8Array(np);
  normals = new Float32Array(vertices.length);

  // add the contribution of every triangle to the vertices
  for (let i = 0; i < nt; i++) {
    const t0 = triangles[3 * i];
    const t1 = triangles[3 * i + 1];
    const t2 = triangles[3 * i + 2];

    // retrieve the coordinates of the points
    const p0 = vertices.slice(3 * t0, 3 * t0 + 3);
    const p1 = vertices.slice(3 * t1, 3 * t1 + 3);
    const p2 = vertices.slice(3 * t2, 3 * t2 + 3);

    // compute triangle normal
    const u = vec3.subtract(vec3.create(), p1, p0);
    const v = vec3.subtract(vec3.create(), p2, p0);
    const n = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), u, v));

    // add the contribution to every vertex
    for (let j of [t0, t1, t2]) {
      for (let d = 0; d < 3; d++) normals[3 * j + d] += n[d];
      valency[j]++;
    }
  }

  // average the vertex normals
  for (let i = 0; i < np; i++) {
    let normal = normals.slice(3 * i, 3 * i + 3);
    for (let d = 0; d < 3; d++) normal[d] /= valency[i];
    normal = vec3.normalize(vec3.create(), normal);
    for (let d = 0; d < 3; d++) normals[3 * i + d] = normal[d];
  }
  return normals;
};

/** 
 * Returns a transformed version of the original Mike Wazowski model,
 * placing the model at the maximum height in the terrain.
 * @param {Terrain} terrain object to determine the maximum height.
 * @return {Object} with fields for "vertices", "triangles" and "normals".
 */
const preprocessWazowski = (terrain) => {
  // copy the original mesh
  let wazowski = JSON.parse(JSON.stringify(originalWazowski));
  wazowski.triangles = wazowski.indices.slice();
  wazowski.indices = [];

  // compute the center of the bounding box
  let center = vec3.create();
  let xmin = vec3.fromValues(Infinity, Infinity, Infinity);
  let xmax = vec3.fromValues(-Infinity, -Infinity, -Infinity);
  for (let d = 0; d < 3; d++) {
    for (let i = 0; i < wazowski.vertices.length / 3; i++) {
      if (wazowski.vertices[3 * i + d] < xmin[d])
        xmin[d] = wazowski.vertices[3 * i + d];
      if (wazowski.vertices[3 * i + d] > xmax[d])
        xmax[d] = wazowski.vertices[3 * i + d];
    }
    center[d] = 0.5 * (xmin[d] + xmax[d]);
  }

  // pick the point on the terrain with maximum height
  let maxHeight = terrain.vertices[2];
  let idx = 0;
  for (let k = 0; k < terrain.vertices.length / 3; k++) {
    const h = terrain.vertices[3 * k + 2];
    if (h > maxHeight) {
      maxHeight = h;
      idx = k;
    }
  }

  // translation of model to the origin
  let modelMatrix = mat4.create();
  mat4.fromTranslation(
    modelMatrix,
    vec3.fromValues(-center[0], -center[1], -center[2])
  );

  // scale the model
  const scale = .15;
  const S = mat4.fromScaling(
    mat4.create(),
    vec3.fromValues(scale, scale, scale+0.15)
  );
  mat4.multiply(modelMatrix, S, modelMatrix);

  // point to translate the model to: chosen terrain point,
  // with offset in z according to the size of the mesh
  let point = terrain.vertices.slice(3 * idx, 3 * idx + 3);
  point[2] += scale * Math.abs(center[2] - xmin[2]);

  // translate to the desired point
  let translation = mat4.fromTranslation(mat4.create(), point);
  mat4.multiply(modelMatrix, translation, modelMatrix);

  // transform the vertices
  for (let i = 0; i < wazowski.vertices.length / 3; i++) {
    let v = vec3.transformMat4(
      vec3.create(),
      wazowski.vertices.slice(3 * i, 3 * i + 3),
      modelMatrix
    );
    for (let d = 0; d < 3; d++) wazowski.vertices[3 * i + d] = v[d];
  }

  wazowski.normals = computeNormals(wazowski.vertices, wazowski.triangles);
  return wazowski;
}

/**
 * Interpolates two values (a0 and a1) using some interpolation variable w.
 * @param {Number} a0
 * @param {Number} a1
 * @param {Number} w
 */
const interpolate = (a0, a1, w) => {
  return (a1 - a0) * ((w * (w * 6.0 - 15.0) + 10.0) * w * w * w) + a0;
};

/**
 * Calculates the dot product of the grid gradient with the offset from the point to the grid coordinates.
 * @param {Array} grid array containing gradient values on the background grid.
 * @param {Number} gx index of the grid cell along the width.
 * @param {Number} gy index of the grid cell along the height.
 * @param {Number} px coordinates of the point along the width.
 * @param {Number} py coordinates of the point along the height.
 */
const dotGridGradient = (grid, gx, gy, x, y) => {
  console.assert(gx >= 0 && gx < grid.nx + 1);
  console.assert(gy >= 0 && gy < grid.ny + 1);
  const gradient = grid[gy * (grid.nx + 1) + gx];
  const delta = vec2.fromValues(x - gx, y - gy);
  return vec2.dot(delta, gradient);
};

/**
 * Computes the Perlin weight for point (x, y) given a background grid.
 * @param {Array} grid array containing gradient values on the background grid.
 * @param {Number} x coordinate of point along the width.
 * @param {Number} y coordinate of point along the height.
 */
const getPerlinWeight = (grid, x, y) => {
  const ax = Math.floor(x);
  const ay = Math.floor(y);
  const bx = ax + 1;
  const by = ay;
  const cx = ax;
  const cy = ay + 1;
  const dx = ax + 1;
  const dy = ay + 1;

  const da = dotGridGradient(grid, ax, ay, x, y);
  const db = dotGridGradient(grid, bx, by, x, y);
  const dc = dotGridGradient(grid, cx, cy, x, y);
  const dd = dotGridGradient(grid, dx, dy, x, y);

  const wab = interpolate(da, db, x - ax);
  const wcd = interpolate(dc, dd, x - ax);
  return interpolate(wab, wcd, y - ay);
};

/**
 * Creates a grid (as an array) of random gradients.
 * @param {Number} nx number of cells in the grid along the width.
 * @param {Number} ny number of cells in the grid along the height.
 * @returns {Array} array of random gradients with length (nx + 1) * (ny + 1).
 */
const createGrid = (nx, ny) => {
  let grid = new Array((nx + 1) * (ny + 1));
  for (let k = 0; k < grid.length; ++k) {
    const random = 2.0 * Math.PI * Math.random();
    grid[k] = vec2.fromValues(Math.cos(random), Math.sin(random));
  }
  grid.nx = nx;
  grid.ny = ny;
  return grid;
};

class PerlinNoise {
  /**
   * Initializes the background grids of random gradients.
   * @param {String} canvasId id of the <canvas> element
   * @param {Number} nx initial number of cells in the grid along the width.
   * @param {Number} ny initial number of cells in the grid along the height.
   * @param {Number} nOctaves # of octaves to use when creating Perlin noise.
   */
  constructor(nx, ny, nOctaves) {
    this.grids = new Array(nOctaves);
    for (let i = 0; i < nOctaves; ++i) {
      this.grids[i] = createGrid(nx / 2 ** i, ny / 2 ** i);
    }
  }

  /** 
   * Returns the intensity at the vertices of a width x height grid.
   * @param {Number} width, number of points in the horizontal direction.
   * @param {Number} height, number of points in the vertical direction.
   * @return {Array[float]} noise value at each point in the grid (length = width * height).
  */
  getIntensity(width, height) {
    const nOctaves = this.grids.length;
    let amplitudes = new Array(nOctaves);
    for (let i = 0; i < nOctaves; i++)
      amplitudes[i] = 0.5 ** (nOctaves - i - 1);

    let intensities = new Array(width * height);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        let t = 0;
        for (let i = 0; i < nOctaves; ++i) {
          const lx = width / this.grids[i].nx;
          const ly = height / this.grids[i].ny;
          const weight = getPerlinWeight(
            this.grids[i],
            (x + 0.5) / lx,
            (y + 0.5) / ly
          );
          t += amplitudes[i] * weight;
        }
        intensities[y * width + x] = t;
      }
    }
    return intensities;
  }
}

class Terrain {
  /** 
   * Initializes a terrain mesh.
   * @param {Number} nx, number of points in the x-direction
   * @param {Number} ny, number of points in the y-direction
   * @param {Number} lx, length in the x-direction
   * @param {Number} ly, length in the y-direction
   * @param {Number} maxHeight, maximum height in the z-direction
   * @param {Number} numGrids, number of grids to use for Perlin noise.
   * @return {Object} mesh with "vertices", "triangles" and "normals".
   */
  constructor(nx, ny, lx, ly, maxHeight, numGrids) {

    let perlin = new PerlinNoise(nx, ny, numGrids);
    let intensity = perlin.getIntensity(nx, ny);

    const dx = lx / (nx - 1);
    const dy = ly / (ny - 1);

    // create vertices
    this.vertices = new Array();
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = i * dx;
        const y = j * dy;
        const z = maxHeight * intensity[j * nx + i];
        this.vertices.push(x, y, z);
      }
    }

    // create triangles
    this.triangles = new Array();
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const idx = j * nx + i;
        this.triangles.push(idx, idx + 1, idx + nx + 1);
        this.triangles.push(idx, idx + nx + 1, idx + nx);
      }
    }
    this.normals = computeNormals(this.vertices, this.triangles);
  }
}
