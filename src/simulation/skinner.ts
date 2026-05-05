import { SpatialGrid } from "./spatialgrid";
import * as matMath from "./math/mat";
import * as vecMath from "./math/vec";

export class VisualSkinner {
  private readonly tetIds: Uint32Array;

  private readonly tetCenter: Float32Array;

  private readonly numTets: number;
  private readonly numVisVerts: number;

  private readonly minDist: Float32Array;

  private readonly skinningGrid: SpatialGrid;
  private readonly cands: number[] = [];

  private skinningInfo: Float32Array;

  private readonly mat = new Float32Array(3 * 3);
  private readonly bary = new Float32Array(4);

  constructor(
    visRestPos: Float32Array,
    simRestPos: Float32Array,
    tetIds: Uint32Array,
  ) {
    if (visRestPos.length % 3 !== 0) {
      throw new Error("visRestPos must be divisible by 3.");
    }
    if (simRestPos.length % 3 !== 0) {
      throw new Error("simRestPos must be divisible by 3.");
    }
    if (tetIds.length % 4 !== 0) {
      throw new Error("tetIds length must be divisible by 4.");
    }

    this.tetIds = new Uint32Array(tetIds);

    this.tetCenter = new Float32Array(3);

    this.numTets = tetIds.length / 4;
    this.numVisVerts = visRestPos.length / 3;

    this.skinningGrid = new SpatialGrid(0.05);
    this.skinningGrid.build(visRestPos);

    this.minDist = new Float32Array(this.numVisVerts);
    this.minDist.fill(Number.POSITIVE_INFINITY);

    this.skinningInfo = new Float32Array(4 * this.numVisVerts);
    this.skinningInfo.fill(-1.0);
    this.computeSkinningInfo(visRestPos, simRestPos);
  }

  update(visPos: Float32Array, simPos: Float32Array) {
    if (visPos.length !== 3 * this.numVisVerts) {
      throw new Error("visPos vs visRestPos length mismatch.");
    }
    for (let i = 0; i < this.numVisVerts; i++) {
      const t = this.skinningInfo[4 * i + 0] | 0;
      if (t < 0) {
        continue;
      }
      const b0 = this.skinningInfo[4 * i + 1];
      const b1 = this.skinningInfo[4 * i + 2];
      const b2 = this.skinningInfo[4 * i + 3];
      const b3 = 1.0 - b0 - b1 - b2;
      const id0 = this.tetIds[4 * t + 0];
      const id1 = this.tetIds[4 * t + 1];
      const id2 = this.tetIds[4 * t + 2];
      const id3 = this.tetIds[4 * t + 3];
      vecMath.setZero(visPos, i);
      vecMath.add(visPos, i, simPos, id0, b0);
      vecMath.add(visPos, i, simPos, id1, b1);
      vecMath.add(visPos, i, simPos, id2, b2);
      vecMath.add(visPos, i, simPos, id3, b3);
    }
  }

  private computeSkinningInfo(
    visRestPos: Float32Array,
    simRestPos: Float32Array,
  ) {
    for (let i = 0; i < this.numTets; i++) {
      const maxR = this.getTetBoundingSphere(simRestPos, i, this.tetCenter);
      this.skinningGrid.query(visRestPos, this.tetCenter, 0, maxR, this.cands);
      if (this.cands.length == 0) {
        continue;
      }
      const id0 = this.tetIds[4 * i + 0];
      const id1 = this.tetIds[4 * i + 1];
      const id2 = this.tetIds[4 * i + 2];
      const id3 = this.tetIds[4 * i + 3];
      vecMath.setDiff(this.mat, 0, simRestPos, id0, simRestPos, id3);
      vecMath.setDiff(this.mat, 1, simRestPos, id1, simRestPos, id3);
      vecMath.setDiff(this.mat, 2, simRestPos, id2, simRestPos, id3);
      matMath.setInverse(this.mat);

      for (const vid of this.cands) {
        vecMath.setDiff(this.bary, 0, visRestPos, vid, simRestPos, id3);
        matMath.setMult(this.bary, 0, this.mat, this.bary, 0);
        this.bary[3] = 1.0 - this.bary[0] - this.bary[1] - this.bary[2];
        const dist = Math.max(
          0.0,
          -this.bary[0],
          -this.bary[1],
          -this.bary[2],
          -this.bary[3],
        );
        if (dist < this.minDist[vid]) {
          this.minDist[vid] = dist;
          this.skinningInfo[4 * vid + 0] = i;
          this.skinningInfo[4 * vid + 1] = this.bary[0];
          this.skinningInfo[4 * vid + 2] = this.bary[1];
          this.skinningInfo[4 * vid + 3] = this.bary[2];
        }
      }
    }
  }

  private getTetBoundingSphere(
    simRestPos: Float32Array,
    t: number,
    tetCenter: Float32Array,
  ): number {
    tetCenter.fill(0.0);
    for (let i = 0; i < 4; i++) {
      const id = this.tetIds[4 * t + i];
      vecMath.add(tetCenter, 0, simRestPos, id, 0.25);
    }
    let maxR = 0.0;
    for (let i = 0; i < 4; i++) {
      const id = this.tetIds[4 * t + i];
      maxR = Math.max(
        maxR,
        Math.sqrt(vecMath.distSquared(simRestPos, id, tetCenter, 0)),
      );
    }
    maxR += 0.05;
    return maxR;
  }
}
