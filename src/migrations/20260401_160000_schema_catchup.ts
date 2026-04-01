import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Comprehensive schema catch-up migration.
 *
 * Multiple features were merged with migrations that were recorded
 * in payload_migrations without the SQL executing. This migration
 * idempotently adds ALL known missing columns.
 *
 * All statements use IF NOT EXISTS for safety.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. ai_config token budget columns (originally 20260327_190000 + retry)
  await db.execute(sql`
    ALTER TABLE "ai_config"
      ADD COLUMN IF NOT EXISTS "token_budgets_action_plan_max_tokens" numeric DEFAULT 2048,
      ADD COLUMN IF NOT EXISTS "token_budgets_daily_protocol_max_tokens" numeric DEFAULT 1024,
      ADD COLUMN IF NOT EXISTS "token_budgets_discover_max_tokens" numeric DEFAULT 1024;
  `)

  // 2. payload_locked_documents_rels — feedback collection FK
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "feedback_id" integer;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_feedback_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_feedback_fk"
          FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_feedback_id_idx"
      ON "payload_locked_documents_rels" USING btree ("feedback_id");
  `)

  // 3. enrollments.feedback_prompted (originally 20260401_130000)
  await db.execute(sql`
    ALTER TABLE "enrollments"
      ADD COLUMN IF NOT EXISTS "feedback_prompted" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ai_config"
      DROP COLUMN IF EXISTS "token_budgets_action_plan_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_daily_protocol_max_tokens",
      DROP COLUMN IF EXISTS "token_budgets_discover_max_tokens";

    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_feedback_fk";

    DROP INDEX IF EXISTS "payload_locked_documents_rels_feedback_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "feedback_id";

    ALTER TABLE "enrollments"
      DROP COLUMN IF EXISTS "feedback_prompted";
  `)
}
