import * as THREE from "three";
import type { VisualMeshData } from "../loaders/visloader";

export class MeshRenderer {
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshPhongMaterial;
  private readonly mesh: THREE.Mesh;
  private readonly positionAttribute: THREE.BufferAttribute;

  constructor(meshData: VisualMeshData) {
    this.geometry = new THREE.BufferGeometry();

    this.positionAttribute = new THREE.BufferAttribute(meshData.positions, 3);
    this.geometry.setAttribute("position", this.positionAttribute);

    this.geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    this.material = new THREE.MeshPhongMaterial({
      color: 0xb6ffee,
      shininess: 1000,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  getObject3D(): THREE.Object3D {
    return this.mesh;
  }

  update() {
    this.positionAttribute.needsUpdate = true;

    this.geometry.computeVertexNormals();

    const normalAttribute = this.geometry.getAttribute("normal");
    if (normalAttribute !== undefined) {
      normalAttribute.needsUpdate = true;
    }

    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
