import './styles/globals.css'
import { Providers } from './providers'
import { Metadata } from 'next'
import { headers } from "next/headers";

export const metadata: Metadata = {
    title: "Robocon 2025",
    description: "The Unoffical Scoreboard for Robocon 2025",
    keywords: ["Robocon", "2025", "Scoreboard"],
    authors: [{ name: 'YuetAu', url: 'https://yuetau.net' }, { name: 'BenChan', url: 'https://www.instagram.com/cheukyanzzz/' }],
    creator: 'YuetAu',
    publisher: 'YuetAu',
    openGraph: {
        images: '/og/YuetAuRobocon.svg',
    },
    icons: {
        icon: '/icon?<generated>',
        apple: '/apple-icon?<generated>',
    },
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