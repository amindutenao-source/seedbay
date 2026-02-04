export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
