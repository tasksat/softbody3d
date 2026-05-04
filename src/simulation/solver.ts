import type { TetMeshData } from "../loaders/simloader";
import * as vecMath from "./vecmath";

export type SolverParams = {
  dt: number;
  iterations: number;
  substeps: number;
  gravity: Float32Array;
  damping: number;
  volCompliance: number;
  edgeCompliance: number;
};

export class SoftBodySolver {
  readonly positions: Float32Array;

  private readonly velocities: Float32Array;
  private readonly prevPos: Float32Array;
  private readonly restPos: Float32Array;

  private readonly tetIds: Uint32Array;
  private readonly edgeIds: Uint32Array;

  private readonly numParticles: number;
  private readonly numTets: number;
  private readonly numEdges: number;

  private readonly invMass: Float32Array;
  private readonly restVolumes: Float32Array;
  private readonly restLengths: Float32Array;

  private readonly params: SolverParams;

  private readonly temp: Float32Array;
  private readonly grad: Float32Array;

  private readonly tetFaces = [
    [1, 3, 2],
    [0, 2, 3],
    [0, 3, 1],
    [0, 1, 2],
  ];

  constructor(tetMesh: TetMeshData, params: SolverParams) {
    this.positions = new Float32Array(tetMesh.verts);

    this.velocities = new Float32Array(tetMesh.verts.length);
    this.restPos = new Float32Array(tetMesh.verts);
    this.prevPos = new Float32Array(tetMesh.verts);

    this.tetIds = new Uint32Array(tetMesh.tetIds);
    this.edgeIds = new Uint32Array(tetMesh.edgeIds);

    this.numParticles = tetMesh.verts.length / 3;
    this.numTets = tetMesh.tetIds.length / 4;
    this.numEdges = tetMesh.edgeIds.length / 2;

    this.invMass = new Float32Array(this.numParticles);
    this.restVolumes = new Float32Array(this.numTets);
    this.restLengths = new Float32Array(this.numEdges);

    this.params = { ...params };

    this.temp = new Float32Array(3 * 4);
    this.grad = new Float32Array(3 * 4);

    this.initialize();
  }

  simulate() {
    const dt = this.params.dt;
    if (dt <= 0.0) {
      return;
    }
    const substeps = Math.max(1, this.params.substeps);
    const iterations = Math.max(1, this.params.iterations);
    const subdt = dt / substeps;
    for (let s = 0; s < substeps; s++) {
      this.preSolve(subdt);
      for (let i = 0; i < iterations; i++) {
        this.solve(subdt);
      }
      this.postSolve(subdt);
    }
  }

  reset() {
    this.temp.fill(0.0);
    this.grad.fill(0.0);
    this.positions.set(this.restPos);
    this.velocities.fill(0.0);
    this.prevPos.set(this.restPos);
  }

