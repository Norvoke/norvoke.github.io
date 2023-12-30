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

class Sphere {
  /**
  * Saves the center, radius and material of the sphere.
  * @param {vec3} center.
  * @param {Number} radius.
  * @param {Object} material object with:
  *                 type {String},
  *                 km {vec3},
  *                 ks {vec3} (if type is specular or mirror)
  */
  constructor(center, radius, material) {
    this.center = center;
    this.radius = radius;
    this.material = material;
  }

  /**
   * Returns intersection information (if any) between
   * the incoming ray and this sphere.
   * @param {Ray} ray with origin and direction.
   * @returns {Object} with minimum t value {Number},
   *                   surface point ({vec3} p),
   *                   unit normal vector ({vec3} n),
   *                   reference to this object ({Sphere}).
   */
  intersect(ray) {
    let u = vec3.create();
    vec3.subtract(u, ray.origin, this.center);
    let B = vec3.dot(ray.direction, u);
    let C = vec3.dot(u, u) - this.radius * this.radius;
    let disc = B * B - C;

    if (disc < 0) return undefined;
    let tmin = -B - Math.sqrt(disc);

    if (tmin <= 0) return undefined;

    const point = ray.evaluate(tmin);
    if (this.cutoff && this.cutoff(point)) return undefined;
    
    let normal = vec3.create();
    vec3.normalize(normal, (vec3.subtract(vec3.create(), point, this.center)));

    if (tmin > 0) {
      return {
        t: tmin,
        p: point,
        n: normal,
        object: this,
      }
    }
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

const setPixel = function(image, x, y, r, g, b) {
  const offset = (image.width * y + x) * 4;
  image.data[offset + 0] = 255 * Math.min(r, 1.0);
  image.data[offset + 1] = 255 * Math.min(g, 1.0);
  image.data[offset + 2] = 255 * Math.min(b, 1.0);
  image.data[offset + 3] = 255; // alpha: transparent [0 - 255] opaque
}

class Renderer {
  /**
   * Saves view parameters, objects to render, and light.
   * @param {String} canvasId id of the <canvas> element.
   * @param {Number} fov vertical field-of-view.
   * @param {Array[Sphere]} sphere objects in the scene.
   * @param {vec3} ca ambient light.
   * @param {Object} light with {vec3} position and {vec3} cl.
   */
  constructor(canvasId, fov, objects, ca, light) {
    this.canvas = document.getElementById(canvasId);
    this.eye = vec3.fromValues(0, -0.3, -1);
    this.fov = fov;
    this.objects = objects;
    this.light = light;
    this.ca = ca;
  }

  /**
   * Determines if the ray hits an object in the scene.
   * @param {Ray} ray with origin and direction.
   * @returns {Object} with closest intersection (ixn) information.
   *                  (see return value of the Sphere interseect method).
   */
  hit(ray) {
    let ixn = undefined;

    for (let object of this.objects) {
      let newixn = object.intersect(ray);
      if (newixn && (!ixn || newixn.t < ixn.t)) {
        ixn = newixn;
      }
    }
    return ixn;
  }

  /**
   * Computes the color contribution from a ray passing through the scene.
   * @param {Ray} ray object with origin and direction.
   * @param {Number} currentDepth of the recursion.
   * @returns {vec3} color.
   */
  computeColor(ray, currentDepth) {
    const sky = vec3.fromValues(0.678, 0.847, 0.902);
    let color = sky;
    if (currentDepth > 20) return color;

    // determine if the ray hits an object in the scene
    let ixn = this.hit(ray);
    if (!ixn) return sky;

    let km = ixn.object.material.km;
    if (ixn.object.kmFunction) km = ixn.object.kmFunction(ixn.p);
    
    //Shadows
    const lightPos= vec3.subtract(vec3.create(), this.light.position, ixn.p);
    const shadowRay= new Ray(ixn.p, lightPos);
    let ixn_shadow= this.hit(shadowRay)

    if (ixn_shadow){
      return vec3.multiply(vec3.create(), km, this.ca);
    }


    const Ia = vec3.multiply(vec3.create(), km, this.ca);
    // color = Ia;

    //Diffuse
    const l = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.light.position, ixn.p));

    const n_dot_l = vec3.dot(ixn.n, l);
    const diffusion = Math.max(0.0, n_dot_l);
    const Id = vec3.multiply(vec3.create(), km, vec3.scale(vec3.create(), this.light.cl, diffusion));
    const diff = vec3.add(vec3.create(), Id, Ia);

    if (ixn.object.material.type == 'diffuse') {
      color = diff;
    }

    //Specular
    const v = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.eye, ixn.p));
    let reflectDirection = vec3.negate(vec3.create(), l);
    reflectDirection = vec3.scaleAndAdd(vec3.create(), reflectDirection, ixn.n, n_dot_l * 2.0);
    const p = 32;
    const specular = Math.pow(Math.max(0.0, vec3.dot(v, reflectDirection)), p);
    const temp = vec3.scale(vec3.create(), this.light.cl, specular);

    if (ixn.object.material.type == "specular") {
      const Is = vec3.multiply(vec3.create(), ixn.object.material.ks, temp);
      const spec = vec3.add(vec3.create(), Is, diff);
      color = spec;
    }

    if (ixn.object.material.type == "mirror") {
      const Is = vec3.multiply(vec3.create(), ixn.object.material.ks, temp);
      const spec = vec3.add(vec3.create(), Is, diff);
      const reflectedRay = new Ray(ixn.p, reflectDirection);
      const col = this.computeColor(reflectedRay, currentDepth + 1);
      color = vec3.lerp(vec3.create(), spec, col, 0.1);
    }


    return color;

  }



  /**
     * Renders the scene and displays it in the saved HTML canvas.
     */
  render() {
    // get the canvas drawing context and set up the image
    const nx = this.canvas.width;
    const ny = this.canvas.height;
    let context = this.canvas.getContext("2d");
    let image = context.createImageData(nx, ny);
    // const eye = vec3.fromValues(0, 0, 0);

    const ar = nx / ny;
    const d = 1;
    const h = 2.0 * d * Math.tan(this.fov / 2);
    const w = ar * h;

    // for each pixel:
    for (let j = 0; j < ny; ++j) {
      for (let i = 0; i < nx; ++i) {

        // compute the 3d pixel coordinates and ray direction
        const x = -w / 2 + (w * (i + Math.random())) / nx;
        const y = -h / 2 + (h * (ny - Math.random() - j)) / ny;
        const z = -d;

        const ray = new Ray(this.eye, vec3.fromValues(x, y, z));

        // set the pixel color
        let color = this.computeColor(ray, 0);
        setPixel(image, i, j, color[0], color[1], color[2]);
      }
    }
    context.putImageData(image, 0, 0);
  }
}
