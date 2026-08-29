-- ============================================================
-- {{PASCAL}} feature
-- ============================================================

-- Table
CREATE TABLE user_{{PLURAL}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_{{PLURAL}} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all" ON user_{{PLURAL}} FOR ALL USING (false);
CREATE POLICY "own_select" ON user_{{PLURAL}} FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON user_{{PLURAL}} FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON user_{{PLURAL}} FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "own_delete" ON user_{{PLURAL}} FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "admin_all" ON user_{{PLURAL}} FOR ALL USING (is_system_admin(auth.uid()));

-- List (paginated)
CREATE OR REPLACE FUNCTION list_my_{{PLURAL}}(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
  DECLARE
    result JSONB;
  BEGIN
    SELECT jsonb_build_object(
      'items', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb),
      'next_cursor', (
        SELECT MIN(created_at) FROM user_{{PLURAL}}
        WHERE user_id = auth.uid()
        AND created_at < COALESCE(p_cursor, NOW())
      )
    )
    INTO result
    FROM (
      SELECT * FROM user_{{PLURAL}}
      WHERE user_id = auth.uid()
      AND (p_cursor IS NULL OR created_at < p_cursor)
      ORDER BY created_at DESC
      LIMIT p_limit + 1
    ) t;

    IF jsonb_array_length(result->'items') > p_limit THEN
      result := jsonb_set(result, '{items}',
        result->'items' - jsonb_array_length(result->'items') - 1
      );
    END IF;

    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create
CREATE OR REPLACE FUNCTION create_{{SNAKE}}(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
  DECLARE
    v_id UUID;
  BEGIN
    INSERT INTO user_{{PLURAL}} (user_id, name, description)
    VALUES (auth.uid(), p_name, p_description)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Update
CREATE OR REPLACE FUNCTION update_{{SNAKE}}(
  p_{{SNAKE}}_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_{{PLURAL}} WHERE id = p_{{SNAKE}}_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '{{PASCAL}} not found or access denied';
  END IF;

  UPDATE user_{{PLURAL}} SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_{{SNAKE}}_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Delete
CREATE OR REPLACE FUNCTION delete_{{SNAKE}}(p_{{SNAKE}}_id UUID) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_{{PLURAL}} WHERE id = p_{{SNAKE}}_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '{{PASCAL}} not found or access denied';
  END IF;

  DELETE FROM user_{{PLURAL}} WHERE id = p_{{SNAKE}}_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grants
GRANT EXECUTE ON FUNCTION list_my_{{PLURAL}}(INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION create_{{SNAKE}}(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_{{SNAKE}}(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_{{SNAKE}}(UUID) TO authenticated;
