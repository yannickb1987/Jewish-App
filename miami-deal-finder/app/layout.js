import './globals.css'

export const metadata = {
  title: 'Miami Deal Finder',
  description: 'Find off-market fix & flip opportunities in Miami — free & clear properties',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
