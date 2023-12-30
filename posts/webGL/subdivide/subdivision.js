/** 
 * Subdivides a triangle mesh using the Loop subdivision scheme.
 * @param {Array} vertices floating-point vertex coordinates (stride = 3).
 * @param {Array} triangles integers to look up each vertex referenced by a triangle (stride = 3).
 * @returns {Object} mesh with modified vertices and triangles after the subdivision.
 */
const loopSubdivision = function(vertices, triangles) {
  const nTriangles = triangles.length / 3;
  const nVertices = vertices.length / 3;

  let edgeMap = {};
  let edgeIndices = new Array(3);
  let nEdges = 0;

  let newTriangles = new Array();

  let v2v = new Array(nVertices);
  for (let i = 0; i < nVertices; i++) v2v[i] = [];

  for (let i = 0; i < nTriangles; i++) {
    // loop through every edge j of triangle i
    for (let j = 0; j < 3; j++) {
      let p = triangles[3 * i + j];
      let q = triangles[3 * i + ((j + 1) % 3)];
      let o = triangles[3 * i + ((j + 2) % 3)];
      let edge = [Math.min(p, q), Math.max(p, q)]; // edge with sorted vertex indices
      let key = JSON.stringify(edge);

      if (key in edgeMap) {
        edgeIndices[j] = edgeMap[key];
      } else {
        edgeMap[key] = nEdges;
        edgeIndices[j] = nEdges;

        let xp = vertices.slice(3 * p, 3 * p + 3);
        let xq = vertices.slice(3 * q, 3 * q + 3);
        let xe = [
          (3/8) * (xp[0] + xq[0]),
          (3/8) * (xp[1] + xq[1]),
          (3/8) * (xp[2] + xq[2])
        ];


        vertices.push(xe[0], xe[1], xe[2]);

        nEdges++;
      }

      let newEdge = edgeIndices[j] + nVertices;

      let xo = vertices.slice(3 * o, 3 * o + 3);
      for (let d = 0; d < 3; d++) {
        vertices[3 * newEdge + d] += (1/8) * xo[d];
      }

      v2v[p].push(q);
    }

    
    const t0 = triangles[3 * i];
    const t1 = triangles[3 * i + 1];
    const t2 = triangles[3 * i + 2];

    const e0 = edgeIndices[0] + nVertices;
    const e1 = edgeIndices[1] + nVertices;
    const e2 = edgeIndices[2] + nVertices;

    newTriangles.push(t0, e0, e2);
    newTriangles.push(e0, t1, e1);
    newTriangles.push(e2, e1, t2);
    newTriangles.push(e0, e1, e2);

    }   

  const oldVertices = vertices.slice();

  for (let s = 0; s < nVertices; s++) {
    const oldVertex = oldVertices.slice(3 * s, 3 * s + 3);
    let updatedVertex = [0, 0, 0];
    const k = v2v[s].length;
    let beta; 

    if (k === 3) {
      beta = 0.1875;
    } else {
      beta = 0.375 / k;
    }

    for (let r of v2v[s]) {
      let neighbor = oldVertices.slice(3 * r, 3 * r + 3);
      for (let j = 0; j < 3; j++){
        updatedVertex[j] += beta * neighbor[j];
      }
    }

    for (let d = 0; d < 3; d++) {
      updatedVertex[d] = (1 - k * beta) * oldVertex[d] + updatedVertex[d];
      vertices[3 * s + d] = updatedVertex[d];
    }
  }
  // console.log(nVertices); // see the number of vertices after subdivision
  return {
    vertices: vertices,
    triangles: newTriangles,
  }
  
};