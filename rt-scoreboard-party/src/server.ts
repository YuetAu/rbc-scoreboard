import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";
import * as jose from "jose";

export default class YjsServer implements Party.Server {
  constructor(public party: Party.Room) {}
  static async onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      const algorithm = "ES256";
      console.log({ ...request.cf });
      const pubKey = await jose.importSPKI(
        lobby.env.JWT_PUBLIC_KEY as string,
        algorithm,
      );
      const { payload, protectedHeader } = await jose
        .jwtVerify(token, pubKey, {
          issuer: "RBCScoreboard",
          audience: "RBCScoreboardPartykitWS",
        });
      if (payload) {
        return request;
      }
      throw new Error("Unauthorized");
    } catch (error) {
      console.error(error);
      return new Response("Unauthorized", { status: 401 });
    }
  }
  onConnect(conn: Party.Connection) {
    return onConnect(conn, this.party, {
      // ...options
    });
  }
}
