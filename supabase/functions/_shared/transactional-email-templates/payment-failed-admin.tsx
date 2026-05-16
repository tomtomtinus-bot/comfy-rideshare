/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props {
  eventType?: string
  errorMessage?: string
  customerEmail?: string
  amount?: string
  stripeId?: string
  adminUrl?: string
}

const PaymentFailedAdminEmail = ({
  eventType, errorMessage, customerEmail, amount, stripeId, adminUrl,
}: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Stripe-betalingsfout — controle vereist</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Stripe-betalingsfout</Heading>
        <Text style={text}>
          Er is een betalingsfout gemeld door Stripe. Controleer het transactiedetail in Stripe en grijp indien nodig handmatig in.
        </Text>
        <Section style={card}>
          {eventType && <Text style={row}><strong>Event:</strong> {eventType}</Text>}
          {stripeId && <Text style={row}><strong>Stripe ID:</strong> {stripeId}</Text>}
          {customerEmail && <Text style={row}><strong>Klant:</strong> {customerEmail}</Text>}
          {amount && <Text style={row}><strong>Bedrag:</strong> {amount}</Text>}
          {errorMessage && <Text style={row}><strong>Foutmelding:</strong> {errorMessage}</Text>}
        </Section>
        {adminUrl && <Button style={button} href={adminUrl}>Open admin</Button>}
        <Text style={footer}>{SITE_NAME} · Beheerdersmelding</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedAdminEmail,
  subject: (d: Record<string, any>) =>
    d.eventType ? `Stripe-fout: ${d.eventType}` : 'Stripe-betalingsfout',
  displayName: 'Stripe-betalingsfout (admin)',
  previewData: {
    eventType: 'invoice.payment_failed',
    stripeId: 'in_1abc...',
    customerEmail: 'jan@voorbeeld.nl',
    amount: '€ 245,30',
    errorMessage: 'Card declined',
    adminUrl: 'https://viacust.com/admin/invoices',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#fff0f0', borderLeft: '3px solid #d94343', padding: '16px 18px', margin: '0 0 20px' }
const row = { fontSize: '13px', color: '#1a2a3f', lineHeight: '1.5', margin: '0 0 6px', wordBreak: 'break-all' as const }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 22px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
