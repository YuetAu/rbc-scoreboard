export const runtime = "edge";
import { unstable_noStore as noStore } from "next/cache";

export async function GET(request: Request) {
    noStore();
    return new Response(Date.now().toString());
}
