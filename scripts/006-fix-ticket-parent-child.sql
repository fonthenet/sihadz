-- =============================================================================
-- FIX TICKET PARENT-CHILD SYSTEM
-- Version: 006
-- Description: Adds proper cascade logic for ticket parent-child relationships
-- =============================================================================

-- 1. Add index for parent_ticket_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_parent_id ON healthcare_tickets(parent_ticket_id);

-- 2. Create function to cascade status changes to child tickets
CREATE OR REPLACE FUNCTION cascade_ticket_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only cascade certain status changes
  IF NEW.status IN ('cancelled', 'completed', 'expired') AND OLD.status != NEW.status THEN
    -- Update all child tickets to the same status
    UPDATE healthcare_tickets
    SET 
      status = NEW.status,
      updated_at = NOW(),
      -- Set appropriate timestamp based on status
      cancelled_at = CASE WHEN NEW.status = 'cancelled' THEN NOW() ELSE cancelled_at END,
      completed_at = CASE WHEN NEW.status = 'completed' THEN NOW() ELSE completed_at END
    WHERE parent_ticket_id = NEW.id
      AND status NOT IN ('cancelled', 'completed', 'expired');
    
    -- Add timeline entries for affected child tickets
    INSERT INTO ticket_timeline (ticket_id, action, action_description, action_description_ar, actor_type, actor_name)
    SELECT 
      id,
      'status_cascaded',
      'Status updated due to parent ticket ' || NEW.ticket_number || ' being ' || NEW.status,
      'تم تحديث الحالة بسبب تحديث التذكرة الرئيسية',
      'system',
      'System'
    FROM healthcare_tickets
    WHERE parent_ticket_id = NEW.id
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for status cascade
DROP TRIGGER IF EXISTS ticket_status_cascade ON healthcare_tickets;
CREATE TRIGGER ticket_status_cascade
  AFTER UPDATE OF status ON healthcare_tickets
  FOR EACH ROW
  EXECUTE FUNCTION cascade_ticket_status();

-- 4. Create function to get all tickets in a chain (parent + children)
CREATE OR REPLACE FUNCTION get_ticket_chain(ticket_uuid UUID)
RETURNS TABLE (
  id UUID,
  ticket_number VARCHAR,
  ticket_type VARCHAR,
  status VARCHAR,
  parent_ticket_id UUID,
  depth INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ticket_tree AS (
    -- Base case: find the root ticket (may be the given ticket or its parent)
    SELECT 
      t.id,
      t.ticket_number,
      t.ticket_type,
      t.status,
      t.parent_ticket_id,
      0 as depth
    FROM healthcare_tickets t
    WHERE t.id = ticket_uuid OR t.id = (
      SELECT parent_ticket_id FROM healthcare_tickets WHERE id = ticket_uuid
    )
    
    UNION ALL
    
    -- Recursive case: find all children
    SELECT 
      t.id,
      t.ticket_number,
      t.ticket_type,
      t.status,
      t.parent_ticket_id,
      tt.depth + 1
    FROM healthcare_tickets t
    INNER JOIN ticket_tree tt ON t.parent_ticket_id = tt.id
  )
  SELECT * FROM ticket_tree ORDER BY depth, ticket_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to create a child ticket
CREATE OR REPLACE FUNCTION create_child_ticket(
  parent_id UUID,
  new_ticket_type VARCHAR,
  new_provider_id UUID DEFAULT NULL,
  new_provider_type VARCHAR DEFAULT NULL,
  new_provider_name VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_ticket_id UUID;
  parent_ticket RECORD;
  new_ticket_number VARCHAR;
BEGIN
  -- Get parent ticket data
  SELECT * INTO parent_ticket FROM healthcare_tickets WHERE id = parent_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent ticket not found';
  END IF;
  
  -- Generate new ticket number
  new_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
  
  -- Create child ticket inheriting patient info from parent
  INSERT INTO healthcare_tickets (
    ticket_number,
    ticket_type,
    status,
    patient_id,
    patient_name,
    patient_phone,
    patient_chifa_number,
    primary_provider_id,
    primary_provider_type,
    primary_provider_name,
    parent_ticket_id,
    priority,
    verification_code,
    metadata
  )
  VALUES (
    new_ticket_number,
    new_ticket_type,
    'pending',
    parent_ticket.patient_id,
    parent_ticket.patient_name,
    parent_ticket.patient_phone,
    parent_ticket.patient_chifa_number,
    COALESCE(new_provider_id, parent_ticket.primary_provider_id),
    COALESCE(new_provider_type, parent_ticket.primary_provider_type),
    COALESCE(new_provider_name, parent_ticket.primary_provider_name),
    parent_id,
    parent_ticket.priority,
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
    jsonb_build_object('parent_ticket_number', parent_ticket.ticket_number)
  )
  RETURNING id INTO new_ticket_id;
  
  -- Add timeline entry
  INSERT INTO ticket_timeline (ticket_id, action, action_description, action_description_ar, actor_type, actor_name, metadata)
  VALUES (
    new_ticket_id,
    'created_as_child',
    'Created as child of ticket ' || parent_ticket.ticket_number,
    'تم الإنشاء كتذكرة فرعية',
    'system',
    'System',
    jsonb_build_object('parent_ticket_id', parent_id, 'parent_ticket_number', parent_ticket.ticket_number)
  );
  
  -- Add entry to parent timeline
  INSERT INTO ticket_timeline (ticket_id, action, action_description, action_description_ar, actor_type, actor_name, metadata)
  VALUES (
    parent_id,
    'child_created',
    'Child ticket ' || new_ticket_number || ' created for ' || new_ticket_type,
    'تم إنشاء تذكرة فرعية',
    'system',
    'System',
    jsonb_build_object('child_ticket_id', new_ticket_id, 'child_ticket_number', new_ticket_number)
  );
  
  RETURN new_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for tickets with their children count
CREATE OR REPLACE VIEW tickets_with_children AS
SELECT 
  t.*,
  COALESCE(child_count.count, 0) as children_count,
  CASE 
    WHEN t.parent_ticket_id IS NOT NULL THEN 'child'
    WHEN COALESCE(child_count.count, 0) > 0 THEN 'parent'
    ELSE 'standalone'
  END as ticket_hierarchy
FROM healthcare_tickets t
LEFT JOIN (
  SELECT parent_ticket_id, COUNT(*) as count
  FROM healthcare_tickets
  WHERE parent_ticket_id IS NOT NULL
  GROUP BY parent_ticket_id
) child_count ON t.id = child_count.parent_ticket_id;

-- 7. Grant access to the functions
GRANT EXECUTE ON FUNCTION get_ticket_chain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_child_ticket(UUID, VARCHAR, UUID, VARCHAR, VARCHAR) TO authenticated;
