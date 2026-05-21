/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { t, normalizeLocale, type Locale } from './i18n.ts'

const SITE = 'ViaCust'
const NAME = 'ride-confirmation'

interface Props {
  name?: string
  pickup?: string
  dropoff?: string
  plannedAt?: string
  reference?: string
  rideUrl?: string
  locale?: string
}

const RideConfirmationEmail = (p: Props) => {
  const l: Locale = normalizeLocale(p.locale)
  const refSuffix = p.reference ? ` (${p.reference})` : ''
  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{t(NAME, l, 'preview', { refSuffix })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {p.name ? t(NAME, l, 'greeting', { name: p.name }) : t(NAME, l, 'greetingFallback')}
          </Heading>
          <Text style={text}>{t(NAME, l, 'body')}</Text>
          <Section style={card}>
            {p.reference && <Text style={row}><strong>{t(NAME, l, 'reference')}:</strong> {p.reference}</Text>}
            {p.pickup && <Text style={row}><strong>{t(NAME, l, 'pickup')}:</strong> {p.pickup}</Text>}
            {p.dropoff && <Text style={row}><strong>{t(NAME, l, 'dropoff')}:</strong> {p.dropoff}</Text>}
            {p.plannedAt && <Text style={row}><strong>{t(NAME, l, 'plannedAt')}:</strong> {p.plannedAt}</Text>}
          </Section>
          {p.rideUrl && <Button style={button} href={p.rideUrl}>{t(NAME, l, 'cta')}</Button>}
          <Text style={footer}>
            {t(NAME, l, 'footer')}<br />
            {t(NAME, l, 'team', { site: SITE })}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RideConfirmationEmail,
  subject: (d: Record<string, any>) => {
    const l = normalizeLocale(d.locale)
    return d.reference ? t(NAME, l, 'subject', { reference: d.reference }) : t(NAME, l, 'subjectNoRef')
  },
  displayName: 'Rit-bevestiging (opdrachtgever)',
  previewData: {
    name: 'Jan de Vries',
    pickup: 'Hafenstraße 12, Duisburg',
    dropoff: 'Havenweg 8, Rotterdam',
    plannedAt: '15 januari 2026, 08:30',
    reference: 'PO-2026-118',
    rideUrl: 'https://viacust.com',
    locale: 'nl',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f4f6f8', borderLeft: '3px solid #f5a800', padding: '16px 18px', margin: '0 0 24px' }
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
