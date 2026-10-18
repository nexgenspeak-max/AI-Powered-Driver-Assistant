// Run: npm run verify:arrival
import assert from 'node:assert/strict';
import { arrivalBlockedMessage } from './trips';
import { config } from '../config';

assert.equal(config.arrivalRadiusMeters, 200, 'default arrival radius is 200 m');
assert.equal(
  arrivalBlockedMessage('pickup', 1400, 200),
  'Bạn còn cách điểm đón khoảng 1,4 km. Khi đến gần (trong khoảng 200 m) mới xác nhận đã đến được, bạn vẫn có thể gọi khách ngay.',
);
assert.equal(
  arrivalBlockedMessage('dropoff', 356, 200),
  'Bạn còn cách điểm trả khoảng 360 m. Khi đến gần (trong khoảng 200 m) mới hoàn thành chuyến được.',
);
assert.equal(
  arrivalBlockedMessage('pickup', 8200, 200, 'picked_up'),
  'Bạn còn cách điểm đón khoảng 8,2 km. Khi đến gần (trong khoảng 200 m) mới xác nhận đã đón khách được, bạn vẫn có thể gọi khách ngay.',
);
process.stdout.write('arrival geofence selfcheck: OK (200 m default, distance in the message)\n');
