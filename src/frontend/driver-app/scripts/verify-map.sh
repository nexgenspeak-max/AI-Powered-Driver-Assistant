#!/usr/bin/env bash
# Headless map pipeline check — no phone required.
# Reads keys from env files; never prints them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
APP="$(cd "$(dirname "$0")/.." && pwd)"
TRIP="$ROOT/src/backend/trip-service/envs/.env.local"
DRIVER_ENV="$APP/.env"
CUSTOMER_ENV="$ROOT/src/frontend/customer-app/.env"

python3 - "$DRIVER_ENV" "$TRIP" "$CUSTOMER_ENV" "$APP" <<'PY'
from pathlib import Path
import json, math, sys, urllib.request, urllib.error

def env_val(path: Path, key: str) -> str:
    if not path.exists():
        return ''
    for line in path.read_text().splitlines():
        if line.startswith(key + '='):
            return line.split('=', 1)[1].strip()
    return ''

def fetch(url: str):
    req = urllib.request.Request(url, headers={'User-Agent': 'driver-map-verify'})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode()

def tile_xy(lat, lng, z):
    n = 2 ** z
    x = int((lng + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x, y

driver_env, trip_env, customer_env, app = map(Path, sys.argv[1:])
fail = 0

def check(ok: bool, label: str, detail: str = ''):
    global fail
    if ok:
        print(f'OK  {label}' + (f'  {detail}' if detail else ''))
    else:
        print(f'FAIL  {label}' + (f'  {detail}' if detail else ''))
        fail += 1

tiles_key = env_val(driver_env, 'EXPO_PUBLIC_GOONG_MAPS_KEY')
rest_key = env_val(trip_env, 'MAPS_API_KEY')
provider = env_val(trip_env, 'MAPS_PROVIDER')
cust = env_val(customer_env, 'EXPO_PUBLIC_GOONG_MAPS_KEY')

check(bool(tiles_key), 'driver-app EXPO_PUBLIC_GOONG_MAPS_KEY')
check(provider == 'goong', 'trip-service MAPS_PROVIDER=goong', provider or '(unset)')
check(bool(rest_key), 'trip-service MAPS_API_KEY')

web = (app / 'src/features/home/components/DriverMap.web.tsx').read_text()
check('maplibregl' in web or "from 'maplibre-gl'" in web, 'DriverMap.web.tsx uses maplibre-gl (not a placeholder)')
check((app / 'app/map-preview.tsx').exists(), 'app/map-preview.tsx')

if tiles_key:
    code, body = fetch(f'https://tiles.goong.io/assets/goong_map_web.json?api_key={tiles_key}')
    check(code == 200, 'Goong style JSON', f'http {code} {len(body)} bytes')
    src_code, src_body = fetch(f'https://tiles.goong.io/sources/goong.json?api_key={tiles_key}')
    if src_code == 200:
        src = json.loads(src_body)
        tmpl = (src.get('tiles') or [None])[0]
        if tmpl:
            x, y = tile_xy(21.0278, 105.8342, 14)
            url = tmpl.replace('{z}', '14').replace('{x}', str(x)).replace('{y}', str(y))
            tcode, tbody = fetch(url)
            check(tcode == 200 and len(tbody) > 1000, 'Hanoi vector tile z14', f'http {tcode} {len(tbody)} bytes')
        else:
            check(False, 'Goong source tiles[]')
    else:
        check(False, 'Goong source JSON', f'http {src_code}')

if rest_key:
    origin, dest = '21.0285,105.8542', '21.0074,105.8431'
    dcode, dbody = fetch(
        f'https://rsapi.goong.io/Direction?origin={origin}&destination={dest}&vehicle=car&api_key={rest_key}'
    )
    if dcode == 200:
        data = json.loads(dbody)
        routes = data.get('routes') or []
        steps = (routes[0]['legs'][0].get('steps') or []) if routes else []
        check(len(routes) == 1 and len(steps) > 0, 'Goong Direction Hanoi', f'{len(steps)} steps')
    else:
        check(False, 'Goong Direction Hanoi', f'http {dcode}')

if not cust:
    print('WARN  customer-app EXPO_PUBLIC_GOONG_MAPS_KEY missing — CustomerMap tiles will be blank')

sys.exit(1 if fail else 0)
PY
