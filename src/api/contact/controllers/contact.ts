/**
 * contact controller
 */

import { sendContactEmail, validateContactForm } from '../services/contact';

/** Limite por IP: ventana y numero de envios permitidos dentro de ella. */
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

/**
 * Render sirve detras de un proxy, asi que la IP real llega en la cabecera
 * y no en el socket.
 */
function clientKey(ctx: any): string {
  const forwarded = ctx.request.header['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return ctx.request.ip ?? 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX_REQUESTS) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // Limpieza ocasional para que el mapa no crezca sin control.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}

export default {
  async send(ctx: any) {
    if (isRateLimited(clientKey(ctx))) {
      ctx.status = 429;
      ctx.body = { error: 'Too many messages. Please try again later.' };
      return;
    }

    const body = ctx.request.body;

    // Campo trampa: es invisible para las personas, solo lo rellenan los bots.
    // Se responde 200 a proposito, para no ensenarle al bot que fue detectado.
    if (typeof body?.website === 'string' && body.website.trim() !== '') {
      ctx.status = 200;
      ctx.body = { success: true };
      return;
    }

    const validated = validateContactForm(body);
    if (!validated.ok) {
      ctx.status = 400;
      ctx.body = { error: validated.error };
      return;
    }

    const result = await sendContactEmail(validated.data);
    if (!result.success) {
      ctx.status = 502;
      ctx.body = { error: result.error };
      return;
    }

    ctx.status = 200;
    ctx.body = { success: true };
  },
};
