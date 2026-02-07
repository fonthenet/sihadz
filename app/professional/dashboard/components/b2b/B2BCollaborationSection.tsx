'use client'

import { PharmaGlobalV3 } from './pharma-global-v3'

interface B2BCollaborationSectionProps {
  professional: { id: string; business_name?: string; type?: string }
}

/**
 * B2B Collaboration Hub — renders PharmaConnect Global v3 as an app within an app.
 * Full platform: Dashboard, Regulatory, Partners, Market, Rare Disease, Portfolio,
 * Projects, Tasks, Data Hub, AI Assistant, Algeria Analyzer, Email Templates.
 * Partners page includes "B2B Hub: Discover Companies" to access real B2B company directory.
 */
export function B2BCollaborationSection({ professional }: B2BCollaborationSectionProps) {
  return <PharmaGlobalV3 professional={professional} />
}
