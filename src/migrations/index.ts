import * as migration_20260323_124701 from './20260323_124701';
import * as migration_20260323_143059 from './20260323_143059';
import * as migration_20260323_162715 from './20260323_162715';
import * as migration_20260323_170839 from './20260323_170839';
import * as migration_20260323_175345 from './20260323_175345';

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
    name: '20260323_162715',
  },
  {
    up: migration_20260323_170839.up,
    down: migration_20260323_170839.down,
    name: '20260323_170839',
  },
  {
    up: migration_20260323_175345.up,
    down: migration_20260323_175345.down,
    name: '20260323_175345'
  },
];
