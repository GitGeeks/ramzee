-- Initial database setup for Ramzee
-- This script runs when the PostgreSQL container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (enums)
DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'moderator', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bleat_type AS ENUM ('text', 'photo', 'poll', 'event');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ramzee TO ramzee;
