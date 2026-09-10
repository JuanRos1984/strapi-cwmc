/**
 * contact service
 *
 * Validacion del formulario y envio del correo. Vive aqui, y no en la
 * landing, porque la landing es un sitio estatico servido desde la red de
 * distribucion y no puede ejecutar codigo de servidor.
 */

import { Resend } from 'resend';

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

// El tsconfig de Strapi viene con strict en false, y sin strictNullChecks
// TypeScript no estrecha estas uniones por el discriminante. Declarar la
// propiedad contraria como opcional en cada rama las deja usables igual.
export type SendResult =
  | { success: true; error?: undefined }
  | { success: false; error: string };

export type ValidationResult =
  | { ok: true; data: ContactFormData; error?: undefined }
  | { ok: false; data?: undefined; error: string };

const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+(\.[^\s@]+)+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Evita que alguien inyecte cabeceras extra a traves del asunto o del Reply-To. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function validateContactForm(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Invalid request body' };
  }

  const raw = input as Record<string, unknown>;

  const name = typeof raw.name === 'string' ? singleLine(raw.name) : '';
  const email = typeof raw.email === 'string' ? singleLine(raw.email) : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (!name || !email || !message) {
    return { ok: false, error: 'Missing required fields' };
  }
  if (name.length > MAX_NAME) {
    return { ok: false, error: 'Name is too long' };
  }
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Invalid email address' };
  }
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: 'Message is too long' };
  }

  return { ok: true, data: { name, email, message } };
}

export async function sendContactEmail(data: ContactFormData): Promise<SendResult> {
  // El destinatario SIEMPRE sale de la configuracion del servidor. Nunca del
  // cuerpo de la peticion: si el navegador pudiera elegirlo, cualquiera podria
  // usar el dominio para enviar correo a terceros.
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !fromEmail || !toEmail) {
    strapi.log.error(
      '[contact] falta configuracion: RESEND_API_KEY, FROM_EMAIL o CONTACT_TO_EMAIL'
    );
    return { success: false, error: 'Contact form is not configured' };
  }

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br>');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Nuevo mensaje de contacto - Connecting Words MC</h2>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Nombre:</strong> ${safeName}</p>
        <p><strong>Email del remitente:</strong> ${safeEmail}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="background-color: white; padding: 15px; border-radius: 4px;">${safeMessage}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        Este mensaje fue enviado desde el formulario de contacto de Connecting Words MC.
      </p>
    </div>
  `;

  const text = [
    'Nuevo mensaje de contacto - Connecting Words MC',
    '',
    `Nombre: ${data.name}`,
    `Email del remitente: ${data.email}`,
    '',
    data.message,
  ].join('\n');

  try {
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `Nuevo mensaje de contacto de ${data.name}`.slice(0, 180),
      html,
      text,
      replyTo: data.email,
    });

    if (error) {
      strapi.log.error(`[contact] Resend rechazo el envio: ${error.message}`);
      return { success: false, error: 'Could not send the message' };
    }

    return { success: true };
  } catch (error) {
    strapi.log.error(
      `[contact] error inesperado al enviar: ${error instanceof Error ? error.message : error}`
    );
    return { success: false, error: 'Could not send the message' };
  }
}
