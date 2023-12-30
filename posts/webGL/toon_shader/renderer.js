// parts 1, 3, 4, and 5: add code here!
const fragmentShaderSource = `
precision highp float;

// the following two variables are computed in the vertex shader,
// interpolated and then sent to the fragment shader.
varying vec3 v_Normal;
varying vec3 v_Position;

// variable linked to the dropdown which selects the shading method
// u_shader == 0 for None
// u_shader == 1 for Phong (Part 1)
// u_shader == 2 for Toon (Part 4)
// u_shader == 3 fro Cool-to-Warm (Part 5)
uniform int u_shader;



void main() {

vec3 point = v_Position; // surface coordinates in CAMERA space
vec3 normal = normalize(v_Normal); // unit normal in CAMERA space

  if (u_shader == 0) {
    const vec3 eye = vec3(0, 0, 0);
    vec3 l = normalize(eye - point);
    float alpha = 0.2;
    if (dot(l,normal) < alpha){
      gl_FragColor = vec4(0, 0, 0, 1);
      return;
    }
  }
  else if (u_shader == 1) {
    const vec3 eye = vec3(0, 0, 0);
    vec3 km = vec3(0,0,1);
    vec3 ca = vec3(0.2);
    vec3 cl = vec3(0.5);
    vec3 I_a = ca * km;
    vec3 l = normalize(eye - point);
    vec3 I_d = cl * km * max(0.0, dot(normal,l));

    vec3 r = -l + 2.0 * dot(l, normal) * normal;
    vec3 I_s = km * cl * pow(max(0.0, dot(l,r)),32.0);
    
    

    float alpha = 0.2;
    if (dot(l,normal) < alpha){
      gl_F
      ragColor = vec4(0, 0, 0, 1);
      return;
    }
  

    gl_FragColor = vec4(I_a + I_d + I_s,1);
  }
  else if (u_shader == 2) {
    const vec3 eye = vec3(0, 0, 0);
    vec3 km = vec3(1,0,0);
    vec3 ca = vec3(0.2);
    vec3 cl = vec3(0.5);
    vec3 I_a = ca * km;
    vec3 l = normalize(eye - point);
    vec3 I_d = cl * km * max(0.0, dot(normal,l));

    vec3 r = -l + 2.0 * dot(l, normal) * normal;
    vec3 I_s = km * cl * pow(max(0.0, dot(l,r)),32.0);



    float alpha = 0.2;
    if (dot(l,normal) < alpha){
      gl_FragColor = vec4(0, 0, 0, 1);
      return;
    }

    if (dot(l,normal) < 0.25){
      gl_FragColor = vec4(0, 0, 0, 0.75);
      return;
    }
    else if (dot(l,normal) < 0.5){
      gl_FragColor = vec4(0, 0, 0, 0.5);
      return;
    }
    else if (dot(l,normal) < 0.75){
      gl_FragColor = vec4(0, 0, 0, 0.25);
      return;
    }
    else if (dot(l,normal) < 1.0){
      gl_FragColor = vec4(0, 0, 0, 0);
      return;
    }


    gl_FragColor = vec4(I_a + I_d + I_s,1);
  }
  else if (u_shader == 3) {
    const vec3 eye = vec3(0, 0, 0);
    vec3 cw = vec3(0.9,0,0); // warm
    vec3 cc = vec3(0,0,0.9); // cool
    vec3 km = vec3(0,0,1);
    vec3 ca = vec3(0.2);
    vec3 cl = vec3(0.5);
    vec3 I_a = ca * km;
    vec3 l = normalize(eye - point);
    vec3 I_d = cl * km * max(0.0, dot(normal,l));

    // Cool-to-warm shading model
    float kw = 0.5 * (1.0 + dot(normal, l));
    vec3 c = kw * cw + (1.0 - kw) * cc;

    vec3 r = -l + 2.0 * dot(l, normal) * normal;
    vec3 I_s = km * cl * pow(max(0.0, dot(l,r)),32.0);



    float alpha = 0.2;
    if (dot(l,normal) < alpha){
      gl_FragColor = vec4(0, 0, 0, 1);
      return;
    }


    gl_FragColor = vec4(c,1);
  }

  

  //gl_FragColor = vec4(0, 0, 1, 1);
}`;

const vertexShaderSource = `
  attribute vec3 a_Position;
  attribute vec3 a_Normal;
  uniform mat4 u_ModelViewMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_ModelViewProjectionMatrix;
  varying vec3 v_Normal;
  varying vec3 v_Position;
  void main() {
    gl_Position  = u_ModelViewProjectionMatrix * vec4(a_Position, 1.0);
    v_Normal = mat3(u_NormalMatrix) * a_Normal;
    v_Position = (u_ModelViewMatrix * vec4(a_Position, 1.0)).xyz;
  }`;


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

const rotation = (dx, dy) => {
  const speed = 4;
  const R = mat4.fromYRotation(mat4.create(), speed * dx);
  return mat4.multiply(
    mat4.create(),
    mat4.fromXRotation(mat4.create(), speed * dy),
    R
  );
};

