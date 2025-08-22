-- Drop the incorrect trigger if it exists
DROP TRIGGER IF EXISTS update_explore_page_last_updated ON explore_page;

-- Create a custom trigger function for last_updated
CREATE OR REPLACE FUNCTION update_explore_page_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the correct trigger
CREATE TRIGGER update_explore_page_last_updated 
  BEFORE UPDATE ON explore_page 
  FOR EACH ROW 
  EXECUTE FUNCTION update_explore_page_last_updated();
