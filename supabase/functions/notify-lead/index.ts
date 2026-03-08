import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LeadNotification {
  storeName: string;
  email: string;
  phone?: string;
  segment?: string;
}

// Simple in-memory rate limiter (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: LeadNotification = await req.json();
    const { storeName, email, phone, segment } = body;

    // Validate required fields
    if (!storeName || !email) {
      return new Response(
        JSON.stringify({ error: 'storeName and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce length limits
    if (storeName.length > 100 || email.length > 200 ||
        (phone && phone.length > 20) || (segment && segment.length > 50)) {
      return new Response(
        JSON.stringify({ error: 'Input exceeds maximum length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit by email to prevent spam
    if (isRateLimited(email)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize control characters
    const sanitize = (str: string) => str.replace(/[\x00-\x1F\x7F]/g, '');
    const cleanStoreName = sanitize(storeName);
    const cleanEmail = sanitize(email);
    const cleanPhone = phone ? sanitize(phone) : undefined;
    const cleanSegment = segment ? sanitize(segment) : 'Hamburgueria';

    console.log('[notify-lead] Received lead notification request:', { storeName: cleanStoreName, email: cleanEmail, segment: cleanSegment });

    // Log the lead for analytics/tracking (server-side only)
    console.log('[notify-lead] SUCCESS - Lead logged:', {
      storeName: cleanStoreName,
      email: cleanEmail,
      phone: cleanPhone || 'N/A',
      segment: cleanSegment,
      timestamp: new Date().toISOString()
    });

    // Return success without exposing any internal data (no whatsappUrl)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead notification processed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[notify-lead] Error processing request:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
