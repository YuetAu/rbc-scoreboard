import type * as Party from "partykit/server";
import { onConnect } from "y-partykit";
import * as jose from "jose";
import * as awarenessProtocol from "y-protocols/awareness.js";

async function verifyToken(token: string, lobby: Party.Lobby) {
  const algorithm = "ES256";
  const pubKey = await jose.importSPKI(
    lobby.env.JWT_PUBLIC_KEY as string,
    algorithm,
  );
  try {
    const { payload, protectedHeader } = await jose
      .jwtVerify(token, pubKey, {
        issuer: "RBCScoreboard",
        audience: "RBCScoreboardPartykitWS",
      });
    return payload;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function logger(body: any) {
  await fetch("https://scoreboard-collector.yuetau.workers.dev/logger", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

export default class YjsServer implements Party.Server {
  constructor(public party: Party.Room) {}

  static async onFetch(
    req: Party.Request,
    lobby: Party.FetchLobby,
    ctx: Party.ExecutionContext,
  ) {
    return new Response(req.url + req.cf?.colo, { status: 403 });
  }

  static async onBeforeConnect(
    request: Party.Request,
    lobby: Party.Lobby,
    ctx: Party.ExecutionContext,
  ) {
    try {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      const payload = await verifyToken(token, lobby);
      if (payload && payload.uuid) {
        request.headers.set("X-UUID", payload.uuid as string);
        return request;
      }
      throw new Error("Unauthorized");
    } catch (error) {
      console.error(error);
      return request;
      //return new Response("Unauthorized", { status: 401 });
    }
  }

  async onStart() {
    const newRoomID = `${this.party.id.slice(0, 7)}-${
      this.party.id.slice(7)
    }-${crypto.randomUUID()}-${Date.now()}`;
    await logger({
      "action": "START",
      "gameID": newRoomID,
    });
    await this.party.storage.put(
      "roomID",
      newRoomID,
    );
    await this.party.storage.put(
      "startTime",
      Date.now().toString(),
    );
  }

  async onConnect(
    conn: Party.Connection,
    { request }: Party.ConnectionContext,
  ) {
    console.log("onConnect", conn.id);
    const uuid = request.headers.get("X-UUID") ?? "Unknown";
    conn.setState({ uuid, startTime: Date.now() });
    await logger({
      "action": "CONNECT",
      "gameID": await this.party.storage.get("roomID"),
      "userID": uuid,
    });
    return onConnect(conn, this.party, {
      callback: {
        async handler(yDoc) {
          // access yDoc here
        },
      },
    });
  }

  async onClose(conn: Party.Connection) {
    console.log("onDisconnect", conn.id);
    const uuid = await (conn.state as any).uuid;
    await logger({
      "action": "DISCONNECT",
      "gameID": await this.party.storage.get("roomID"),
      "userID": uuid,
      "timeSpent": Date.now() -
        parseInt(await (conn.state as any).startTime ?? "0"),
    });

    if (Array.from(this.party.getConnections()).length === 0) {
      await logger({
        "action": "END",
        "gameID": await this.party.storage.get("roomID"),
        "timeSpent": Date.now() -
          parseInt(await this.party.storage.get("startTime") ?? "0"),
      });
    }
  }
}
