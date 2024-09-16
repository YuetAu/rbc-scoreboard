"use server";

export const runtime = "edge";
export const revalidate = false;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function getTURNToken() {
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
                body: JSON.stringify({ ttl: 86400 }),
            },
        );
        //console.log(res);
        const data = await res.json();
        return data;
    } catch (error) {
        console.error(error);
        return false;
    }
}
