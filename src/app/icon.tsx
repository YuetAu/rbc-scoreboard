import { ImageResponse } from 'next/og'
import { promises as fs } from 'fs';

// Image metadata
export const size = {
    width: 32,
    height: 32,
}
export const contentType = 'image/png'

// Image generation
export default async function Icon() {

    const file = await fs.readFile(process.cwd() + '/src/app/logo/RandomRobot.png', 'base64');

    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                }}
            >
                <img src={`data:${contentType};base64,${file}`} alt="Random Robot" style={{ width: '100%', height: '100%' }} />
            </div>
        ),
        // ImageResponse options
        {
            // For convenience, we can re-use the exported icons size metadata
            // config to also set the ImageResponse's width and height.
            ...size,
        }
    )
}