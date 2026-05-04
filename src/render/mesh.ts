import * as THREE from "three";
import type { VisualMeshData } from "../loaders/visloader";

export class MeshRenderer {
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshPhongMaterial;
  private mesh: THREE.Mesh;
  private positionAttribute: THREE.BufferAttribute;

  constructor(meshData: VisualMeshData) {
    this.geometry = new THREE.BufferGeometry();

    this.positionAttribute = new THREE.BufferAttribute(meshData.positions, 3);
    this.geometry.setAttribute("position", this.positionAttribute);

    this.geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    this.geometry.computeVertexNormals();

    this.material = new THREE.MeshPhongMaterial({
      color: 0x00aaff,
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
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
