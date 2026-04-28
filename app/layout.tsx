import './globals.css'

export const metadata = {
  title: 'Agency OS',
  description: 'Supabase and Vercel operating system for agency work.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
