import { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default function Home() {
    redirect(`/dashboard`)
    return (<></>)
}

export async function generateMetadata(): Promise<Metadata> {
    const headersList = headers();
    const origin = headersList.get('host');
    console.log(origin);
    let metadata: Metadata = {
        metadataBase: new URL(`https://${origin}`),
        openGraph: {
            images: origin?.includes("ustrobocon.win") ? `/og/HKUSTRobocon.svg` : `/og/YuetAuRobocon.svg`,
        }
    };
    return metadata;
}
