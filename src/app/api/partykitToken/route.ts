export const runtime = "edge";
import { unstable_noStore as noStore } from "next/cache";
import * as jose from "jose";

export async function GET(request: Request) {
    noStore();
    try {
        const alg = "ES256";
        const privKey = await jose.importPKCS8(
            process.env.JWT_PRIVATE_KEY ?? "",
            alg,
        );
        const token = await new jose.SignJWT({})
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setIssuer("RBCScoreboard")
            .setAudience("RBCScoreboardPartykitWS")
            .setExpirationTime("5m")
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
