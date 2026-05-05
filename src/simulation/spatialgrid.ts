import * as vecMath from "./math/vec";

export class SpatialGrid {
  private readonly spacing: number;
  private readonly cells = new Map<number, number[]>();

  private readonly temp: Float32Array;

  private initialized: boolean;

  private cellMinX = 0;
  private cellMinY = 0;
  private cellMinZ = 0;
  private cellMaxX = 0;
  private cellMaxY = 0;
  private cellMaxZ = 0;

  private nx = 0;
  private ny = 0;
  private nz = 0;

  constructor(spacing: number) {
    if (spacing <= 0.0) {
      throw new Error("spatial grid spacing must be positive.");
    }
    this.spacing = spacing;
    this.temp = new Float32Array(3);
    this.initialized = false;
  }

  build(positions: Float32Array) {
    if (positions.length % 3 !== 0) {
      throw new Error("positions length must be divisible by 3.");
    }
    this.initialized = true;

    this.cells.clear();
    this.computeBoundingBox(positions);

    const numParticles = positions.length / 3;
    for (let i = 0; i < numParticles; i++) {
      const id = this.getCell(positions, i);
      let bucket = this.cells.get(id);
      if (bucket === undefined) {
        bucket = [];
        this.cells.set(id, bucket);
      }
      bucket.push(i);
    }
  }

  query(
    positions: Float32Array,
    centers: Float32Array,
    i: number,
    radius: number,
    out: number[],
  ) {
    if (!this.initialized) {
      throw new Error("query called before initialized.");
    }
    out.length = 0;
    if (radius < 0.0) {
      return;
    }
    const r2 = radius * radius;
    const cx = centers[3 * i + 0];
    const cy = centers[3 * i + 1];
    const cz = centers[3 * i + 2];

    const minXi = Math.max(this.cellCoord(cx - radius), this.cellMinX);
    const minYi = Math.max(this.cellCoord(cy - radius), this.cellMinY);
    const minZi = Math.max(this.cellCoord(cz - radius), this.cellMinZ);
    const maxXi = Math.min(this.cellCoord(cx + radius), this.cellMaxX);
    const maxYi = Math.min(this.cellCoord(cy + radius), this.cellMaxY);
    const maxZi = Math.min(this.cellCoord(cz + radius), this.cellMaxZ);
    for (let xi = minXi; xi <= maxXi; xi++) {
      for (let yi = minYi; yi <= maxYi; yi++) {
        for (let zi = minZi; zi <= maxZi; zi++) {
          const bucket = this.cells.get(this.cellID(xi, yi, zi));
          if (bucket === undefined) {
            continue;
          }
          for (const id of bucket) {
            vecMath.setDiff(this.temp, 0, positions, id, centers, i);
            if (vecMath.lengthSquared(this.temp, 0) <= r2) {
              out.push(id);
            }
          }
        }
      }
    }
  }

  private computeBoundingBox(positions: Float32Array) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    const numParticles = positions.length / 3;
    for (let i = 0; i < numParticles; i++) {
      const x = positions[3 * i + 0];
      const y = positions[3 * i + 1];
      const z = positions[3 * i + 2];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    this.cellMinX = this.cellCoord(minX);
    this.cellMinY = this.cellCoord(minY);
    this.cellMinZ = this.cellCoord(minZ);
    this.cellMaxX = this.cellCoord(maxX);
    this.cellMaxY = this.cellCoord(maxY);
    this.cellMaxZ = this.cellCoord(maxZ);

    this.nx = this.cellMaxX - this.cellMinX + 1;
    this.ny = this.cellMaxY - this.cellMinY + 1;
    this.nz = this.cellMaxZ - this.cellMinZ + 1;

    if (this.nx == 0 || this.ny == 0 || this.nz == 0) {
      throw new Error("invalid spatial grid bounds.");
    }
  }

  private cellCoord(val: number): number {
    return Math.floor(val / this.spacing);
  }

  private cellID(xi: number, yi: number, zi: number): number {
    const sxi = xi - this.cellMinX;
    const syi = yi - this.cellMinY;
    const szi = zi - this.cellMinZ;
    return this.nx * this.ny * szi + this.nx * syi + sxi;
  }

  private getCell(positions: Float32Array, i: number) {
    return this.cellID(
      this.cellCoord(positions[3 * i + 0]),
      this.cellCoord(positions[3 * i + 1]),
      this.cellCoord(positions[3 * i + 2]),
    );
  }
}
