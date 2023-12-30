/** 
 * Transform a point from world space to screen space.
 * @param {vec3} p, point
 * @param {mat4} transformation from world space to screen space.
 */
const transformToScreen = (p, m) => {
  const ph = vec4.fromValues(p[0], p[1], p[2], 1);
  const q = vec4.transformMat4(vec4.create(), ph, m);
  return vec3.fromValues(q[0] / q[3], q[1] / q[3], q[2] / q[3]);
};

class Point {
  /** 
   * Saves the mass and initial position of the cloth particle.
   * @param {vec3} x, initial position
   * @param {Number} mass
   */
  constructor(x, mass) {
    this.current = x.slice(); // vec3
    this.previous = x.slice(); // vec3
    this.mass = mass; // mass at this point
    this.inverseMass = 1 / mass;
    // Add texture coordinates
    this.texCoord = [x[0], x[1]]; // Assuming x[0] and x[1] are normalized in [0, 1]
  }

  /**
   * Moves the point according to the external forces.
   * Recall the formula is: p^{k+1} = 2 * p^k - p^{k-1} + fext * dt^2 / m
   * where:
   *       p^k     = this.current (vec3)
   *       p^{k-1} = this.previous (vec3)
   *       m       = this.mass (scalar), or you can you this.inverseMass for 1/m
   */
  move() {
    // PART 1C
    const dt = 7e-3;
    let windZ = -0.5 + Math.random()*15; // random wind effect in Z direction and increased for more waviness
    let fext = vec3.fromValues(0, -9.81, windZ); // include wind in the external force
    vec3.scale(fext, fext, this.mass);
    
    // PART 1A
    // Verlet integration
    let temp = vec3.create();
    vec3.scale(temp, this.current, 2);
    vec3.subtract(temp, temp, this.previous);
    vec3.scaleAndAdd(temp, temp, fext, dt * dt * this.inverseMass);

    // Update positions
    this.previous = vec3.clone(this.current);
    this.current = temp;
  }

  /** 
   * Draws the point using the 2d context.
   * @param {CanvasRenderingContext2D} context, 2d rendering context.
   * @param {mat4} transformation from world space to screen space.
   */
  draw(context, transformation) {
    const radius = 5;
    const twopi = Math.PI * 2.0;
    context.beginPath();
    const q = transformToScreen(this.current, transformation);
    context.arc(q[0], q[1], radius, twopi, false);
    context.fill();
  }
}

class Constraint {
  /** 
   * Saves the two Point objects defining this constraint.
   * The initial spring length (restLength) is calculated as ||p - q||.
   * @param {Point} p, first endpoint
   * @param {Point} q, second endpoint
   */
  constructor(p, q) {
    this.p = p;
    this.q = q;
    this.restLength = vec3.distance(p.current, q.current); // initial spring length
  }
  
  /**
   * Attempts to satisfy the constraints on this edge by restoring the spring to its restLength.
   * Edge endpoint coordinates (this.p.current and this.q.current should be updated).
   * Notation in the notes:
   *    L0 = this.restLength (scalar)
   *    p = this.p.current (vec3)
   *    q = this.q.current (vec3)
   *    mp = this.p.mass (or 1/mp = this.p.inverseMass)
   *    mq = this.q.mass (or 1/mq = this.q.inverseMass)
   */
  satisfy() {
    // PART 1B
    let delta = vec3.create();
    vec3.subtract(delta, this.q.current, this.p.current);
    let deltaLength = vec3.length(delta);
    let diff = (deltaLength - this.restLength) / deltaLength;

    vec3.scale(delta, delta, diff);
    if (this.p.inverseMass !== 0) {
      vec3.scaleAndAdd(this.p.current, this.p.current, delta, this.p.inverseMass / (this.p.inverseMass + this.q.inverseMass));
    }
    if (this.q.inverseMass !== 0) {
      vec3.scaleAndAdd(this.q.current, this.q.current, delta, -this.q.inverseMass / (this.p.inverseMass + this.q.inverseMass));
    }
  }


  /** 
   * Draws the constraint as a line using the 2d context.
   * @param {CanvasRenderingContext2D} context, 2d rendering context.
   * @param {mat4} transformation from world space to screen space.
   */
  draw(context, transformation) {
    context.beginPath();
    let q = transformToScreen(this.p.current, transformation);
    context.lineTo(q[0], q[1]);
    q = transformToScreen(this.q.current, transformation);
    context.lineTo(q[0], q[1]);
    context.stroke();
  }
}

