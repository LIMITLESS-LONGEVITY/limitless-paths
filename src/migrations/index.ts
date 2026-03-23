import * as migration_20260323_124701 from './20260323_124701';
import * as migration_20260323_143059 from './20260323_143059';
import * as migration_20260323_162715 from './20260323_162715';

export const migrations = [
  {
    up: migration_20260323_124701.up,
    down: migration_20260323_124701.down,
    name: '20260323_124701',
  },
  {
    up: migration_20260323_143059.up,
    down: migration_20260323_143059.down,
    name: '20260323_143059',
  },
  {
    up: migration_20260323_162715.up,
    down: migration_20260323_162715.down,
    name: '20260323_162715'
  },
];