const mouseMove = (event, renderer) => {
  if (!renderer.dragging) return;
  let R = rotation(
    (event.pageX - renderer.lastX) / renderer.canvas.width,
    (event.pageY - renderer.lastY) / renderer.canvas.height
  );
  mat4.multiply(renderer.modelMatrix, R, renderer.modelMatrix);
  renderer.draw();
  renderer.lastX = event.pageX;
  renderer.lastY = event.pageY;
};

const mouseDown = (event, renderer) => {
  renderer.dragging = true;
  renderer.lastX = event.pageX;
  renderer.lastY = event.pageY;
};

const mouseUp = (event, renderer) => {
  renderer.dragging = false;
};

const mouseWheel = (event, renderer) => {
  event.preventDefault();

  let scale = 1.0;
  if (event.deltaY > 0) scale = 0.9;
  else if (event.deltaY < 0) scale = 1.1;
  let direction = vec3.create();
  vec3.subtract(direction, renderer.eye, renderer.center);
  vec3.scaleAndAdd(renderer.eye, renderer.center, direction, scale);

  mat4.lookAt(
    renderer.viewMatrix,
    renderer.eye,
    renderer.center,
    vec3.fromValues(0, 1, 0)
  );
  renderer.draw();
};

const scaleAndCenterVertices = (points) => {
  // find the bounding box and center of the mesh
  let xmin = [Infinity, Infinity, Infinity];
  let xmax = [-Infinity, -Infinity, -Infinity];
  let center = vec3.create();
  for (let k = 0; k < points.length / 3; k++) {
    for (let d = 0; d < 3; d++) {
      const x = points[3 * k + d];
      if (x < xmin[d]) xmin[d] = x;
      if (x > xmax[d]) xmax[d] = x;
      center[d] += x;
    }
  }
  // scale and center the mesh on the origin
  const length = vec3.subtract(vec3.create(), xmax, xmin);
  const lmax = Math.max.apply(Math, length);
  for (let d = 0; d < 3; d++) center[d] *= 3 / points.length;
  for (let k = 0; k < points.length / 3; k++) {
    for (let d = 0; d < 3; d++)
      points[3 * k + d] = (points[3 * k + d] - center[d]) / lmax;
  }
};

const computeNormals = (vertices, triangles) => {
  const np = vertices.length / 3;
  const nt = triangles.length / 3;

  // allocate the arrays
  let valency = new Uint8Array(np);
  let normals = new Float32Array(vertices.length);

  // add the contribution of every triangle to the vertex normals
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

class Renderer {
  constructor(canvasId) {
    // initialize webgl
    this.canvas = document.getElementById(canvasId);
    this.gl = this.canvas.getContext("webgl", { preserveDrawingBuffer: true });
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // create the shader program
    this.program = compileProgram(
      this.gl,
      vertexShaderSource,
      fragmentShaderSource
    );

    this.eye = vec3.fromValues(0, 0, 1.3);
    this.center = vec3.create();
    this.viewMatrix = mat4.create();
    mat4.lookAt(
      this.viewMatrix,
      this.eye,
      this.center,
      vec3.fromValues(0, 1, 0)
    );

    this.projectionMatrix = mat4.create();
    this.modelMatrix = mat4.create();
    mat4.perspective(
      this.projectionMatrix,
      Math.PI / 4.0,
      this.canvas.width / this.canvas.height,
      0.1,
      1000.0
    );

    // setup the callbacks
    this.dragging = false;
    let renderer = this;
    this.canvas.addEventListener("mousemove", (event) => {
      mouseMove(event, renderer);
    });
    this.canvas.addEventListener("mousedown", (event) => {
      mouseDown(event, renderer);
    });
    this.canvas.addEventListener("mouseup", (event) => {
      mouseUp(event, renderer);
    });
    this.canvas.addEventListener("mousewheel", (event) => {
      mouseWheel(event, renderer);
    });
  }

  write(mesh) {
    let gl = this.gl;

    // create a buffer for the vertices
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.vertices),
      gl.STATIC_DRAW
    );

    // create a buffer for the normals
    const normals = computeNormals(mesh.vertices, mesh.triangles);
    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    // create a buffer for the triangles
    this.triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(mesh.triangles),
      gl.STATIC_DRAW
    );
    this.nTriangles = mesh.triangles.length / 3;
  }

  draw() {
    let gl = this.gl;

    // clear the canvas and set gl parameters
    gl.useProgram(this.program);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // set the uniforms
    let mv = mat4.multiply(mat4.create(), this.viewMatrix, this.modelMatrix);
    let mvp = mat4.multiply(mat4.create(), this.projectionMatrix, mv);
    let n = mat4.transpose(mat4.create(), mat4.invert(mat4.create(), mv));
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_ModelViewProjectionMatrix"),
      false,
      mvp
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_ModelViewMatrix"),
      false,
      mv
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_NormalMatrix"),
      false,
      n
    );

    // enable the position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const aPosition = gl.getAttribLocation(this.program, "a_Position");
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    // enable the normal attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    const aNormal = gl.getAttribLocation(this.program, "a_Normal");
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    // draw the triangles
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleBuffer);
    gl.drawElements(gl.TRIANGLES, this.nTriangles * 3, gl.UNSIGNED_SHORT, 0);
  }
}
