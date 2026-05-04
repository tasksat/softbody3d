import * as THREE from "three";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";

export type MeshNormalizeTransform = {
  center: [number, number, number];
  scale: number;
  offset: [number, number, number];
};

export type VisualMeshData = {
  positions: Float32Array;
  indices: Uint32Array;
  transform: MeshNormalizeTransform;
};

export async function loadVisualMeshPLY(
  path: string,
  target = 1.0,
): Promise<VisualMeshData> {
  const loader = new PLYLoader();
  const geometry = await loader.loadAsync(path);
  geometry.computeVertexNormals();

  const transform = normalizeGeometry(geometry, target);

  const positionAttribute = geometry.getAttribute("position");

  if (!(positionAttribute.array instanceof Float32Array)) {
    throw new Error("expected PLY position attribute to be Float32Array.");
  }

  const positions = new Float32Array(positionAttribute.array);
  const index = geometry.getIndex();

  if (index == null) {
    const vertexCount = positionAttribute.count;

    if (vertexCount % 3 !== 0) {
      throw new Error("PLY has no index and is not a triangle mesh.");
    }

    const indices = new Uint32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      indices[i] = i;
    }

    return { positions, indices, transform };
  }

  const indexArray = index.array;
  const indices = new Uint32Array(indexArray.length);
  for (let i = 0; i < indexArray.length; i++) {
    indices[i] = indexArray[i];
  }

  return { positions, indices, transform };
}

function normalizeGeometry(
  geometry: THREE.BufferGeometry,
  target: number,
): MeshNormalizeTransform {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;

  if (box == null) {
    throw new Error("failed to compute bounding box.");
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxLen = Math.max(size.x, size.y, size.z);
  const rscale = target / maxLen;
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(rscale, rscale, rscale);

  geometry.computeBoundingBox();
  const normalizedBox = geometry.boundingBox;

  if (normalizedBox === null) {
    throw new Error("Failed to compute normalized bounding box.");
  }

  const offsetY = -normalizedBox.min.y + 0.1;
  geometry.translate(0.0, offsetY, 0.0);

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  return {
    center: [center.x, center.y, center.z],
    scale: rscale,
    offset: [0.0, offsetY, 0.0],
  };
}

export function applyNormalizeTransform(
  positions: Float32Array,
  transform: MeshNormalizeTransform,
): Float32Array {
  const out = new Float32Array(positions.length);

  const [cx, cy, cz] = transform.center;
  const [ox, oy, oz] = transform.offset;
  const s = transform.scale;

  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[3 * i + 0];
    const y = positions[3 * i + 1];
    const z = positions[3 * i + 2];

    out[3 * i + 0] = s * (x - cx) + ox;
    out[3 * i + 1] = s * (y - cy) + oy;
    out[3 * i + 2] = s * (z - cz) + oz;
  }

  return out;
}
