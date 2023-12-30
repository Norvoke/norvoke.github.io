class Ray {
  /** 
  Saves the origin and direction of the ray.
  @param {vec3} origin.
  @param {vec3} direction.
  */
  constructor(origin, direction) {
    this.origin = origin;
    this.direction = vec3.normalize(vec3.create(), direction);
  }
}

class Sphere {
  /**
   * Saves the center and radius of the sphere.
   * @param {vec3} center.
   * @param {Number} radius.
   */
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }

  /**
   * Determines the ray parameter value (t) if there
   * is an intersection between this sphere and a ray.
   * @param {Ray} ray with origin and direction.
   * @returns closest ray intersection value (t) or undefined if no intersection.
   */
  intersect(ray) {
    // exercise 3a: ray-sphere intersection
    // return undefined if no intersection
    // this.origin - this.center <-- bug
    let u = vec3.create();
    vec3.subtract(u, ray.origin, this.center);
    let B = vec3.dot(ray.direction, u);
    let C = vec3.dot(u, u) - this.radius * this.radius;
    let disc = B * B - C;
    if (disc < 0) return undefined;
    let tmin = -B - Math.sqrt(disc);
    return tmin;
  }
}

class Triangle {
  /**
   * Saves the 3 vertices of the triangle.
   * @param {vec3} a first vertex.
   * @param {vec3} b second vertex.
   * @param {vec3} c third vertex.
   */
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
  }

  /**
   * Determines the ray parameter value (t) if there
   * is an intersection between this triangle and a ray.
   * @param {Ray} ray with origin and direction.
   * @returns closest ray intersection value (t) or undefined if no intersection.
   */
  intersect(ray) {
    // Calculate the vectors for edges and the normal vector of the triangle
    const e1 = vec3.create();
    const e2 = vec3.create();
    const h = vec3.create();
    const eye = vec3.create();
    vec3.subtract(e1, this.b, this.a);
    vec3.subtract(e2, this.c, this.a);

    let A = mat3.create();
    A[0] = this.a[0] - this.c[0];
    A[1] = this.a[1] - this.c[1];
    A[2] = this.a[2] - this.c[2];
    A[3] = this.b[0] - this.c[0];
    A[4] = this.b[1] - this.c[1];
    A[5] = this.b[2] - this.c[2];
    A[6] = -(ray.direction[0]);
    A[7] = -(ray.direction[1]);
    A[8] = -(ray.direction[2]);

    let v1 = ray.origin[0] - this.c[0];
    let v2 = ray.origin[1] - this.c[1];
    let v3 = ray.origin[2] - this.c[2];
    let B = vec3.fromValues(v1, v2, v3);

    let Ainv = mat3.create();
    mat3.invert(Ainv, A);

    let UVT = vec3.create();
    vec3.transformMat3(UVT, B, Ainv);

    let U = UVT[0];
    let V = UVT[1];
    let T = UVT[2];

    let W = 1 - U - V;

    if ((U > 1) || (U < 0)) {
      return undefined;
    }

    if ((V > 1) || (V < 0)) {
      return undefined;
    }

    if ((W > 1) || (W < 0)) {
      return undefined;
    }

    return T;

    // Calculate the cross product of ray direction and e2
    vec3.cross(h, ray.direction, e2);
    const a = vec3.dot(e1, h);

    if (a > -Number.EPSILON && a < Number.EPSILON) {
      // The ray is parallel to the triangle plane, so no intersection
      return undefined;
    }

    const f = 1.0 / a;
    const s = vec3.create();
    vec3.subtract(s, ray.origin, this.a);

    const u = f * vec3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
      // The intersection point is outside the triangle edge bounds
      return undefined;
    }

    const q = vec3.create();
    vec3.cross(q, s, e1);
    const v = f * vec3.dot(ray.direction, q);

    if (v < 0.0 || u + v > 1.0) {
      // The intersection point is outside the triangle edge bounds
      return undefined;
    }

    // Compute the intersection point
    const t = f * vec3.dot(e2, q);

    if (t > Number.EPSILON) {
      // Intersection point is valid, return t
      return t;
    }

    // Intersection is behind the ray origin
    return undefined;
  }
}

