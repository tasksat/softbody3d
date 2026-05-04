import * as THREE from "three";
import type { TetMeshData } from "../loaders/simloader";

export class TetMeshRenderer {
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private lines: THREE.LineSegments;

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
  const { verts, edgeIds } = tetMesh;

  const values = new Float32Array((edgeIds.length / 2) * 2 * 3);

  let out = 0;

  for (let e = 0; e < edgeIds.length / 2; e++) {
    const i = edgeIds[2 * e + 0];
    const j = edgeIds[2 * e + 1];

    values[out++] = verts[3 * i + 0];
    values[out++] = verts[3 * i + 1];
    values[out++] = verts[3 * i + 2];

    values[out++] = verts[3 * j + 0];
    values[out++] = verts[3 * j + 1];
    values[out++] = verts[3 * j + 2];
  }

  return values;
}
