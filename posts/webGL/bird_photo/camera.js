class Ray {
  /**
   * Saves the origin and direction of the ray.
   * @param {vec3} origin.
   * @param {vec3} direction.
   */
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = vec3.normalize(vec3.create(), direction);
  }

  /**
   * Evaluates a point along the ray.
   * @param {Number} t
   * @returns {vec3} point = origin + t * direction
   */
  evaluate(t) {
    return vec3.scaleAndAdd(vec3.create(), this.origin, this.direction, t);
  }
}

class Triangle {
  /**
   * Saves the 3 vertices and outward normal of the triangle.
   * Transforms the vertices and normal of the triangle (for Part 3).
   * @param {vec3} a first vertex.
   * @param {vec3} b second vertex.
   * @param {vec3} c third vertex.
   */
  constructor(a, b, c, n) {
    let center = vec3.fromValues(-0.038654111325740814, 3.4428632259368896, 0.6172986626625061);
    let T = mat4.fromTranslation(mat4.create(), center);
    let Tinv = mat4.invert(mat4.create(), T);
    let R = mat4.fromZRotation(mat4.create(), Math.PI/8.0);
    let M = mat4.multiply(mat4.create(), R, Tinv);
    M = mat4.multiply(mat4.create(), T, M);
    let Minv = mat4.invert(mat4.create(), M);
    let Minvtrans = mat4.transpose(mat4.create(), Minv);
    let ta = vec4.transformMat4(
      vec4.create(),
      vec4.fromValues(a[0], a[1], a[2], 1),
      M
    );
    let tb = vec4.transformMat4(
      vec4.create(),
      vec4.fromValues(b[0], b[1], b[2], 1),
      M
    );
    let tc = vec4.transformMat4(
      vec4.create(),
      vec4.fromValues(c[0], c[1], c[2], 1),
      M
    );
    let tn = vec4.transformMat4(
      vec4.create(),
      vec4.fromValues(n[0], n[1], n[2], 0),
      Minvtrans
    );
    this.a = vec3.fromValues(ta[0], ta[1], ta[2]);
    this.b = vec3.fromValues(tb[0], tb[1], tb[2]);
    this.c = vec3.fromValues(tc[0], tc[1], tc[2]);
    this.normal = vec3.fromValues(tn[0], tn[1], tn[2]);
  
    // this.a = a;
    // this.b = b;
    // this.c = c;
    // this.normal = n;
  }

  /**
   * The following "intersect" function is already implemented in utils.min.js.
   * The documentation is provided here so you know what it returns.
   *
   * intersect(ray, tmin, tmax)
   *
   * Determines if there is an intersection between this triangle and a ray.
   * @param {Ray} ray with origin and direction.
   * @returns {Object} with minimum t value {Number},
   *                   surface point ({vec3} p),
   *                   unit normal vector ({vec3} n),
   *                   km ({vec3}) diffuse reflection coefficient
   */
}

class Camera {
  /**
   * Saves view parameters and objects to render.
   * @param {String} canvasId id of the <canvas> element.
   * @param {Number} fov vertical field-of-view.
   * @param {vec3} eye - location of camera
   */
  constructor(canvasId, fov, eye) {
    this.canvas = document.getElementById(canvasId);
    this.fov = fov;
    this.eye = eye;
  }

