import './styles/globals.css'
import { Providers } from './providers'
import { Metadata, Viewport } from 'next'

const APP_NAME = "RBC 2025";
const APP_DEFAULT_TITLE = "Robocon 2025";
const APP_TITLE_TEMPLATE = "%s - Unoffical Scoreboard";
const APP_DESCRIPTION = "The Unoffical Scoreboard for Robocon 2025";

export const metadata: Metadata = {
    applicationName: APP_NAME,
    title: {
        default: APP_DEFAULT_TITLE,
        template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: APP_DEFAULT_TITLE,
        startupImage: [
            {
                url: "/logo/RandomRobot.png",
            },
        ],
    },
    formatDetection: {
        telephone: false,
    },
    metadataBase: new URL("https://robocon2025.yuetau.net"),
    openGraph: {
        type: "website",
        siteName: APP_NAME,
        title: {
            default: APP_DEFAULT_TITLE,
            template: APP_TITLE_TEMPLATE,
        },
        description: APP_DESCRIPTION,
        images: '/og/YuetAuRobocon.svg',
    },
    twitter: {
        card: "summary",
        title: {
            default: APP_DEFAULT_TITLE,
            template: APP_TITLE_TEMPLATE,
        },
        images: '/og/YuetAuRobocon.svg',
        description: APP_DESCRIPTION,
    },
    icons: {
        icon: '/logo/RandomRobot.png',
        apple: '/logo/RandomRobot.png',
    },
};

export const viewport: Viewport = {
    themeColor: "#FFFFFF",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" dir="ltr">
            <body>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}