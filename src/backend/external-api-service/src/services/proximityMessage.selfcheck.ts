// Run: npx ts-node --transpile-only src/services/proximityMessage.selfcheck.ts
import assert from 'node:assert/strict';
import { pickupApproachMessage } from './proximityService';

assert.equal(pickupApproachMessage(996, 'Đền Quán Thánh, Ba Đình, Hà Nội'), 'Tài xế còn khoảng 1 km nữa là tới Đền Quán Thánh, anh chị ra điểm đón giúp tài xế nhé.');
assert.equal(pickupApproachMessage(870, 'Hồ Gươm'), 'Tài xế còn khoảng 900 m nữa là tới Hồ Gươm, anh chị ra điểm đón giúp tài xế nhé.');
assert.equal(pickupApproachMessage(1800, ''), 'Tài xế còn khoảng 2 km nữa là tới điểm đón, anh chị ra điểm đón giúp tài xế nhé.');
assert.equal(pickupApproachMessage(30, 'A'), 'Tài xế còn khoảng 100 m nữa là tới A, anh chị ra điểm đón giúp tài xế nhé.');
console.log('proximity message selfcheck: OK');
assert.equal(pickupApproachMessage(1300, 'B'), 'Tài xế còn khoảng 1,5 km nữa là tới B, anh chị ra điểm đón giúp tài xế nhé.');