class ClothAnimation {
  /** 
   * Sets up the point and constraints in the cloth animation.
   * The points and constraints are defined by a grid with nx points
   * in the horizontal direction and ny points in the vertical direction.
   * @param {String} canvasId, id of the HTML canvas
   * @param {Number} nx, number of points in the horizontal direction
   * @param {Number} ny, number of points in the vertical direction
   */
  constructor(canvasId, nx, ny) {
    // save the canvas and incoming parameters
    this.canvas = document.getElementById(canvasId);
    this.nx = nx;
    this.ny = ny;

    // initialize the array of point and constraints
    this.points = [];
    this.constraints = [];
    let dx = 1.0 / (this.nx - 1.0);
    let dy = 1.0 / (this.ny - 1.0);
    for (let j = 0; j < this.ny; j++)
      for (let i = 0; i < this.nx; i++) {
        let x = vec3.fromValues(i * dx, j * dy, 0);
        let point = new Point(x, 0.05); // mass = 0.05
        this.points.push(point);
      }

    // vertical constraints
    for (let j = 0; j < this.ny - 1; j++)
      for (let i = 0; i < this.nx; i++) {
        const p = j * this.nx + i;
        const q = (j + 1) * this.nx + i;
        this.constraints.push(new Constraint(this.points[p], this.points[q]));
      }

    // horizontal constraints
    for (let j = 0; j < this.ny; j++)
      for (let i = 0; i < this.nx - 1; i++) {
        const p = j * this.nx + i;
        const q = j * this.nx + i + 1;
        this.constraints.push(new Constraint(this.points[p], this.points[q]));
      }

    // any points listed here will be fixed
    const fixed = [
      this.nx * (this.ny - 1),
      this.nx * (this.ny - 1) + Math.round((this.nx - 1) / 2),
      this.nx * this.nx - 1,
    ];

    // set fixed points to have an infinite mass (inverse mass of zero)
    for (let i = 0; i < fixed.length; i++) {
      this.points[fixed[i]].mass = 1e20;
      this.points[fixed[i]].inverseMass = 0.0;
    }

    this.initialize(); // initialize the rendering context and view
  }

  /** 
   * Initialize the rendering context and set up the view.
   * The rendering context will be this.context after this function is called,
   * which will either be the "2d" or "webgl" context.
   * The transformation matrices from world space to screen space are also set up,
   * (this.viewMatrix, this.projectionMatrix, this.screenMatrix).
   * The total transformation from world space to screen space is this.transformation.
   *
   * If the WebGL context is to be used, the initGL() function is called which should
   * set up the buffers holding the static data throughout the animation.
   */
  initialize() {
    // initialize the context
    const button = document.getElementById("button-context");
    this.context = this.canvas.getContext(button.innerHTML);
    this.useWebGL = button.innerHTML == "webgl";

    // view matrix
    this.eye = vec3.fromValues(0.5, 0.5, 2);
    this.center = vec3.fromValues(0.5, 0.5, 0);
    const up = vec3.fromValues(0, 1, 0);
    this.viewMatrix = mat4.lookAt(mat4.create(), this.eye, this.center, up);

    // projection matrix
    const aspectRatio = this.canvas.width / this.canvas.height;
    const fov = Math.PI / 4.0;
    this.projectionMatrix = mat4.create();
    mat4.perspective(this.projectionMatrix, fov, aspectRatio, 1e-3, 1000);

    // screen (viewport) matrix
    const w = this.canvas.width;
    const h = this.canvas.height;
    // prettier-ignore
    this.screenMatrix = mat4.fromValues(
      w / 2, 0, 0, 0,
      0, -h / 2, 0, 0,
      0, 0, 1, 0,
      w / 2, h / 2, 0, 1
    );
    this.transformation = mat4.multiply(
      mat4.create(),
      this.screenMatrix,
      mat4.multiply(mat4.create(), this.projectionMatrix, this.viewMatrix)
    );

    if (this.useWebGL) this.initGL();
  }

  /** 
   * Upadates and draws a frame in the cloth animation.
   */
  update() {
    let numIter = 2;
    for (let iter = 0; iter < numIter; iter++) {
      // move each point according to external forces
      for (let i = 0; i < this.points.length; i++) this.points[i].move();

      // move points to satisfy the constraints (spring forces) on the edges
      for (let i = 0; i < this.constraints.length; i++)
        this.constraints[i].satisfy();
    }

    // draw the cloth
    this.draw();
  }

  /** 
   * Draw the cloth, using either the 2d context (points + lines) or the WebGL context (triangles).
   */
  draw() {
    if (this.useWebGL) {
      // draw with webgl (part 2)
      this.drawGL();
      return;
    }

    // draw to the HTML canvas
    this.context.fillStyle = "rgba(0, 0, 255, 0.4)";
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.rect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fill();

    // draw the constraints
    this.context.fillStyle = "black";
    for (let i = 0; i < this.constraints.length; i++)
      this.constraints[i].draw(this.context, this.transformation);

    // draw the points
    for (let i = 0; i < this.points.length; i++)
      this.points[i].draw(this.context, this.transformation);
  }

