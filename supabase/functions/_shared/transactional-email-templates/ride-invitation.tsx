/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface RideInvitationProps {
  name?: string
  driverName?: string | null
  pickup?: string
  dropoff?: string
  plannedAt?: string
  rideId?: string
  rideUrl?: string
  acceptUrl?: string
}

const RideInvitationEmail = ({
  name,
  driverName,
  pickup,
  dropoff,
  plannedAt,
  rideUrl,
  acceptUrl,
}: RideInvitationProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>
      {driverName
        ? `Je begeleider ${driverName} heeft een nieuwe rit aangeboden gekregen`
        : 'Nieuwe rit-uitnodiging — meld je beschikbaar binnen 10 minuten'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {driverName
            ? `Je begeleider ${driverName} heeft een rit aangeboden gekregen`
            : name ? `Hoi ${name}, een nieuwe rit voor jou` : 'Nieuwe rit-uitnodiging'}
        </Heading>
        <Text style={text}>
          {driverName
            ? <>Als planner beslis jij of <strong>{driverName}</strong> deze rit doet. Bevestig met één klik; binnen 5 minuten wordt de beste match gekozen op basis van afstand, rating en eerdere samenwerkingen.</>
            : <>Je bent uitgenodigd voor een konvooi-begeleiding. Meld je <strong>beschikbaar</strong>; binnen 5 minuten wordt de beste match gekozen op basis van afstand, rating en eerdere samenwerkingen.</>}
        </Text>

        <Section style={card}>
          {pickup && (<Text style={row}><strong>Vertrek:</strong> {pickup}</Text>)}
          {dropoff && (<Text style={row}><strong>Bestemming:</strong> {dropoff}</Text>)}
          {plannedAt && (<Text style={row}><strong>Starttijd:</strong> {plannedAt}</Text>)}
        </Section>

        <Section style={actions}>
          {acceptUrl && (
            <Link style={acceptButton} href={acceptUrl}>
              {driverName ? `✓ Bevestig — ${driverName} doet deze rit` : '✓ Ik ben beschikbaar'}
            </Link>
          )}
          {rideUrl && (
            <Link style={button} href={rideUrl}>
              Open uitnodiging
            </Link>
          )}
        </Section>
        <Text style={hint}>
          {driverName
            ? `Tip: bevestig in één klik — geen inlog nodig. Jij blijft eindverantwoordelijk voor acceptatie en facturatie.`
            : `Tip: gebruik "Ik ben beschikbaar" om in één klik te reageren — geen inlog nodig.`}
        </Text>

        <Text style={footer}>— Het {SITE_NAME}-team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RideInvitationEmail,
  subject: 'Nieuwe rit-uitnodiging — meld je beschikbaar',
  displayName: 'Rit-uitnodiging (begeleider)',
  previewData: {
    name: 'Sven',
    pickup: 'Hafenstraße 12, Duisburg',
    dropoff: 'Havenweg 8, Rotterdam',
    plannedAt: '15 januari 2026, 08:30',
    rideUrl: 'https://viacust.com',
    acceptUrl: 'https://viacust.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = {
  backgroundColor: '#f4f6f8',
  borderLeft: '3px solid #f5a800',
  padding: '16px 18px',
  margin: '0 0 24px',
}
const row = { fontSize: '14px', color: '#161f2b', margin: '0 0 8px', lineHeight: '1.5' }
const actions = { margin: '0 0 18px' }
const button = {
  display: 'block',
  backgroundColor: '#1a2a3f',
  color: '#f5f7f9',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '2px',
  padding: '12px 20px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '10px 0 0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }
const acceptButton = {
  display: 'block',
  backgroundColor: '#1f8a4c',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '2px',
  padding: '12px 20px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '0',
}
const hint = { fontSize: '12px', color: '#888', margin: '14px 0 0', lineHeight: '1.5' }
