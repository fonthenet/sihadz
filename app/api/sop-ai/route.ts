import { NextResponse } from 'next/server';

const SOP_SYSTEM_PROMPT = `You are an AI assistant helping to edit and improve a comprehensive SOP (Standard Operating Procedure) for a Multi-Service Health Platform in Algeria. The platform includes:
- Patient booking and wallet system
- Doctor tools (prescriptions, e-signatures, templates)
- Full pharmacy inventory management
- Laboratory integration
- Learning center for healthcare providers
- Membership and subscription plans
- Cancellation and rescheduling policies

Be helpful, specific, and practical. When suggesting content, format it ready to be added to the SOP. Use tables where appropriate. Keep content professional and healthcare-focused.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI assistant is not configured. Set ANTHROPIC_API_KEY.' },
      { status: 503 }
    );
  }

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: 'messages array is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SOP_SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : '',
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return NextResponse.json(
        { error: 'AI service error', details: errText },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content?.find((c) => c.type === 'text')?.text ??
      "I couldn't generate a response. Please try again.";

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('SOP AI route error:', error);
    return NextResponse.json(
      { error: 'Connection error. Please try again.' },
      { status: 500 }
    );
  }
}
