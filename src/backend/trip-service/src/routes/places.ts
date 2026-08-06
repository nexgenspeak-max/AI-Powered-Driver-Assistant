import { Router, Request, Response } from 'express';
import { config } from '../config';
import * as goongPlaces from '../services/maps/goongPlaces';

const router = Router();

// Address search-as-you-type for the booking form's pickup/dropoff fields —
// proxied through the backend so the Goong API key never ships in the
// mobile app. Always Goong regardless of `config.mapsProvider` (Goong's
// Place API covers Vietnam addresses; Google Places isn't wired up here).
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const input = String(req.query.input ?? '');
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const location = typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : undefined;

    const predictions = await goongPlaces.autocomplete(input, config.mapsApiKey, location);
    return res.json({ predictions });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/detail', async (req: Request, res: Response) => {
  try {
    const placeId = String(req.query.place_id ?? '');
    const place = await goongPlaces.placeDetail(placeId, config.mapsApiKey);
    if (!place) return res.status(404).json({ detail: 'Place not found' });
    return res.json(place);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Reverse geocode — prefills the pickup field from the customer's current
// GPS position when the booking form first opens.
router.get('/reverse', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ detail: 'lat and lng are required' });

    const address = await goongPlaces.reverseGeocode(lat, lng, config.mapsApiKey);
    if (!address) return res.status(404).json({ detail: 'Could not resolve address for this location' });
    return res.json({ address });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
