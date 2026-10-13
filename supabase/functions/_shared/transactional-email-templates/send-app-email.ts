// Server-only wrapper used by feature edge functions to send a registered app
// email in-process. Preserves the project's former send behavior:
// - recipient locale auto-resolved from profiles.preferred_language
// - optional From local-part override on FROM_DOMAIN (e.g. "invoice")
// - email_send_log rows: 'sent' / 'suppressed' / 'failed'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.3.1'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from './registry.ts'

const SITE_NAME = "ViaCust"
const SENDER_DOMAIN = "notify.viacust.com"
const FROM_DOMAIN = "viacust.com"

export interface SendAppEmailInput {
  templateName: string
  recipientEmail?: string
  templateData?: Record<string, any>
  idempotencyKey?: string
  fromAddress?: string
}

export type SendAppEmailResult =
  | { success: true }
  | { success: false; reason: 'email_suppressed' | 'error'; error?: string }

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

async function log(sb: any, row: Record<string, unknown>) {
  const { error } = await sb.from('email_send_log').insert(row)
  if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
}

export async function sendAppEmail(input: SendAppEmailInput): Promise<SendAppEmailResult> {
  const { templateName } = input
  const template = TEMPLATES[templateName]
  if (!template) throw new Error(`Template '${templateName}' not found`)
  const recipient = template.to || input.recipientEmail
  if (!recipient) throw new Error('recipientEmail is required')

  const sb = admin()
  let templateData: Record<string, any> = { ...(input.templateData ?? {}) }

  if (!templateData.locale) {
    try {
      const email = recipient.toLowerCase()
      const { data: users } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
      const match = users?.users?.find((u: any) => (u.email || '').toLowerCase() === email)
      if (match?.id) {
        const { data: prof } = await sb.from('profiles').select('preferred_language').eq('id', match.id).maybeSingle()
        const lang = (prof as any)?.preferred_language
        if (lang && ['nl', 'en', 'de', 'fr'].includes(lang)) templateData = { ...templateData, locale: lang }
      }
    } catch (e) {
      console.warn('Locale resolution failed', { error: String(e) })
    }
  }

  let fromLocal = 'noreply'
  if (typeof input.fromAddress === 'string') {
    const lp = input.fromAddress.includes('@') ? input.fromAddress.split('@')[0] : input.fromAddress
    if (/^[a-zA-Z0-9._-]{1,64}$/.test(lp)) fromLocal = lp
  }

  const element = React.createElement(template.component, templateData)
  const html = await renderAsync(element)
  const text = await renderAsync(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) throw new Error('LOVABLE_API_KEY is not configured')

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: `${SITE_NAME} <${fromLocal}@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: input.idempotencyKey || crypto.randomUUID(),
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await log(sb, { message_id: null, template_name: templateName, recipient_email: recipient, status: 'suppressed' })
      return { success: false, reason: 'email_suppressed' }
    }
    const msg = error instanceof Error ? error.message : String(error)
    await log(sb, { message_id: null, template_name: templateName, recipient_email: recipient, status: 'failed', error_message: msg })
    throw error
  }

  await log(sb, { message_id: null, template_name: templateName, recipient_email: recipient, status: 'sent' })
  return { success: true }
}
