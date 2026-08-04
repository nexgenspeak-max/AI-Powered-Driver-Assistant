import { config } from '../config';
import * as google from './maps/google';
import * as goong from './maps/goong';
import type { RouteInfo, RouteProvider } from './maps/types';
import type { LatLng } from '../utils/geo';

export type { RouteInfo };

const providers: Record<string, RouteProvider> = { google: google.getRoute, goong: goong.getRoute };

export async function getRoute(
  pickup: string,
  dropoff: string,
  pickupCoords?: LatLng,
  dropoffCoords?: LatLng,
): Promise<Partial<RouteInfo>> {
  const provider = providers[config.mapsProvider] ?? google.getRoute;
  return provider(pickup, dropoff, config.mapsApiKey, pickupCoords, dropoffCoords);
}
