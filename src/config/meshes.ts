export type MeshAsset = {
  id: string;
  name: string;
  visPath: string;
  simPath: string;
  target: number;
};

function publicPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export const meshAssets: MeshAsset[] = [
  {
    id: "bunny",
    name: "Stanford Bunny",
    visPath: publicPath("mesh/bunny/bunny.ply"),
    simPath: publicPath("mesh/bunny/bunny_tet.json"),
    target: 2.0,
  },
  {
    id: "armadillo",
    name: "Stanford Armadillo",
    visPath: publicPath("mesh/armadillo/armadillo.ply"),
    simPath: publicPath("mesh/armadillo/armadillo_tet.json"),
    target: 2.0,
  },
];

export function findMeshAsset(id: string): MeshAsset {
  const asset = meshAssets.find((asset) => asset.id === id);

  if (asset === undefined) {
    throw new Error(`Unknown visual mesh asset: ${id}`);
  }

  return asset;
}

export const defaultMeshAsset = meshAssets[1];
