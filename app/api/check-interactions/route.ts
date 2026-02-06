'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWithFallback, hasAiProvider } from '@/lib/ai/generate-with-fallback'

interface Medication {
  dci_name?: string
  medication_name?: string
  name?: string
}

interface Interaction {
  drug1: string
  drug2: string
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated'
  description: string
  management: string
  source: 'database' | 'ai'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { medications } = body as { medications: Medication[] }

    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return NextResponse.json({ interactions: [], message: 'Need at least 2 medications to check interactions' })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Extract DCI names for lookup
    const dciNames = medications
      .map(m => m.dci_name || m.medication_name || m.name || '')
      .filter(Boolean)
      .map(n => n.toLowerCase().trim())

    // Check database for known interactions
    const { data: dbInteractions, error: dbError } = await admin
      .from('drug_interactions')
      .select('drug1_dci, drug2_dci, severity, description, description_fr, management')
      .or(
        dciNames.map(dci => `drug1_dci.ilike.%${dci}%,drug2_dci.ilike.%${dci}%`).join(',')
      )

    const foundInteractions: Interaction[] = []

    if (dbInteractions && !dbError) {
      // Filter to only interactions where BOTH drugs are in our list
      for (const interaction of dbInteractions) {
        const drug1Match = dciNames.some(d => 
          interaction.drug1_dci.toLowerCase().includes(d) || d.includes(interaction.drug1_dci.toLowerCase())
        )
        const drug2Match = dciNames.some(d => 
          interaction.drug2_dci.toLowerCase().includes(d) || d.includes(interaction.drug2_dci.toLowerCase())
        )

        if (drug1Match && drug2Match) {
          foundInteractions.push({
            drug1: interaction.drug1_dci,
            drug2: interaction.drug2_dci,
            severity: interaction.severity,
            description: interaction.description_fr || interaction.description,
            management: interaction.management,
            source: 'database'
          })
        }
      }
    }

    // If no database interactions found and AI is available, use AI for analysis
    let aiAnalysis = null
    if (foundInteractions.length === 0 && hasAiProvider() && medications.length >= 2) {
      const medList = medications
        .map(m => m.dci_name || m.medication_name || m.name)
        .filter(Boolean)
        .join(', ')

      const prompt = `You are a clinical pharmacist assistant. Check for drug-drug interactions between these medications commonly used in Algeria and Europe.

Medications: ${medList}

Use European/Algerian drug names (DCI, Doliprane, Augmentin, etc.). Do not reference USA-only brands.

Analyze potential interactions and return a JSON response:
{
  "interactions": [
    {
      "drug1": "drug name 1",
      "drug2": "drug name 2", 
      "severity": "minor|moderate|major|contraindicated",
      "description": "Brief description of the interaction",
      "management": "How to manage this interaction"
    }
  ],
  "safe_combinations": ["List of safe drug pairs"],
  "general_advice": "Any general prescribing advice"
}

If no significant interactions exist, return: {"interactions": [], "safe_combinations": [...], "general_advice": "..."}

Focus on Algerian market medications. Be concise and clinically relevant.`

      try {
        const { text, provider } = await generateWithFallback(prompt, 1500)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.interactions?.length > 0) {
            for (const int of parsed.interactions) {
              foundInteractions.push({
                ...int,
                source: 'ai'
              })
            }
          }
          aiAnalysis = {
            provider,
            safe_combinations: parsed.safe_combinations || [],
            general_advice: parsed.general_advice || ''
          }
        }
      } catch (aiError) {
        console.warn('[Interactions] AI analysis failed:', aiError)
      }
    }

    // Sort by severity
    foundInteractions.sort((a, b) => {
      const order = { contraindicated: 0, major: 1, moderate: 2, minor: 3 }
      return order[a.severity] - order[b.severity]
    })

    return NextResponse.json({
      success: true,
      interactions: foundInteractions,
      aiAnalysis,
      hasSevereInteractions: foundInteractions.some(i => 
        i.severity === 'contraindicated' || i.severity === 'major'
      )
    })

  } catch (error: any) {
    console.error('[Interactions] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check interactions' },
      { status: 500 }
    )
  }
}
