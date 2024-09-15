import YPartyKitProvider from "y-partykit/provider";
import * as awarenessProtocol from 'y-protocols/awareness.js'
import { WebrtcProvider } from "y-webrtc";
import * as Y from 'yjs';


export class YJsClient {
    gameID: string;
    ydoc: Y.Doc;
    //awareness: awarenessProtocol.Awareness;
    yPartyProvider: YPartyKitProvider;
    webrtcProvider: any;

    constructor(gameID: string) {
        this.gameID = gameID;
        this.ydoc = new Y.Doc();
        //this.awareness = new awarenessProtocol.Awareness(this.ydoc);
        this.yPartyProvider = new YPartyKitProvider("https://rt-scoreboard-party.yuetau.partykit.dev", "RBC2025" + this.gameID, this.ydoc, { connect: this.gameID ? true : false, /* awareness: this.awareness */ });
        this.webrtcProvider = location.protocol == 'https:' ? new WebrtcProvider("RBC2025" + this.gameID, this.ydoc, { password: "RT-ScoreBoardIsGreat2025", signaling: ["wss://wrtc1.ustrobocon.win", "wss://wrtc2.ustrobocon.win"], peerOpts: { config: {} }/* awareness: this.awareness */ }) : undefined;
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

    /* getAwareness() {
        return this.awareness;
    } */

    destroy() {
        this.yPartyProvider.disconnect();
        location.protocol == 'https:' && this.webrtcProvider.destory();
    }
}