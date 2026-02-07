-- ============================================================================
-- B2B COLLABORATION MODULE - SCHEMA
-- Laboratories and pharma companies: projects, meetings, actions, timeline
-- ============================================================================

-- ============================================================================
-- 1. B2B PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  owner_professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  project_deadline DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_projects_owner ON b2b_projects(owner_professional_id);
CREATE INDEX IF NOT EXISTS idx_b2b_projects_status ON b2b_projects(status);
CREATE INDEX IF NOT EXISTS idx_b2b_projects_deadline ON b2b_projects(project_deadline);

COMMENT ON TABLE b2b_projects IS 'B2B collaboration projects for labs and pharma companies';

-- ============================================================================
-- 2. B2B PROJECT MEMBERS (platform + external partners)
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('coordinator', 'member', 'partner')),
  is_coordinator BOOLEAN DEFAULT FALSE,
  external_name TEXT,
  external_email TEXT,
  external_company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One platform member per project; external members can be multiple
CREATE UNIQUE INDEX IF NOT EXISTS idx_b2b_members_project_pro ON b2b_project_members(project_id, professional_id) WHERE professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_members_project ON b2b_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_b2b_members_professional ON b2b_project_members(professional_id) WHERE professional_id IS NOT NULL;

COMMENT ON TABLE b2b_project_members IS 'Project participants: platform professionals or external partners';

-- ============================================================================
-- 3. B2B PROJECT MEETINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_project_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (meeting_type IN ('first_call', 'follow_up', 'kickoff', 'review', 'other')),
  notes TEXT,
  attendees JSONB DEFAULT '[]',
  next_steps JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_meetings_project ON b2b_project_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_b2b_meetings_date ON b2b_project_meetings(meeting_date);

COMMENT ON TABLE b2b_project_meetings IS 'Meeting notes and resumes for B2B projects';

-- ============================================================================
-- 4. B2B PROJECT ACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_project_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'small' CHECK (action_type IN ('major', 'small')),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'signature', 'payment', 'nda', 'disclosure', 'lawyer', 'authority_requirement', 'other'
  )),
  responsible_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  responsible_external TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  objectives TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_actions_project ON b2b_project_actions(project_id);
CREATE INDEX IF NOT EXISTS idx_b2b_actions_status ON b2b_project_actions(status);
CREATE INDEX IF NOT EXISTS idx_b2b_actions_deadline ON b2b_project_actions(deadline);
CREATE INDEX IF NOT EXISTS idx_b2b_actions_responsible ON b2b_project_actions(responsible_professional_id) WHERE responsible_professional_id IS NOT NULL;

COMMENT ON TABLE b2b_project_actions IS 'Actions with deadlines: signatures, payments, NDA, disclosures, etc.';

-- ============================================================================
-- 5. B2B PROJECT DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS b2b_project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES b2b_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('nda', 'contract', 'agreement', 'other')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_documents_project ON b2b_project_documents(project_id);

COMMENT ON TABLE b2b_project_documents IS 'Attachments: NDA, contracts, agreements';

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================
ALTER TABLE b2b_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_project_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_project_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_project_documents ENABLE ROW LEVEL SECURITY;

-- Projects: owner and members can access
CREATE POLICY b2b_projects_select ON b2b_projects FOR SELECT USING (
  owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR id IN (SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

CREATE POLICY b2b_projects_insert ON b2b_projects FOR INSERT WITH CHECK (
  owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id = owner_professional_id
    AND p.type IN ('laboratory', 'pharma_supplier', 'equipment_supplier', 'pharmacy')
  )
);

CREATE POLICY b2b_projects_update ON b2b_projects FOR UPDATE USING (
  owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR id IN (SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid()) AND role IN ('coordinator', 'member'))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

CREATE POLICY b2b_projects_delete ON b2b_projects FOR DELETE USING (
  owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

-- Members
CREATE POLICY b2b_members_all ON b2b_project_members FOR ALL
  USING (
    project_id IN (
      SELECT id FROM b2b_projects WHERE owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      UNION
      SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM b2b_projects WHERE owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
      UNION
      SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
  );

-- Meetings
CREATE POLICY b2b_meetings_all ON b2b_project_meetings FOR ALL USING (
  project_id IN (
    SELECT id FROM b2b_projects WHERE owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    UNION
    SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

-- Actions
CREATE POLICY b2b_actions_all ON b2b_project_actions FOR ALL USING (
  project_id IN (
    SELECT id FROM b2b_projects WHERE owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    UNION
    SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);

-- Documents
CREATE POLICY b2b_documents_all ON b2b_project_documents FOR ALL USING (
  project_id IN (
    SELECT id FROM b2b_projects WHERE owner_professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
    UNION
    SELECT project_id FROM b2b_project_members WHERE professional_id IN (SELECT id FROM professionals WHERE auth_user_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('super_admin', 'admin'))
);