  /** 
   * Takes a picture of (renders) the scene and displays it in the saved HTML canvas.
   * @param{Model} bird with a center and color.
   * @param{Lake} lake - a large sphere representing the lake.
  */
  takePicture(bird, lake) {
    // get the canvas drawing context and set up the image
    let context = this.canvas.getContext("2d");
    const nx = this.canvas.width;
    const ny = this.canvas.height;
    let image = context.createImageData(nx, ny);

    // Please feel free to remove the following two console.log messages.
    // They are just here so you can inspect the properties of the scene,
    // specifically: bird.center, bird.color and lake.color.
    // Also notice that if you expand the __proto__ section, you should
    // see that both objects have an "intersect" function.
    console.log(bird);
    console.log(lake);
    
    // dimensions of image plane
    const d = vec3.distance(this.eye, bird.center);
    const height = 2.0 * d * Math.tan(0.5 * this.fov);
    const aspectRatio = nx / ny;
    const width = aspectRatio * height;

    // setup the lighting
    const light = {
      cl: vec3.fromValues(1, 1, 1),
      direction: vec3.normalize(vec3.create(), vec3.fromValues(-1, 1, 1))
    };
    const ca = vec3.fromValues(0.3, 0.3, 0.3); // ambient light color
    
    let B = mat4.targetTo(mat4.create(), this.eye, bird.center, vec3.fromValues(0,1,0));
    // for each pixel
    const startTime = new Date();
    for (let j = 0; j < ny; ++j) {
      for (let i = 0; i < nx; ++i) {
        const x = -width / 2 + width * (i +  Math.random()) / nx;
        const y = -height / 2 + height * (ny - Math.random() - j) / ny;
        const z = -d;
        let p = vec4.fromValues(x,y,z,1);
        // let B = mat4.targetTo(mat4.create(), this.eye, bird.center, vec3.fromValues(0,1,0));
        let q = vec4.transformMat4(vec4.create(), p, B);
        let eyeVec4 = vec4.fromValues(this.eye[0], this.eye[1], this.eye[2],0);
        let r = vec4.subtract(vec4.create(), q, eyeVec4);
        let ray = new Ray(this.eye, vec3.fromValues(r[0],r[1],r[2]));
        
        let ixnB = bird.intersect(ray);
        
        //let ixnM = model.intersect(ray);
        let ixnL = lake.intersect(ray);
        
        let color = lake.color;

        // shading the bird when directly hit
        if(ixnB) {
          color = ixnB.km;
          
          // ambient term 
          let Ia = vec3.multiply(vec3.create(), ixnB.km, ca);
          
          // diffuse term
          let n_dot_l = vec3.dot(ixnB.n, light.direction);
          let diffusion = Math.max(0.0, n_dot_l);
          let Id = vec3.multiply(vec3.create(), ixnB.km, vec3.scale(vec3.create(), light.cl, diffusion));
          color = vec3.add(vec3.create(), Ia, Id);
          
        //  reflection when the lake is hit
        } else if(ixnL) {
          let n_dot_r = vec3.dot(ixnL.n, ray.direction); 
          let reflectDirection = vec3.scaleAndAdd(vec3.create(), ray.direction, ixnL.n, n_dot_r * -2.0);
          let shadowRay = new Ray(ixnL.p, light.direction);
          let ifShadow = bird.intersect(shadowRay);
          if (ifShadow) {
            let Ia = vec3.multiply(vec3.create(), ixnL.km, ca);
            color = Ia;
          }
          let reflectedRay = new Ray(ixnL.p, reflectDirection);
          let intersectB = bird.intersect(reflectedRay);
          if (intersectB) {
            // ambient term 
            let Ia = vec3.multiply(vec3.create(), intersectB.km, ca);
            let n_dot_l = vec3.dot(intersectB.n, light.direction);
            let diffusion = Math.max(0.0, n_dot_l);
            // diffuse term
            let Id = vec3.multiply(vec3.create(), intersectB.km, vec3.scale(vec3.create(), light.cl, diffusion));
            let shadedBirdColor = vec3.add(vec3.create(), Ia, Id);
            // Mixing the colors
            color = vec3.add(vec3.create(), vec3.scale(vec3.create(), shadedBirdColor, 0.9), vec3.scale(vec3.create(), lake.color, 0.5));
        }
          
      }
        setPixel(image, i, j, color[0], color[1], color[2]); // defined in utils.min.js
      }
    }
    context.putImageData(image, 0, 0);
    const endTime = new Date();
    console.log(`rendered in ${endTime - startTime} ms`);
  }
}
