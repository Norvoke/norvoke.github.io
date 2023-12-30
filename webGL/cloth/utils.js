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
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    const type = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    throw "Unable to compile " + type + " shader: " + error;
  }

  return shader;
};

/**
 * Compiles a shader program from vertex and fragment shader sources.
 * @param {WebGLRenderingContext} gl
 * @param {String} vertexShaderSrc
 * @param {String} fragmentShaderSrc
 * @return {WebGLProgram}
 */
const compileProgram = (gl, vertexShaderSrc, fragmentShaderSrc) => {
  let vertexShader = compileShader(gl, vertexShaderSrc, gl.VERTEX_SHADER);
  let fragmentShader = compileShader(gl, fragmentShaderSrc, gl.FRAGMENT_SHADER);

  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    throw "Unable to compile the shader program: " + error;
  }

  gl.useProgram(program);
  return program;
};

/**
 * Sets up an image to use as a texture.
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @param {String} id, the "id" given to the <img> element in index.html
 * @param {String} name, string representing the name of the variable
 *                 to use for the sampler2D in the shader, for example:
 *                 uniform sampler2D name;
 * @param {GLEnum} fmt, pixel format - usually gl.RGB for .jpg and gl.RGBA for .png
 * @param {Number} index, texture unit index to activate (N in gl.TEXTUREN).
 * @param {Boolean} flip, whether to flip the image
 */
const setupTexture = (gl, program, id, name, fmt, index, flip) => {
  let image = document.getElementById(id);
  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, name), index);
};

/**
 * Calculates the unit normal vectors at the vertices of a mesh.
 * @param {Array[float]} vertices coordinates (length = 3 x # vertices)
 * @param {Array[integer]} triangles indices (length = 3 x # triangles)
 * @return {Float32Array} vertex normals (length = 3 x # vertices)
 */
const computeNormals = (vertices, triangles) => {
  const np = vertices.length / 3;
  const nt = triangles.length / 3;

  // allocate the data
  let valency = new Uint8Array(np);
  let normals = new Float32Array(vertices.length);

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