  private preSolve(dt: number) {
    const gravity = this.params.gravity;
    const damping = Math.max(0.0, Math.min(1.0, this.params.damping));
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] <= 0.0) continue;
      vecMath.add(this.velocities, i, gravity, 0, dt);
      vecMath.scale(this.velocities, i, 1.0 - damping);
      vecMath.copy(this.prevPos, i, this.positions, i);
      vecMath.add(this.positions, i, this.velocities, i, dt);
      const y = this.positions[3 * i + 1];
      if (y < 0.0) {
        vecMath.copy(this.positions, i, this.prevPos, i);
        this.positions[3 * i + 1] = 0.0;
      }
    }
  }

  private solve(dt: number) {
    this.solveEdgeConstraint(dt);
    this.solveVolumeConstraint(dt);
  }

  private postSolve(dt: number) {
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] <= 0.0) continue;
      vecMath.setDiff(
        this.velocities,
        i,
        this.positions,
        i,
        this.prevPos,
        i,
        1.0 / dt,
      );
    }
  }

  private solveEdgeConstraint(dt: number) {
    const compliance = this.params.edgeCompliance;
    const alpha = compliance / (dt * dt);
    for (let i = 0; i < this.numEdges; i++) {
      const id0 = this.edgeIds[2 * i + 0];
      const id1 = this.edgeIds[2 * i + 1];
      const w0 = this.invMass[id0];
      const w1 = this.invMass[id1];
      const w = w0 + w1;
      if (w <= 0.0) continue;
      vecMath.setDiff(this.grad, 0, this.positions, id1, this.positions, id0);
      const len = Math.sqrt(vecMath.lengthSquared(this.grad, 0));
      if (len <= 0.0) continue;
      vecMath.scale(this.grad, 0, 1.0 / len);
      const restLen = this.restLengths[i];
      const C = len - restLen;
      const lambda = -C / (w + alpha);
      vecMath.add(this.positions, id0, this.grad, 0, -lambda * w0);
      vecMath.add(this.positions, id1, this.grad, 0, +lambda * w1);
    }
  }

  private solveVolumeConstraint(dt: number) {
    const compliance = this.params.volCompliance;
    const alpha = compliance / (dt * dt);
    for (let i = 0; i < this.numTets; i++) {
      let w = 0.0;
      for (let j = 0; j < 4; j++) {
        const id0 = this.tetIds[4 * i + this.tetFaces[j][0]];
        const id1 = this.tetIds[4 * i + this.tetFaces[j][1]];
        const id2 = this.tetIds[4 * i + this.tetFaces[j][2]];
        vecMath.setDiff(this.temp, 0, this.positions, id1, this.positions, id0);
        vecMath.setDiff(this.temp, 1, this.positions, id2, this.positions, id0);
        vecMath.setCross(this.grad, j, this.temp, 0, this.temp, 1);
        vecMath.scale(this.grad, j, 1.0 / 6.0);
        w +=
          this.invMass[this.tetIds[4 * i + j]] *
          vecMath.lengthSquared(this.grad, j);
      }
      if (w <= 0.0) continue;
      const vol = this.getTetVolume(i);
      const restVol = this.restVolumes[i];
      const C = vol - restVol;
      const lambda = -C / (w + alpha);
      for (let j = 0; j < 4; j++) {
        const idj = this.tetIds[4 * i + j];
        vecMath.add(
          this.positions,
          idj,
          this.grad,
          j,
          lambda * this.invMass[idj],
        );
      }
    }
  }

  private initialize() {
    this.invMass.fill(0.0);
    this.restVolumes.fill(0.0);
    for (let i = 0; i < this.numTets; i++) {
      const vol = this.getTetVolume(i);
      this.restVolumes[i] = vol;
      const pMass = vol > 0.0 ? vol / 4.0 : 0.0;
      this.invMass[this.tetIds[4 * i + 0]] += pMass;
      this.invMass[this.tetIds[4 * i + 1]] += pMass;
      this.invMass[this.tetIds[4 * i + 2]] += pMass;
      this.invMass[this.tetIds[4 * i + 3]] += pMass;
    }
    for (let i = 0; i < this.numParticles; i++) {
      if (this.invMass[i] <= 0.0) continue;
      this.invMass[i] = 1.0 / this.invMass[i];
    }
    for (let i = 0; i < this.numEdges; i++) {
      const id0 = this.edgeIds[2 * i + 0];
      const id1 = this.edgeIds[2 * i + 1];
      this.restLengths[i] = Math.sqrt(
        vecMath.distSquared(this.positions, id0, this.positions, id1),
      );
    }
  }

  private getTetVolume(t: number): number {
    const id0 = this.tetIds[4 * t + 0];
    const id1 = this.tetIds[4 * t + 1];
    const id2 = this.tetIds[4 * t + 2];
    const id3 = this.tetIds[4 * t + 3];
    vecMath.setDiff(this.temp, 0, this.positions, id1, this.positions, id0);
    vecMath.setDiff(this.temp, 1, this.positions, id2, this.positions, id0);
    vecMath.setDiff(this.temp, 2, this.positions, id3, this.positions, id0);
    vecMath.setCross(this.temp, 3, this.temp, 0, this.temp, 1);
    return vecMath.dot(this.temp, 2, this.temp, 3) / 6.0;
  }
}
