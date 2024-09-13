"use server";
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
            },
        );
        const data = await res.json();
        return data;
    } catch (error) {
        console.error(error);
        return false;
    }
}
