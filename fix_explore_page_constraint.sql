-- Add unique constraint on token_id for upsert operations
ALTER TABLE explore_page ADD CONSTRAINT explore_page_token_id_unique UNIQUE (token_id);
