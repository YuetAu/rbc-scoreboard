export const runtime = "edge";
import { unstable_noStore as noStore } from "next/cache";
import * as jose from "jose";

export async function POST(request: Request) {
    noStore();
    try {
        const body = await request.json();
        if (!body || !body.uuid) {
            throw new Error("Invalid request");
        }
        const alg = "ES256";
        const privKey = await jose.importPKCS8(
            process.env.JWT_PRIVATE_KEY ?? "",
            alg,
        );
        const token = await new jose.SignJWT(body)
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setIssuer("RBCScoreboard")
            .setAudience("RBCScoreboardPartykitWS")
            .setExpirationTime("12h")
            .sign(privKey);
        return new Response(JSON.stringify({ success: true, token }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ success: false, data: null }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}
