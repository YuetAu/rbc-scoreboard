'use client'

import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { FirebaseApp, FirebaseDatabase } from "@/firebase/config";
import { ColorPicker } from "@/props/dashboard/ColorPicker";
import { Counter } from "@/props/dashboard/Counter";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import TimerBox from "@/props/dashboard/TimerBox";
import { Box, Button, Flex, HStack, Image, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Switch, Text } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { child, get, onDisconnect, onValue, ref, set, update } from "firebase/database";
import { useSnackbar } from "notistack";
import { generateSlug } from "random-word-slugs";
import { useEffect, useRef, useState } from "react";
import Teams from "../props/dashboard/teams.json";
import Head from 'next/head';
import { useArray, useMap, useYDoc, useYjsProvider } from "@y-sweet/react";
import { WebrtcProvider } from 'y-webrtc'
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

const ydoc = new Y.Doc();
const provider = new YPartyKitProvider("https://rt-scoreboard-party.yuetau.partykit.dev", "test", ydoc);

export default function Dashboard(props: any) {

    const clockData = ydoc.getMap("clockData");
    if (clockData.get("stage") == undefined) {
        console.log("Initializing Clock Data")
        ydoc.transact((_y) => {
            clockData.set("stage", "PREP")
            clockData.set("timestamp", 0)
            clockData.set("elapsed", 0)
            clockData.set("paused", true)
        })
    }
    const [clockText, setClockText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const [elapsedText, setElapsedText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });

    const updateClockText = () => {
        const elapsedTime = clockData.get("paused") ? clockData.get("elapsed") as number : (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
        const remainingTime = clockData.get("paused") ? (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) : (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
        if (remainingTime >= 0) { 
            const remainingMinutes = Math.floor(remainingTime/60000)+"";
            const remainingSeconds = Math.floor(remainingTime/1000%60)+"";
            const remainingMilliseconds = remainingTime%1000+"";
            setClockText({
                minutes: remainingMinutes.length < 2 ? "0"+remainingMinutes : remainingMinutes,
                seconds: remainingSeconds.length < 2 ? "0"+remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 3 ? remainingMilliseconds.length < 2 ? "00"+remainingMilliseconds : "0"+remainingMilliseconds : remainingMilliseconds
            })
            const elapsedMinutes = Math.floor(elapsedTime/60000)+"";
            const elapsedSeconds = Math.floor(elapsedTime/1000%60)+"";
            const elapsedMilliseconds = elapsedTime%1000+"";
            setElapsedText({
                minutes: elapsedMinutes.length < 2 ? "0"+elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0"+elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00"+elapsedMilliseconds : "0"+elapsedMilliseconds : elapsedMilliseconds
            })
            //soundCheck(gameStage.current, remainingTime);
            if (!(clockData.get("paused") as boolean)) {
                setTimeout(() => {
                    updateClockText();
                }, 37);
            }
        } else {
            if (GAME_STAGES.indexOf(clockData.get("stage") as string)+1 < GAME_STAGES.length) {
                const newGameStage = GAME_STAGES[GAME_STAGES.indexOf(clockData.get("stage") as string)+1];
                console.log(`Resetting Timer for ${newGameStage}`);
                const remainingTime = GAME_STAGES_TIME[GAME_STAGES.indexOf(newGameStage)]*1000;
                ydoc.transact((_y) => {
                    clockData.set("stage", newGameStage);
                    clockData.set("timestamp", Date.now());
                    clockData.set("elapsed", 0);
                    clockData.set("paused", remainingTime > 0 ? false : true);
                })
                updateClockText();
            }
        }
    }

    clockData.observeDeep(updateClockText);

    const startClock = () => {
        console.log("Clock Started")
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", clockData.get("elapsed") as number);
            clockData.set("paused", false);
        })
        //enqueueSnackbar("Clock Started", {variant: "success", preventDuplicate: true})
    }

    const stopClock = () => {
        console.log("Clock Stopped")
        const elapsed = (Date.now()-(clockData.get("timestamp") as number)) + (clockData.get("elapsed") as number)
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", elapsed);
            clockData.set("paused", true);
        })
        //enqueueSnackbar("Clock Stopped", {variant: "success", preventDuplicate: true})
        //setTimeout(() => {stopSound();}, 50);
    }

    const toggleClock = () => {
        if (clockData.get("paused") as boolean) {
            startClock();
        } else {
            stopClock();
        }
    }

    const resetStage = () => {
        console.log("Reset Stage Time")
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", 0);
            clockData.set("paused", true);
        })
        //enqueueSnackbar(`Reset stage ${gameStage.current}`, {variant: "success", preventDuplicate: true});
    }

    const changeStage = (skipStage:number) => {
        const index = GAME_STAGES.indexOf(clockData.get("stage") as string);
        if (index+skipStage < 0 ) {stopClock(); return;}
        if (index+skipStage > GAME_STAGES.length-1 ) {stopClock(); return;}
        const nextStage = GAME_STAGES[index+skipStage];
        const remainingTime = GAME_STAGES_TIME[index+skipStage]*1000;
        console.log(`Skip stage to ${nextStage}`);
        ydoc.transact((_y) => {
            clockData.set("stage", nextStage);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", 0);
            clockData.set("paused", remainingTime > 0 ? false : true);
        })
        //enqueueSnackbar(`Skip stage to ${gameStage.current}`, {variant: "success", preventDuplicate: true})
    }


    return (
        <>
            {clockData.get("stage") as string}
            <br />
            {clockText.minutes}:{clockText.seconds}.{clockText.milliseconds}
            <br />
            {elapsedText.minutes}:{elapsedText.seconds}.{elapsedText.milliseconds}
            <br />
            <Button onClick={toggleClock}>Toggle</Button>
            <Button onClick={resetStage}>Reset</Button>
            <Button onClick={() => changeStage(-1)}>Back</Button>
            <Button onClick={() => changeStage(1)}>Next</Button>
            <Button onClick={startClock}>Start</Button>
            <Button onClick={stopClock}>Stop</Button>
            <br />
        </>
    )
}