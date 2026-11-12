import pg from "pg";
import { config } from "./config.js";
export const db = new pg.Pool({ connectionString: config.database, max: 10 });
export async function migrate() {
  await db.query(`CREATE TABLE IF NOT EXISTS accord_security_observations(account text PRIMARY KEY,code text NOT NULL,block_height bigint NOT NULL,body jsonb NOT NULL,changed_at timestamptz,observed_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE IF NOT EXISTS accord_security_codes(owner text NOT NULL,account text NOT NULL,code text NOT NULL,approved_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(owner,account));
  CREATE TABLE IF NOT EXISTS accord_security_reports(id uuid PRIMARY KEY,reporter text NOT NULL,account text NOT NULL,reason text NOT NULL,evidence jsonb NOT NULL,evidence_hash text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','block','dismissed')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(reporter,account,evidence_hash));
  CREATE TABLE IF NOT EXISTS accord_security_reviews(id bigserial PRIMARY KEY,report_id uuid NOT NULL REFERENCES accord_security_reports(id),reviewer text NOT NULL,status text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE IF NOT EXISTS accord_security_decisions(id uuid PRIMARY KEY,owner text NOT NULL,intent_hash text NOT NULL,evidence_hash text NOT NULL,body jsonb NOT NULL,state text NOT NULL CHECK(state IN ('allow','pending','block','approved','declined','consumed')),created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',acted_at timestamptz);
  CREATE INDEX IF NOT EXISTS accord_security_decision_lookup ON accord_security_decisions(owner,intent_hash,evidence_hash,expires_at);
  CREATE INDEX IF NOT EXISTS accord_security_report_lookup ON accord_security_reports(account,status);`);
  await db.query(`CREATE TABLE IF NOT EXISTS accord_evm_challenges(id uuid PRIMARY KEY,account_id text NOT NULL,challenge text NOT NULL,audience text NOT NULL,browser_hash text NOT NULL,expires_at timestamptz NOT NULL);
    ALTER TABLE accord_evm_challenges ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;`);
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
 CREATE TABLE IF NOT EXISTS accord_workspaces(id uuid PRIMARY KEY,owner text NOT NULL,name text NOT NULL,accounts jsonb NOT NULL,baseline jsonb,pending_baseline jsonb,baseline_version integer NOT NULL DEFAULT 0,approved_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS last_capture_at timestamptz;
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS monitoring boolean NOT NULL DEFAULT false;
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS last_success_at timestamptz;
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS last_error text;
 CREATE TABLE IF NOT EXISTS accord_workspace_events(id bigserial PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES accord_workspaces(id) ON DELETE CASCADE,type text NOT NULL,body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS last_observation jsonb;
 CREATE TABLE IF NOT EXISTS accord_incidents(id bigserial PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES accord_workspaces(id) ON DELETE CASCADE,baseline_version integer NOT NULL,fingerprint text NOT NULL,type text NOT NULL,account_id text NOT NULL,evidence jsonb NOT NULL,state text NOT NULL DEFAULT 'open',observations integer NOT NULL DEFAULT 1,occurrences integer NOT NULL DEFAULT 1,acknowledged_at timestamptz,first_seen timestamptz NOT NULL DEFAULT now(),last_seen timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,UNIQUE(workspace_id,baseline_version,fingerprint));
 CREATE TABLE IF NOT EXISTS accord_notifications(id bigserial PRIMARY KEY,workspace_id uuid NOT NULL REFERENCES accord_workspaces(id) ON DELETE CASCADE,event_id bigint NOT NULL UNIQUE REFERENCES accord_workspace_events(id) ON DELETE CASCADE,payload jsonb NOT NULL,state text NOT NULL DEFAULT 'pending',attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),last_error text,delivered_at timestamptz);
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS webhook_enabled boolean NOT NULL DEFAULT false;
 ALTER TABLE accord_notifications ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'in_app';
 CREATE TABLE IF NOT EXISTS accord_workspace_reports(workspace_id uuid NOT NULL REFERENCES accord_workspaces(id) ON DELETE CASCADE,subscription_id text NOT NULL,cycle integer NOT NULL,report jsonb NOT NULL,receipt jsonb NOT NULL,artifact_hash text NOT NULL,PRIMARY KEY(workspace_id,subscription_id,cycle));
 CREATE TABLE IF NOT EXISTS accord_incident_explanations(incident_id bigint PRIMARY KEY REFERENCES accord_incidents(id) ON DELETE CASCADE,state text NOT NULL,report jsonb);
 ALTER TABLE accord_workspaces ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
 CREATE TABLE IF NOT EXISTS accord_worker_health(name text PRIMARY KEY,last_started timestamptz,last_completed timestamptz,last_error text);
 CREATE INDEX IF NOT EXISTS accord_workspace_event_lookup ON accord_workspace_events(workspace_id,id);
 CREATE INDEX IF NOT EXISTS accord_workspace_incident_lookup ON accord_incidents(workspace_id,first_seen);
 CREATE INDEX IF NOT EXISTS accord_notification_due ON accord_notifications(state,next_attempt_at);
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
