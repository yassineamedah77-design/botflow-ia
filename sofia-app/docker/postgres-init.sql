-- Runs once, when the PostgreSQL container initialises an empty data volume.
--
-- The application role is neither superuser nor BYPASSRLS: PostgreSQL
-- Row-Level Security therefore isolates establishments on every query the
-- app runs. Local use only — the password is public.

CREATE ROLE sofia LOGIN PASSWORD 'sofia' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- npm run dev / tests / end-to-end tests
CREATE DATABASE sofia_dev OWNER sofia;
CREATE DATABASE sofia_test OWNER sofia;
CREATE DATABASE sofia_e2e OWNER sofia;
-- production image started with `docker compose --profile app up`
CREATE DATABASE sofia OWNER sofia;
