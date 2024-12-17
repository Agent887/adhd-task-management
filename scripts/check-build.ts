import { buildLock } from './build-lock';

try {
  buildLock.validateCurrentPhase();
  buildLock.validateCurrentWeek();
  console.log(buildLock.getCurrentStatus());
  process.exit(0);
} catch (err: any) {
  console.error('Build Lock Error:', err.message);
  process.exit(1);
}
