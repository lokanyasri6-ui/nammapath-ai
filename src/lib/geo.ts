/** Great-circle distance in metres. */
export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function polylineLengthM(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

/** Distance (m) from point p to segment ab, using a local equirectangular projection (fine at street scale). */
export function pointToSegmentM(p: [number, number], a: [number, number], b: [number, number]): number {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const P = [p[1] * k, p[0]];
  const A = [a[1] * k, a[0]];
  const B = [b[1] * k, b[0]];
  const ABx = B[0] - A[0];
  const ABy = B[1] - A[1];
  const len2 = ABx * ABx + ABy * ABy;
  let t = len2 === 0 ? 0 : ((P[0] - A[0]) * ABx + (P[1] - A[1]) * ABy) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj: [number, number] = [A[1] + t * ABy, (A[0] + t * ABx) / k];
  return haversineM(p, proj);
}