  /** 
   * Initialize the WebGL buffers for the static data during the animation,
   * as well as the shader program and textures.
  */
  initGL() {
    let gl = this.context;

    const vertexShaderSource = `
      precision mediump float;

      attribute vec3 a_Position;
      attribute vec3 a_Normal;
      uniform mat4 u_ViewMatrix;
      uniform mat4 u_ProjectionMatrix;
      uniform mat4 u_NormalMatrix;
      varying vec3 v_Normal;
      varying vec3 v_Position;
      
      attribute vec2 a_TexCoord; // tex coords
      varying vec2 v_TexCoord; // tex coords
  
      void main() {
      gl_Position = u_ProjectionMatrix * u_ViewMatrix * vec4(a_Position, 1.0);
      v_Normal = (u_NormalMatrix * vec4(a_Normal, 0)).xyz;
      v_Position = (u_ViewMatrix * vec4(a_Position, 1.0)).xyz;

      v_TexCoord = a_TexCoord; // Pass the texture coordinates to the fragment shader
      

      }`;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 v_Normal;
      varying vec3 v_Position;

      precision mediump float; //
      varying vec2 v_TexCoord; // 
      uniform sampler2D u_Sampler; //
      
      void main() {
      // gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      vec3 point = v_Position; // surface coordinates in CAMERA space
      vec3 normal = normalize(v_Normal); // unit normal in CAMERA space

      vec3 L = normalize(-point);
      float n_dot_l = dot(normal, L);

      vec3 ca = vec3(0.1, 0.1, 0.1);  // for ambient light
      vec3 cl = vec3(1, 1, 1); //diffuse light color
      vec3 km = vec3(0.7, 0.7, 0.7);
      vec3 Ia = ca * km;
      float diffusion = abs(n_dot_l);
      vec3 Id = cl * km * diffusion;
      vec3 Ks = vec3(0.5, 0.5, 0.5);
      vec3 V = normalize(-point);
      vec3 R = reflect(-L, normal);
      float spec = pow(max(dot(R, V), 0.0), 8.0); // p = 8
      vec3 Is = cl * Ks * spec;
      vec3 color = Ia + Id + Is;
      vec4 texColor = texture2D(u_Sampler, v_TexCoord);
      gl_FragColor = texColor * vec4(color, 1.0); // Combine texture color with lighting
      
      }`;

    // create the shader program
    this.program = compileProgram(gl, vertexShaderSource, fragmentShaderSource);

    // the triangles array remains constant during the animation
    this.triangles = [];
    for (let j = 0; j < this.ny - 1; j++) {
      for (let i = 0; i < this.nx - 1; i++) {
        // const k = j * this.nx + i;
        // PART 2A
        const lowerLeft = j * this.nx + i;
        const lowerRight = j * this.nx + (i + 1);
        const upperLeft = (j + 1) * this.nx + i;
        const upperRight = (j + 1) * this.nx + (i + 1);

        // First triangle
        this.triangles.push(lowerLeft, lowerRight, upperLeft);

        // Second triangle
        this.triangles.push(lowerRight, upperRight, upperLeft);
      }
    }

    
    
    // Part 2C

    // create buffers
    let triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.triangles), gl.STATIC_DRAW);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    image.src = 'cat.jpg'; // I thought this cat was funnier


  }

  /** 
   * Draws the cloth using the WebGL rendering context.
   */
  drawGL() {
    let gl = this.context;
    gl.clearColor(0, 0, 1, 0.4);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // extract cloth particle positions to write to the GPU
    let position = new Float32Array(3 * this.points.length);
    for (let i = 0; i < this.points.length; i++) {
      // PART 2B
      position[3 * i] = this.points[i].current[0];     // x-coordinate
      position[3 * i + 1] = this.points[i].current[1]; // y-coordinate
      position[3 * i + 2] = this.points[i].current[2]; // z-coordinate
      
    }

    // create vertex buffers
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);

    let normals = computeNormals(position, this.triangles);


    // enable position attribute
    let a_Position = gl.getAttribLocation(this.program, "a_Position");
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    
    // enable normal attribute
    let a_Normal = gl.getAttribLocation(this.program, "a_Normal");
    gl.enableVertexAttribArray(a_Normal);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);

    let u_ProjectionMatrix = gl.getUniformLocation(this.program, "u_ProjectionMatrix");

    gl.uniformMatrix4fv(u_ProjectionMatrix, false, this.projectionMatrix);

    let u_ViewMatrix = gl.getUniformLocation(this.program, "u_ViewMatrix");

    gl.uniformMatrix4fv(u_ViewMatrix, false, this.viewMatrix);

    let Vinv = mat4.invert(mat4.create(), this.viewMatrix);
    let normalMatrix = mat4.transpose(mat4.create(), Vinv);

    let u_NormalMatrix = gl.getUniformLocation(this.program, "u_NormalMatrix");

    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix);

    // Texture coordinates buffer
    let texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    let texCoords = new Float32Array(this.points.length * 2);
    for (let i = 0; i < this.points.length; i++) {
      texCoords[2 * i] = this.points[i].texCoord[1];
      texCoords[2 * i + 1] = this.points[i].texCoord[0];
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

    // Enable texture coordinate attribute
    let a_TexCoord = gl.getAttribLocation(this.program, "a_TexCoord");
    gl.enableVertexAttribArray(a_TexCoord);
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);

    // Bind the texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(gl.getUniformLocation(this.program, "u_Sampler"), 0);

    // draw triangles
    //let triangleBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    //gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.triangles), gl.STATIC_DRAW);
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.drawElements(gl.TRIANGLES, this.triangles.length, gl.UNSIGNED_SHORT, 0);
    
    
    
    

  }
}
