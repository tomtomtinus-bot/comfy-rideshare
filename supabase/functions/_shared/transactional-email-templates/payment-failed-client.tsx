/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface Props {
  name?: string
  invoiceNumber?: string
  amount?: string
  reason?: string
}

const PaymentFailedClient = ({ name, invoiceNumber, amount, reason }: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Automatische betaling is niet gelukt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Beste ${name},` : 'Beste klant,'}</Heading>
        <Text style={text}>
          De automatische betaling van uw {SITE_NAME}-factuur is helaas niet gelukt.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Factuur</Text>
          <Text style={cardValue}>
            {invoiceNumber ? <strong>{invoiceNumber}</strong> : 'recente factuur'}
            {amount ? <> — <strong>{amount}</strong></> : null}
          </Text>
          {reason ? <Text style={{ ...cardValue, marginTop: 6, fontSize: 12 }}>Reden: {reason}</Text> : null}
        </Section>
        <Text style={text}>
          Log in op uw account en betaal de factuur handmatig, of werk uw betaalmethode bij.
          We proberen daarna opnieuw automatisch te incasseren.
        </Text>
        <Text style={footer}>Vragen? Mail ons op support@viacust.com.<br />Met vriendelijke groet, het {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedClient,
  subject: 'Betaling niet gelukt — actie vereist',
  displayName: 'Betaling mislukt — opdrachtgever',
  previewData: { name: 'Jan', invoiceNumber: 'PI-2026-0042', amount: '€ 175,00', reason: 'Onvoldoende saldo' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#fdecec', border: '1px solid #f3b4b4', padding: '16px 18px', borderRadius: '4px', margin: '20px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#8a2c2c', margin: '0 0 6px', fontWeight: 'bold' as const }
const cardValue = { fontSize: '14px', color: '#3a0e0e', lineHeight: '1.5', margin: 0 }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0', lineHeight: '1.5' }
