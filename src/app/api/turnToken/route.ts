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
        return new Response(JSON.stringify({ success: true, data }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ success: false, data: null }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}
