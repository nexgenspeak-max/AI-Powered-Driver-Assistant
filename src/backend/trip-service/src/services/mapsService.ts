import { config } from '../config';
import * as google from './maps/google';
import * as goong from './maps/goong';
import type { RouteInfo, RouteProvider } from './maps/types';

export type { RouteInfo };

const providers: Record<string, RouteProvider> = { google: google.getRoute, goong: goong.getRoute };

export async function getRoute(pickup: string, dropoff: string): Promise<Partial<RouteInfo>> {
  const provider = providers[config.mapsProvider] ?? google.getRoute;
  return provider(pickup, dropoff, config.mapsApiKey);
}
