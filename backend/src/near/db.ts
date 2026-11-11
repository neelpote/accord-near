import pg from "pg";
import { config } from "./config.js";
export const db = new pg.Pool({ connectionString: config.database, max: 10 });
export async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS accord_pilot_feedback(id uuid PRIMARY KEY,owner text NOT NULL,body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS accord_challenges(id text PRIMARY KEY, nonce text NOT NULL, expires_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS accord_sessions(token_hash text PRIMARY KEY, account_id text NOT NULL, expires_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS accord_services(id text PRIMARY KEY, metadata jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS accord_subscriptions(id text PRIMARY KEY, owner text NOT NULL, input jsonb NOT NULL, delegate_cipher text NOT NULL, state text NOT NULL DEFAULT 'ACTIVE', last_error text);
 CREATE TABLE IF NOT EXISTS accord_cycles(subscription_id text NOT NULL REFERENCES accord_subscriptions(id), cycle integer NOT NULL, state text NOT NULL, artifact_hash text, prepare_id text, receipt jsonb, report jsonb, error text, PRIMARY KEY(subscription_id,cycle));
 CREATE TABLE IF NOT EXISTS accord_provider_artifacts(subscription_id text NOT NULL, cycle integer NOT NULL, prepare_id text NOT NULL UNIQUE, artifact_hash text NOT NULL, report jsonb NOT NULL, PRIMARY KEY(subscription_id,cycle));
 CREATE UNIQUE INDEX IF NOT EXISTS accord_one_unresolved_cycle ON accord_cycles(subscription_id) WHERE state <> 'DELIVERED';
 ALTER TABLE accord_services ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;
 ALTER TABLE accord_provider_artifacts ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'READY';
 CREATE TABLE IF NOT EXISTS accord_groq_budget(id integer PRIMARY KEY,requests integer NOT NULL);
 INSERT INTO accord_groq_budget VALUES(1,0) ON CONFLICT DO NOTHING;
 CREATE TABLE IF NOT EXISTS accord_ai_budget(id integer PRIMARY KEY,requests integer NOT NULL);
 INSERT INTO accord_ai_budget VALUES(1,0) ON CONFLICT DO NOTHING;
 CREATE TABLE IF NOT EXISTS accord_agent_demos(kind text PRIMARY KEY,service_id text NOT NULL,subscription_id text NOT NULL,cycle integer NOT NULL,input jsonb NOT NULL,report jsonb NOT NULL,artifact_hash text NOT NULL,receipt jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());`);
}
export async function migrateProvisioning() {
  await db.query(
    `CREATE TABLE IF NOT EXISTS accord_provisioning(id text PRIMARY KEY,owner text NOT NULL,public_key text NOT NULL,delegate_cipher text NOT NULL,expires_at timestamptz NOT NULL)`,
  );
}
