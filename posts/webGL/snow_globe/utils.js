/** 
 * Sets up an image to use as a texture.
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @param {String} id, the "id" given to the <img> element in index.html
 * @param {GLEnum} fmt, pixel format - usually gl.RGB for .jpg and gl.RGBA for .png
 * @param {String} name, string representing the name of the variable
 *                 to use for the sampler2D in the shader, for example:
 *                 uniform sampler2D name;
 * @param {Number} index, texture unit index to activate (N in gl.TEXTUREN).
 */
const setupTexture = (gl, program, id, fmt, name, index) => {
  let image = document.getElementById(id);
  let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, name), index);
};

/** 
 * Compiles a shader program from vertex and fragment shader sources with
 * an option to specify which varyings should be captured (if gl is a WebGL2RenderingContext)
 * @param {WebGL{2}RenderingContext} gl 
 * @param {String} vertexShaderSource
 * @param {String} fragmentShaderSource
 * @return {WebGLProgram}
 */
const compileProgram = (gl, vertexShaderSource, fragmentShaderSource, varyings) => {
  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
    throw "Error in vertex shader: " + gl.getShaderInfoLog(vertexShader);

  let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
    throw "Error in fragment shader: " + gl.getShaderInfoLog(fragmentShader);

  // create shader program
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // option to specify which varyings should be captured
  if (varyings)
    gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);

  gl.linkProgram(program);
  gl.useProgram(program);
  return program;
};
