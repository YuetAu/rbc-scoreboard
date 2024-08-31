import './styles/globals.css'
import { Providers } from './providers'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Robocon 2025",
    description: "The Unoffical Scoreboard for Robocon 2025",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html>
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}