class SunsetRenderer {
  /**
   * Saves view parameters and objects to render.
   * @param {String} canvasId id of the <canvas> element.
   * @param {Number} fov vertical field-of-view.
   * @param {Sphere} sphere representing the sun.
   * @param {Array[Triangle]} mountains 3 triangles representing the mountains.
   */
  constructor(canvasId, fov, sun, mountains) {
    this.canvas = document.getElementById(canvasId);
    this.fov = fov;
    this.sun = sun;
    this.mountains = mountains;
  }
}

/**
 * Sets the color at a pixel.
 * @param {ImageData} image represents the pixel data in a canvas.
 * @param {Number} i index of pixel along the width.
 * @param {Number} j index of pixel along the height.
 * @param {Number} r red component of color to set in [0, 1].
 * @param {Number} g green component of color to set in [0, 1].
 * @param {Number} b blue component of color to set in [0, 1].
 */
const setPixel = function(image, i, j, r, g, b) {
  const offset = (image.width * j + i) * 4;
  image.data[offset + 0] = 255 * Math.min(r, 1.0);
  image.data[offset + 1] = 255 * Math.min(g, 1.0);
  image.data[offset + 2] = 255 * Math.min(b, 1.0);
  image.data[offset + 3] = 255;
};

/**
 * Renders the scene and displays it in the saved HTML canvas.
 */
SunsetRenderer.prototype.render = function() {
  // get the canvas drawing context and set up the image
  let context = this.canvas.getContext("2d");
  const nx = this.canvas.width;
  const ny = this.canvas.height;
  let image = context.createImageData(nx, ny);

  const aspectRatio = nx / ny;
  const d = 1;
  const h = 2.0 * d * Math.tan(fov / 2);
  const w = aspectRatio * h;

  // define colors
  const skyBlue = vec3.fromValues(0.378, 0.347, 0.902);
  const skyPink = vec3.fromValues(1.0, 0.614, 0.657);
  const cSun = vec3.fromValues(1.0, 0.894, 0.71);
  const cMtn1 = vec3.fromValues(0, 0.196, 0.125); // first and third mountains
  const cMtn2 = vec3.fromValues(0, 0.1411, 0.098); // second mountain

  // determine the color of each pixel
  const startTime = new Date();
  for (let j = 0; j < ny; ++j) {
    for (let i = 0; i < nx; ++i) {
      // sky color which depends on which row of pixels (j) is being processed
      let cSky = vec3.create();
      vec3.lerp(cSky, skyBlue, skyPink, Math.sqrt(j / ny));

      // initialize to the sky color (which should be used if no intersection is found)
      let color = cSky;

      // const randX = Math.random() * (10.0 - 1.0) + 1.0; Interesting blur pattern
      // const randY = Math.random() * (10.0 - 1.0) + 1.0;
      const randX = Math.random() * (10.0 - 1.0) + 1.0;
      const randY = Math.random() * (10.0 - 1.0) + 1.0;

      // compute the pixel coordinates and ray direction (part 1)
      const x = -w / 2 + w * (i + randX) / nx;
      const y = -h / 2 + h * (ny - randY - j) / ny;
      const z = -d;

      const eye = vec3.fromValues(0, 0, 0); // position of the camera
      const fov = Math.PI / 3; // field-of-view

      const ray = new Ray(eye, vec3.fromValues(x, y, z));

      // find the closest intersection point (parts 2 & 3)
      let sphere = this.sun;
      let triangle1 = this.mountains[0];
      let triangle2 = this.mountains[1];
      let triangle3 = this.mountains[2];

      const t = sphere.intersect(ray);
      if (t) {
        color = cSun;
      }

      const f = triangle1.intersect(ray);
      if (f) {
        color = cMtn1;
      }

      const g = triangle2.intersect(ray);
      if (g) {
        color = cMtn2;
      }

      const l = triangle3.intersect(ray);
      if (l) {
        color = cMtn1;
      }

      // set the pixel color
      setPixel(image, i, j, color[0], color[1], color[2]);
    }
  }
  context.putImageData(image, 0, 0);
  const endTime = new Date();
  const elapsed = endTime - startTime;
  console.log(`rendered in ${elapsed} ms`);

};
