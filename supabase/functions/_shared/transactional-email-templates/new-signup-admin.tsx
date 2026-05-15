/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ViaCust'

interface NewSignupAdminProps {
  fullName?: string
  email?: string
  phone?: string
  role?: string
  companyName?: string
  adminUrl?: string
}

const NewSignupAdminEmail = ({
  fullName,
  email,
  phone,
  role,
  companyName,
  adminUrl,
}: NewSignupAdminProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Nieuwe aanmelding op {SITE_NAME}{fullName ? `: ${fullName}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nieuwe aanmelding</Heading>
        <Text style={text}>
          Er heeft zich zojuist een nieuwe gebruiker aangemeld op {SITE_NAME}. Deze account staat in afwachting van goedkeuring.
        </Text>

        <Section style={card}>
          {fullName && <Text style={row}><strong>Naam:</strong> {fullName}</Text>}
          {email && <Text style={row}><strong>E-mail:</strong> {email}</Text>}
          {phone && <Text style={row}><strong>Telefoon:</strong> {phone}</Text>}
          {role && <Text style={row}><strong>Rol:</strong> {role}</Text>}
          {companyName && <Text style={row}><strong>Bedrijf:</strong> {companyName}</Text>}
        </Section>

        {adminUrl && (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={adminUrl} style={button}>Beheer in admin</Button>
          </Section>
        )}

        <Text style={footer}>{SITE_NAME} · Beheerdersmelding</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewSignupAdminEmail,
  subject: (d: Record<string, any>) => `Nieuwe aanmelding${d?.fullName ? `: ${d.fullName}` : ''}`,
  displayName: 'Nieuwe aanmelding (admin)',
  previewData: {
    fullName: 'Jan Janssen',
    email: 'jan@voorbeeld.nl',
    phone: '+31 6 12345678',
    role: 'begeleider',
    companyName: 'Janssen Transport',
    adminUrl: 'https://viacust.com/admin/users',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#161f2b', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#556070', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f5f7f9', padding: '16px 18px', borderRadius: '4px', margin: '0 0 20px' }
const row = { fontSize: '14px', color: '#1a2a3f', lineHeight: '1.5', margin: '0 0 6px' }
const button = { backgroundColor: '#1a2a3f', color: '#f5f7f9', fontSize: '14px', borderRadius: '2px', padding: '12px 22px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
