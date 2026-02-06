/**
 * POST /api/ai/triage-message
 * Categorize and prioritize incoming messages
 * For provider inbox automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { executeAI, MessageTriageOutput } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a professional
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from('professionals')
      .select('id, type')
      .eq('auth_user_id', user.id)
      .single();

    if (!prof) {
      return NextResponse.json({ error: 'Access denied. Professionals only.' }, { status: 403 });
    }

    const body = await request.json();
    const { messageContent, messageId, senderType, messageContext, language = 'fr' } = body;

    if (!messageContent || messageContent.trim().length < 3) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get sender context if messageId provided
    let patientHistory;
    if (messageId) {
      const { data: message } = await admin
        .from('chat_messages')
        .select(`
          sender_id,
          thread:chat_threads(
            metadata,
            participants:chat_thread_participants(user_id)
          )
        `)
        .eq('id', messageId)
        .single();

      if (message?.sender_id) {
        const { data: senderProfile } = await admin
          .from('profiles')
          .select('full_name, allergies, chronic_conditions')
          .eq('id', message.sender_id)
          .single();

        if (senderProfile) {
          patientHistory = {
            profile: senderProfile,
            allergies: senderProfile.allergies || [],
            conditions: senderProfile.chronic_conditions || [],
          };
        }
      }
    }

    const response = await executeAI<MessageTriageOutput>({
      skill: 'triage_message',
      input: {
        messageContent,
        senderType: senderType || 'patient',
        messageContext,
      },
      userId: user.id,
      userRole: prof.type as any,
      language,
      context: {
        providerId: prof.id,
        patientHistory,
      },
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[AI triage-message] Error:', error);
    return NextResponse.json(
      { error: 'Failed to triage message' },
      { status: 500 }
    );
  }
}
