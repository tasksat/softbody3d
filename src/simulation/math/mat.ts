import * as vecMath from "./vec";

export function determinant(A: Float32Array): number {
  const a11 = A[0];
  const a12 = A[3];
  const a13 = A[6];

  const a21 = A[1];
  const a22 = A[4];
  const a23 = A[7];

  const a31 = A[2];
  const a32 = A[5];
  const a33 = A[8];

  return (
    a11 * a22 * a33 +
    a12 * a23 * a31 +
    a13 * a21 * a32 -
    a13 * a22 * a31 -
    a12 * a21 * a33 -
    a11 * a23 * a32
  );
}

export function setInverse(A: Float32Array, eps = 1e-12): boolean {
  const det = determinant(A);

  if (Math.abs(det) <= eps) {
    A.fill(0.0);
    return false;
  }

  const invDet = 1.0 / det;

  const a11 = A[0];
  const a12 = A[3];
  const a13 = A[6];

  const a21 = A[1];
  const a22 = A[4];
  const a23 = A[7];

  const a31 = A[2];
  const a32 = A[5];
  const a33 = A[8];

  A[0] = +(a22 * a33 - a23 * a32) * invDet;
  A[3] = -(a12 * a33 - a13 * a32) * invDet;
  A[6] = +(a12 * a23 - a13 * a22) * invDet;

  A[1] = -(a21 * a33 - a23 * a31) * invDet;
  A[4] = +(a11 * a33 - a13 * a31) * invDet;
  A[7] = -(a11 * a23 - a13 * a21) * invDet;

  A[2] = +(a21 * a32 - a22 * a31) * invDet;
  A[5] = -(a11 * a32 - a12 * a31) * invDet;
  A[8] = +(a11 * a22 - a12 * a21) * invDet;

  return true;
}

export function setMult(
  b: Float32Array,
  i: number,
  A: Float32Array,
  x: Float32Array,
  j: number,
) {
  const x0 = x[3 * j + 0];
  const x1 = x[3 * j + 1];
  const x2 = x[3 * j + 2];
  vecMath.setZero(b, i);
  vecMath.add(b, i, A, 0, x0);
  vecMath.add(b, i, A, 1, x1);
  vecMath.add(b, i, A, 2, x2);
}
