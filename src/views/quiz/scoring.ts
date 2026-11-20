export const NAME_POINTS = 500;
export const LOCATION_POINTS = 500;
export const POINTS_PER_QUESTION = NAME_POINTS + LOCATION_POINTS;
const DISTANCE_SCALE_KM = 1000;
const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Answer {
  nameCorrect: boolean;
  guess: LatLng;
  km: number;
  points: number;
}

export function score(nameCorrect: boolean, guess: LatLng, actual: LatLng): Answer {
  const km = distanceKm(guess, actual);
  return { nameCorrect, guess, km, points: (nameCorrect ? NAME_POINTS : 0) + locationPoints(km) };
}

export function pointsBreakdown(answer: Answer): { name: number; location: number } {
  const name = answer.nameCorrect ? NAME_POINTS : 0;
  return { name, location: answer.points - name };
}

export function locationPoints(km: number): number {
  return Math.round(LOCATION_POINTS * Math.exp(-km / DISTANCE_SCALE_KM));
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function timeUntil(from: Date, to: Date): { hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
}
