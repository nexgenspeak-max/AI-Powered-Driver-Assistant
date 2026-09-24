import { config } from '../config';
import * as google from './maps/google';
import * as goong from './maps/goong';
import type { RouteInfo, RouteProvider, DistanceMatrixResult, DistanceMatrixProvider } from './maps/types';
import type { LatLng } from '../utils/geo';

export type { RouteInfo, DistanceMatrixResult };

const providers: Record<string, RouteProvider> = { google: google.getRoute, goong: goong.getRoute };
const matrixProviders: Record<string, DistanceMatrixProvider> = {
  google: google.getDistanceMatrix,
  goong: goong.getDistanceMatrix,
};

export async function getRoute(
  pickup: string,
  dropoff: string,
  pickupCoords?: LatLng,
  dropoffCoords?: LatLng,
): Promise<Partial<RouteInfo>> {
  const provider = providers[config.mapsProvider] ?? google.getRoute;
  return provider(pickup, dropoff, config.mapsApiKey, pickupCoords, dropoffCoords);
}

export async function getDistanceMatrix(
  origins: LatLng[],
  destinations: LatLng[],
): Promise<DistanceMatrixResult | null> {
  const provider = matrixProviders[config.mapsProvider] ?? google.getDistanceMatrix;
  return provider(origins, destinations, config.mapsApiKey);
}
