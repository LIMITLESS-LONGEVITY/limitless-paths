import * as migration_20260323_124701 from './20260323_124701';
import * as migration_20260323_143059 from './20260323_143059';
import * as migration_20260323_162715 from './20260323_162715';
import * as migration_20260323_170839 from './20260323_170839';
import * as migration_20260323_175345 from './20260323_175345';
import * as migration_20260324_165232 from './20260324_165232';
import * as migration_20260324_165300_vector from './20260324_165300_vector';
import * as migration_20260325_113832 from './20260325_113832';
import * as migration_20260325_170000_email_verification from './20260325_170000_email_verification';
import * as migration_20260325_185500_fix_verification_columns from './20260325_185500_fix_verification_columns';

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
    name: '20260323_175345',
  },
  {
    up: migration_20260324_165232.up,
    down: migration_20260324_165232.down,
    name: '20260324_165232',
  },
  {
    up: migration_20260324_165300_vector.up,
    down: migration_20260324_165300_vector.down,
    name: '20260324_165300_vector',
  },
  {
    up: migration_20260325_113832.up,
    down: migration_20260325_113832.down,
    name: '20260325_113832'
  },
  {
    up: migration_20260325_170000_email_verification.up,
    down: migration_20260325_170000_email_verification.down,
    name: '20260325_170000_email_verification',
  },
  {
    up: migration_20260325_185500_fix_verification_columns.up,
    down: migration_20260325_185500_fix_verification_columns.down,
    name: '20260325_185500_fix_verification_columns',
  },
];
