export async function GET(request: Request) {
    return new Response(Date.now().toString());
}
