import * as THREE from "three";
import type { TetMeshData } from "../loaders/simloader";

export class TetMeshRenderer {
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private lines: THREE.LineSegments;

  private readonly edgeIds: Uint32Array;

  constructor(tetMesh: TetMeshData) {
    const edgePositions = buildEdgePositions(tetMesh);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(edgePositions, 3),
    );

    this.material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);

    this.edgeIds = new Uint32Array(tetMesh.edgeIds);
  }

  update(verts: Float32Array) {
    const positions = this.geometry.getAttribute("position");

    if (!(positions instanceof THREE.BufferAttribute)) {
      throw new Error("Expected position attribute to be BufferAttribute.");
    }

    const array = positions.array;

    if (!(array instanceof Float32Array)) {
      throw new Error("Expected wireframe position array to be Float32Array.");
    }

    writeEdgePositions(array, verts, this.edgeIds);

    positions.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  getObject3D(): THREE.Object3D {
    return this.lines;
  }

  setVisible(visible: boolean) {
    this.lines.visible = visible;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function buildEdgePositions(tetMesh: TetMeshData): Float32Array {
  const values = new Float32Array(tetMesh.edgeIds.length * 3);
  writeEdgePositions(values, tetMesh.verts, tetMesh.edgeIds);
  return values;
}

function writeEdgePositions(
  out: Float32Array,
  verts: Float32Array,
  edgeIds: Uint32Array,
) {
  let k = 0;

  for (let e = 0; e < edgeIds.length / 2; e++) {
    const i = edgeIds[2 * e + 0];
    const j = edgeIds[2 * e + 1];

    out[k++] = verts[3 * i + 0];
    out[k++] = verts[3 * i + 1];
    out[k++] = verts[3 * i + 2];

    out[k++] = verts[3 * j + 0];
    out[k++] = verts[3 * j + 1];
    out[k++] = verts[3 * j + 2];
  }
}
