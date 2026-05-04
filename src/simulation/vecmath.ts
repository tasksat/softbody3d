export function setZero(a: Float32Array, i: number) {
  a[3 * i + 0] = 0.0;
  a[3 * i + 1] = 0.0;
  a[3 * i + 2] = 0.0;
}

export function scale(a: Float32Array, i: number, rscale: number) {
  a[3 * i + 0] *= rscale;
  a[3 * i + 1] *= rscale;
  a[3 * i + 2] *= rscale;
}

export function copy(a: Float32Array, i: number, b: Float32Array, j: number) {
  a[3 * i + 0] = b[3 * j + 0];
  a[3 * i + 1] = b[3 * j + 1];
  a[3 * i + 2] = b[3 * j + 2];
}

export function add(
  a: Float32Array,
  i: number,
  b: Float32Array,
  j: number,
  rscale = 1.0,
) {
  a[3 * i + 0] += b[3 * j + 0] * rscale;
  a[3 * i + 1] += b[3 * j + 1] * rscale;
  a[3 * i + 2] += b[3 * j + 2] * rscale;
}

export function setDiff(
  dst: Float32Array,
  i: number,
  a: Float32Array,
  j: number,
  b: Float32Array,
  k: number,
  rscale = 1.0,
) {
  dst[3 * i + 0] = (a[3 * j + 0] - b[3 * k + 0]) * rscale;
  dst[3 * i + 1] = (a[3 * j + 1] - b[3 * k + 1]) * rscale;
  dst[3 * i + 2] = (a[3 * j + 2] - b[3 * k + 2]) * rscale;
}

export function lengthSquared(a: Float32Array, i: number): number {
  const x = a[3 * i + 0];
  const y = a[3 * i + 1];
  const z = a[3 * i + 2];
  return x * x + y * y + z * z;
}

export function distSquared(
  a: Float32Array,
  i: number,
  b: Float32Array,
  j: number,
): number {
  const x = a[3 * i + 0] - b[3 * j + 0];
  const y = a[3 * i + 1] - b[3 * j + 1];
  const z = a[3 * i + 2] - b[3 * j + 2];
  return x * x + y * y + z * z;
}

export function dot(
  a: Float32Array,
  i: number,
  b: Float32Array,
  j: number,
): number {
  return (
    a[3 * i + 0] * b[3 * j + 0] +
    a[3 * i + 1] * b[3 * j + 1] +
    a[3 * i + 2] * b[3 * j + 2]
  );
}

export function setCross(
  dst: Float32Array,
  i: number,
  a: Float32Array,
  j: number,
  b: Float32Array,
  k: number,
) {
  const ax = a[3 * j + 0];
  const ay = a[3 * j + 1];
  const az = a[3 * j + 2];
  const bx = b[3 * k + 0];
  const by = b[3 * k + 1];
  const bz = b[3 * k + 2];
  dst[3 * i + 0] = ay * bz - az * by;
  dst[3 * i + 1] = az * bx - ax * bz;
  dst[3 * i + 2] = ax * by - ay * bx;
}
