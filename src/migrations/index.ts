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
import * as migration_20260325_190500_verify_existing_users from './20260325_190500_verify_existing_users';
import * as migration_20260326_120000_expert_profile_fields from './20260326_120000_expert_profile_fields';
import * as migration_20260326_140000_add_onboarding_field from './20260326_140000_add_onboarding_field';
import * as migration_20260327_100000_health_profiles from './20260327_100000_health_profiles';
import * as migration_20260327_110000_action_plans from './20260327_110000_action_plans';
import * as migration_20260327_120000_daily_protocols from './20260327_120000_daily_protocols';
import * as migration_20260327_130000_certificates from './20260327_130000_certificates';
import * as migration_20260327_140000_tenant_certification from './20260327_140000_tenant_certification';
import * as migration_20260327_150000_streak_fields from './20260327_150000_streak_fields';
import * as migration_20260327_160000_certificates_tenant from './20260327_160000_certificates_tenant';
import * as migration_20260327_170000_stay_fields from './20260327_170000_stay_fields';
import * as migration_20260327_180000_locked_docs_rels_new_collections from './20260327_180000_locked_docs_rels_new_collections';
import * as migration_20260327_190000_ai_config_token_budgets from './20260327_190000_ai_config_token_budgets';

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
  {
    up: migration_20260325_190500_verify_existing_users.up,
    down: migration_20260325_190500_verify_existing_users.down,
    name: '20260325_190500_verify_existing_users',
  },
  {
    up: migration_20260326_120000_expert_profile_fields.up,
    down: migration_20260326_120000_expert_profile_fields.down,
    name: '20260326_120000_expert_profile_fields',
  },
  {
    up: migration_20260326_140000_add_onboarding_field.up,
    down: migration_20260326_140000_add_onboarding_field.down,
    name: '20260326_140000_add_onboarding_field',
  },
  {
    up: migration_20260327_100000_health_profiles.up,
    down: migration_20260327_100000_health_profiles.down,
    name: '20260327_100000_health_profiles',
  },
  {
    up: migration_20260327_110000_action_plans.up,
    down: migration_20260327_110000_action_plans.down,
    name: '20260327_110000_action_plans',
  },
  {
    up: migration_20260327_120000_daily_protocols.up,
    down: migration_20260327_120000_daily_protocols.down,
    name: '20260327_120000_daily_protocols',
  },
  {
    up: migration_20260327_130000_certificates.up,
    down: migration_20260327_130000_certificates.down,
    name: '20260327_130000_certificates',
  },
  {
    up: migration_20260327_140000_tenant_certification.up,
    down: migration_20260327_140000_tenant_certification.down,
    name: '20260327_140000_tenant_certification',
  },
  {
    up: migration_20260327_150000_streak_fields.up,
    down: migration_20260327_150000_streak_fields.down,
    name: '20260327_150000_streak_fields',
  },
  {
    up: migration_20260327_160000_certificates_tenant.up,
    down: migration_20260327_160000_certificates_tenant.down,
    name: '20260327_160000_certificates_tenant',
  },
  {
    up: migration_20260327_170000_stay_fields.up,
    down: migration_20260327_170000_stay_fields.down,
    name: '20260327_170000_stay_fields',
  },
  {
    up: migration_20260327_180000_locked_docs_rels_new_collections.up,
    down: migration_20260327_180000_locked_docs_rels_new_collections.down,
    name: '20260327_180000_locked_docs_rels_new_collections',
  },
  {
    up: migration_20260327_190000_ai_config_token_budgets.up,
    down: migration_20260327_190000_ai_config_token_budgets.down,
    name: '20260327_190000_ai_config_token_budgets',
  },
];
