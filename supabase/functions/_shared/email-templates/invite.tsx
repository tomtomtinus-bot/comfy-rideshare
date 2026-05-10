/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je bent uitgenodigd voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Je bent uitgenodigd</Heading>
        <Text style={text}>
          Je bent uitgenodigd om lid te worden van{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Klik op de knop hieronder om de uitnodiging te accepteren en je account aan te maken.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Uitnodiging accepteren
        </Button>
        <Text style={footer}>
          Had je deze uitnodiging niet verwacht? Dan kun je deze e-mail veilig negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter Tight', 'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#161f2b',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#556070',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1a2a3f',
  color: '#f5f7f9',
  fontSize: '14px',
  borderRadius: '2px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
