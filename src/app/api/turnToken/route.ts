export const runtime = "edge";
import { unstable_noStore as noStore } from "next/cache";

export async function GET(request: Request) {
    noStore();
    try {
        const res = await fetch(
            `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CLOUDFLARE_TURN_TOKEN}/credentials/generate`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.CLOUDFLARE_TURN_API_KEY}`,
                },
                body: JSON.stringify({ ttl: 60 * 60 }),
            },
        );
        //console.log(res);
        const data = await res.json();
        return { success: true, data };
    } catch (error) {
        console.error(error);
        return { success: false, data: null };
    }
}
