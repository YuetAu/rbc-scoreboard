import { get } from "http";
import YPartyKitProvider from "y-partykit/provider";
import * as awarenessProtocol from 'y-protocols/awareness.js'
import { WebrtcProvider } from "y-webrtc";
import * as Y from 'yjs';

const getTURNToken = async () => {
    try {
        const res = await fetch("/api/turnToken");
        const data = await res.json();
        if (data.success) {
            return data.data;
        }
        return false
    } catch (error) {
        console.error(error);
        return false;
    }
}
export class YJsClient {
    gameID: string;
    ydoc: Y.Doc;
    awareness: awarenessProtocol.Awareness;
    yPartyProvider: YPartyKitProvider;
    webrtcProvider: any;

    constructor(gameID: string, turnServer?: any) {
        this.gameID = gameID;
        this.ydoc = new Y.Doc();
        this.awareness = new awarenessProtocol.Awareness(this.ydoc);
        this.yPartyProvider = new YPartyKitProvider("https://rt-scoreboard-party.yuetau.partykit.dev", "RBC2025" + this.gameID, this.ydoc, { connect: this.gameID ? true : false, awareness: this.awareness });

        if (location.protocol == 'https:') {
            getTURNToken().then((turnToken) => {
                console.log(turnToken);
                this.webrtcProvider = new WebrtcProvider("RBC2025" + this.gameID, this.ydoc, { password: "RT-ScoreBoardIsGreat2025", signaling: ["wss://wrtc1.ustrobocon.win", "wss://wrtc2.ustrobocon.win"], awareness: this.awareness, peerOpts: { config: { iceServer: turnToken.iceServers } } });
            });
        };
    }

    getYDoc() {
        return this.ydoc;
    }

    getYPartyProvider() {
        return this.yPartyProvider;
    }

    getWebrtcProvider() {
        return this.webrtcProvider;
    }

    getAwareness() {
        return this.awareness;
    }

    destroy() {
        this.yPartyProvider.disconnect();
        location.protocol == 'https:' && this.webrtcProvider.destory();
    }
}