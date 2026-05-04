import {
  applyNormalizeTransform,
  type MeshNormalizeTransform,
} from "./visloader";

export type TetMeshData = {
  verts: Float32Array;
  tetIds: Uint32Array;
  edgeIds: Uint32Array;
};

type TetMeshFile = {
  verts: number[];
  tetIds: number[];
  edgeIds: number[];
};

export async function loadTetMeshJson(
  path: string,
  transform: MeshNormalizeTransform,
): Promise<TetMeshData> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load tet mesh: ${path}`);
  }

  const json = (await response.json()) as TetMeshFile;

  if (json.verts.length % 3 !== 0) {
    throw new Error("verts length must be divisible by 3.");
  }

  if (json.tetIds.length % 4 !== 0) {
    throw new Error("tetIds length must be divisible by 4.");
  }

  if (json.edgeIds.length % 2 !== 0) {
    throw new Error("edgeIds length must be divisible by 2.");
  }

  const rawVerts = new Float32Array(json.verts);
  const verts = applyNormalizeTransform(rawVerts, transform);

  return {
    verts,
    tetIds: new Uint32Array(json.tetIds),
    edgeIds: new Uint32Array(json.edgeIds),
  };
}
