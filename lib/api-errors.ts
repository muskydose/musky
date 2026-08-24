import { NextResponse } from 'next/server';
import { logger } from './logger';

export function getRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createSuccessResponse<T extends Record<string, any>>(
  data: T,
  init?: ResponseInit,
  requestId?: string
): NextResponse {
  const reqId = requestId || getRequestId();
  const response = NextResponse.json({ success: true, ...data, requestId: reqId }, init);
  response.headers.set('x-request-id', reqId);
  return response;
}

/**
 * Sanitizes errors for public-facing customer API routes.
 * Prevents raw database, SQL, Supabase, or internal stack details from being returned.
 */
export function sanitizePublicError(
  error: any,
  fallbackMessage: string = 'Unable to process your request. Please try again.',
  status: number = 500,
  requestId?: string
): NextResponse {
  const reqId = requestId || getRequestId();
  const rawMsg = String(error?.message || '');
  logger.error('Public API Error', error, { status, requestId: reqId });

  // Check for dangerous internal leaks
  const isInternalLeak =
    rawMsg.includes('postgres') ||
    rawMsg.includes('supabase') ||
    rawMsg.includes('column') ||
    rawMsg.includes('relation') ||
    rawMsg.includes('syntax error') ||
    rawMsg.includes('violates') ||
    rawMsg.includes('foreign key') ||
    rawMsg.includes('unique constraint') ||
    rawMsg.includes('PGRST') ||
    rawMsg.includes('select') ||
    rawMsg.includes('insert') ||
    rawMsg.includes('update') ||
    rawMsg.includes('delete');

  let safeMessage = fallbackMessage;
  if (status < 500 && rawMsg && !isInternalLeak && rawMsg.length < 150) {
    safeMessage = rawMsg;
  }

  const response = NextResponse.json(
    {
      success: false,
      error: safeMessage,
      requestId: reqId,
    },
    { status }
  );
  response.headers.set('x-request-id', reqId);
  return response;
}

/**
 * Sanitizes errors for admin API routes.
 * Provides diagnostic detail without dumping entire internal stacks.
 */
export function sanitizeAdminError(
  error: any,
  fallbackMessage: string = 'An error occurred while processing the request.',
  status: number = 500,
  requestId?: string
): NextResponse {
  const reqId = requestId || getRequestId();
  const rawMsg = String(error?.message || '');
  logger.error('Admin API Error', error, { status, requestId: reqId });

  const safeMsg = rawMsg && rawMsg.length < 250 ? rawMsg : fallbackMessage;
  const response = NextResponse.json(
    {
      success: false,
      error: safeMsg,
      requestId: reqId,
    },
    { status }
  );
  response.headers.set('x-request-id', reqId);
  return response;
}

