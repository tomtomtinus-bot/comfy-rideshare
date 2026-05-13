/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface DiscountEndingProps {
  name?: string
  endsAt?: string
  fullPrice?: string
  discountedPrice?: string
}

const DiscountEndingEmail = ({
  name,
  endsAt,
  fullPrice = '€50,00',
  discountedPrice = '€25,00',
}: DiscountEndingProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Let op: vanaf {endsAt ?? 'binnenkort'} betaalt u het volledige bedrag</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Beste ${name},` : 'Beste opdrachtgever,'}
        </Heading>
        <Text style={text}>
          Bedankt dat u het afgelopen jaar gebruik heeft gemaakt van {SITE_NAME}.
          Uw eerstejaars korting van 50% loopt over een maand af.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Let op</Text>
          <Text style={cardValue}>
            Vanaf <strong>{endsAt ?? 'de einddatum van uw korting'}</strong> betaalt u het volledige bedrag van <strong>{fullPrice}</strong> per maand (excl. BTW), in plaats van {discountedPrice}.
          </Text>
        </Section>

        <Text style={text}>
          U hoeft niets te doen — het abonnement loopt gewoon door tegen het volledige tarief. Wilt u opzeggen of uw abonnement aanpassen, dan kan dat via "Beheer abonnement" in uw account.
        </Text>

        <Text style={footer}>Vragen? Mail ons op support@viacust.com.<br />Met vriendelijke groet, het {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DiscountEndingEmail,
  subject: 'Let op: uw eerstejaars korting loopt af',
  displayName: 'Korting loopt af — opdrachtgever',
  previewData: {
    name: 'Jan Jansen',
    endsAt: '15 juni 2027',
    fullPrice: '€50,00',
    discountedPrice: '€25,00',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#000000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#fdf6e8', border: '1px solid #e8d6a8', padding: '16px 18px', borderRadius: '4px', margin: '20px 0' }
const cardLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: '#8a6d2c', margin: '0 0 6px', fontWeight: 'bold' as const }
const cardValue = { fontSize: '14px', color: '#3a2e0e', lineHeight: '1.5', margin: 0 }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
