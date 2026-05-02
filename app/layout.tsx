import './globals.css'

export const metadata = {
  title: 'Agency OS | Run your agency from one OS',
  description: 'An operating system for agency delivery, content production, finance, and reporting.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
