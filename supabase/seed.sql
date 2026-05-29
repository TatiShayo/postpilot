-- PostPilot Demo Seed Data
-- Run this after applying schema.sql

-- Insert sample posts for demo user (replace USER_ID with actual auth user UUID)
-- INSERT INTO posts (user_id, content, media_urls, platforms, status, scheduled_at, ai_generated) VALUES ...

-- Sample social accounts
-- INSERT INTO social_accounts (user_id, platform, username, display_name, is_connected, followers_count) VALUES ...

-- Post analytics seeding function (PostgreSQL)
CREATE OR REPLACE FUNCTION seed_post_analytics(post_id UUID) RETURNS VOID AS $$
DECLARE
  platforms TEXT[] := ARRAY['twitter', 'linkedin', 'instagram', 'facebook', 'tiktok'];
  platform TEXT;
BEGIN
  FOREACH platform IN ARRAY platforms
  LOOP
    INSERT INTO post_analytics (post_id, platform, likes, comments, shares, impressions, clicks)
    VALUES (
      post_id,
      platform,
      floor(random() * 500 + 10)::int,
      floor(random() * 100 + 2)::int,
      floor(random() * 50 + 1)::int,
      floor(random() * 10000 + 200)::int,
      floor(random() * 500 + 20)::int
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
