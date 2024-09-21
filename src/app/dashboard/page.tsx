'use client'

import { FIRST_POSSESSION, GAME_STAGES, GAME_STAGES_TIME, POSSESSION, SHOTCLOCK } from "@/app/common/gameStages";
import { deepMerge } from "@/app/helpers/deepMerge";
import { Counter } from "@/app/props/dashboard/Counter";
import HistoryList from "@/app/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/app/props/dashboard/ScoreDisplay";
import { PossessionClock, ShotClock } from "@/app/props/dashboard/ShotClock";
import TimerBox from "@/app/props/dashboard/TimerBox";
import { YJsClient } from "@/app/yjsClient/yjsClient";
import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Button, Flex, Grid, GridItem, Input, Image, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper, Switch, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useToast, VStack, SimpleGrid, Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverCloseButton, PopoverBody } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import '@fontsource-variable/noto-sans-tc';
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AwaitedReactNode, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import * as Y from "yjs";
import { changeLogs } from "../common/changeLogs";
import { MarkdownComponents } from "../helpers/markdown";
import { generateSlug } from "random-word-slugs";
import { generateFromString } from 'generate-avatar'


export default function Dashboard(props: any) {

    // [Sys] Initiate Components
    const toast = useToast();

    // [Sys] ContinerHeight Helper Functions and States
    const [containerHeight, setContainerHeight] = useState(0);
    const heightEventListner = useRef(false);

    useEffect(() => {
        if (!heightEventListner.current) {
            const handleResize = () => {
                setContainerHeight(window.innerHeight);
            }
            handleResize();
            window.addEventListener('resize', handleResize);
            heightEventListner.current = true;
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [])

    //const buildVersion = process.env.CF_PAGES_COMMIT_SHA || null;

    // [Sys] TimeSync Functions and States
    const timeOffset = useRef(0);
    const timeSyncInterval = useRef<any>(null);
    const timeSyncType = useRef(0);
    const [timeOffsetModal, setTimeOffsetModal] = useState(false);

    const getTimeOffset = async () => {
        const syncAttempts = 3; // Number of sync attempts
        let totalOffset = 0;

        for (let i = 0; i < syncAttempts; i++) {
            try {
                const startTime = Date.now();
                const response = await fetch("/api/timeSync");
                const endTime = Date.now();
                const serverTime = parseInt(await response.text());

                const roundTripTime = endTime - startTime;
                const offset = serverTime - (endTime - roundTripTime / 2);

                totalOffset += offset;

                console.log(`Sync attempt ${i + 1}:`, { serverTime, startTime, endTime, roundTripTime, offset });
            } catch (error) {
                console.error(`Error in sync attempt ${i + 1}:`, error);
            }
        }

        timeOffset.current = totalOffset / syncAttempts;
        console.log("Final Time Offset:", timeOffset.current);

        if (timeOffset.current > 10000 || timeOffset.current < -10000) {
            setOnlineStatus(2);
            if (timeSyncType.current != 2) {
                timeSyncInterval.current && clearInterval(timeSyncInterval.current);
                timeSyncInterval.current = setInterval(getTimeOffset, 20 * 1000);
                timeSyncType.current = 2;
            }
        } else if (timeOffset.current > 1000 || timeOffset.current < -1000) {
            if (timeSyncType.current != 1) {
                timeSyncInterval.current && clearInterval(timeSyncInterval.current);
                timeSyncInterval.current = setInterval(getTimeOffset, 60 * 1000);
                timeSyncType.current = 1;
            }
        } else {
            if (timeSyncType.current != 0) {
                timeSyncInterval.current && clearInterval(timeSyncInterval.current);
                timeSyncInterval.current = setInterval(getTimeOffset, 120 * 1000);
                timeSyncType.current = 0;
            }
        }
    };

    useEffect(() => {
        setTimeout(getTimeOffset, 1000);
    }, [])

    // [Core] GameID Functions and States]
    const [gameID, setGameID] = useState("");
    const [gameIDModal, setGameIDModal] = useState(true);
    const gameIDInput = useRef<HTMLInputElement>(null);
    const [yJsClient, setYJsClient] = useState<YJsClient | null>(null);
    const [ydoc, setYDoc] = useState<Y.Doc>(new Y.Doc());
    const [onlineStatus, setOnlineStatus] = useState(0);
    const [roomClient, setRoomClient] = useState<any>([]);

    const submitGameID = useCallback(async (gameID?: string) => {
        if (gameID) {

            //const turnServer = await getTURNToken();

            const yJsClient = new YJsClient(gameID, connectionEventHandler);
            setGameID(gameID);
            setYJsClient(yJsClient);
            setYDoc(yJsClient.getYDoc());
            setClockData(yJsClient.getYDoc().getMap("clockData") as Y.Map<any>);
            setGameProps(yJsClient.getYDoc().getMap("gameProps") as Y.Map<any>);
            setRedShotClockData(yJsClient.getYDoc().getMap("redShotClockData") as Y.Map<any>);
            setBlueShotClockData(yJsClient.getYDoc().getMap("blueShotClockData") as Y.Map<any>);
            setPossessionClockData(yJsClient.getYDoc().getMap("possessionClockData") as Y.Map<any>);
            setPossessionData(yJsClient.getYDoc().getMap("possessionData") as Y.Map<any>);
            setGameIDModal(false);

            yJsClient.getAwareness().on("change", () => {
                const newRoomClient: any[] = [];
                for (const [key, value] of yJsClient.getAwareness().getStates()) {
                    newRoomClient.push({ nickname: value.nickname, id: key, uuid: value.uuid });
                }
                setRoomClient(newRoomClient);
                console.log("Room Clients:", newRoomClient);
            });
            yJsClient.getAwareness().setLocalStateField("nickname", gameSettingsRef.current.device.nickname);
            yJsClient.getAwareness().setLocalStateField("uuid", gameSettingsRef.current.device.uuid);

        }
    }, []);


    const connectionEventHandler = (event: any) => {
        if (event.status == "connected") {
            setOnlineStatus(1);
            getTimeOffset();
        } else {
            setOnlineStatus(0);
        }
    }

    // [Features] GameSetting Functions and States
    const isFirstReadSettings = useRef(false);
    const [gameSettingsModal, setGameSettingsModal] = useState(false);
    const [gameSettings, setGameSettings] = useState(
        {
            sounds: {
                preGameCountdown: true,
                endGameCountdown: true,
                shotClock8sTone: true,
                shotClockEndTone: true
            },
            stages: {
                PREP: 60,
                GAME: 120,
                END: 0
            },
            changeLogs: 0,
            behaviour: {
                possessionAfterScored: true,
            },
            layout: {
                smDevice: false,
            },
            device: {
                nickname: "",
                uuid: "",
            }
        });
    const gameSettingsRef = useRef(gameSettings);

    const [changeLogsModal, setChangeLogsModal] = useState(false);

    useEffect(() => {
        const localGameSettingsJSON = localStorage.getItem("gameSettings");
        if (!isFirstReadSettings.current) {
            try {
                const localGameSettings = JSON.parse(localGameSettingsJSON!);
                const mergedSettings = deepMerge(gameSettings, localGameSettings);
                if (mergedSettings.changeLogs < changeLogs[0].internalCode) {
                    setChangeLogsModal(true);
                }
                if (mergedSettings.device.nickname == "") {
                    mergedSettings.device.nickname = generateSlug(3, { format: "title" });
                }
                if (mergedSettings.device.uuid == "") {
                    mergedSettings.device.uuid = window.crypto.randomUUID() + "-U-" + Date.now().toString(16);
                }
                setGameSettings(mergedSettings);
                localStorage.setItem("gameSettings", JSON.stringify(mergedSettings));
            } catch (error) {
                var mergedSettings = { ...gameSettings };
                if (mergedSettings.device.nickname == "") {
                    mergedSettings.device.nickname = generateSlug(3, { format: "title" });
                }
                if (mergedSettings.device.uuid == "") {
                    mergedSettings.device.uuid = window.crypto.randomUUID() + "-U-" + Date.now().toString(16);
                }
                localStorage.setItem("gameSettings", JSON.stringify(mergedSettings));
                setChangeLogsModal(true);
            }
            isFirstReadSettings.current = true;
        } else {
            localStorage.setItem("gameSettings", JSON.stringify(gameSettings));
        }

        gameSettingsRef.current = gameSettings;
    }, [gameSettings]);

    // [Features] Start of Sound Functions
    const [beepSound, setBeepSound] = useState<any>(null);
    const [startSound, setStartSound] = useState<any>(null);
    const [toneSound, setToneSound] = useState<any>(null);
    const [tone2Sound, setTone2Sound] = useState<any>(null);
    useEffect(() => {
        setBeepSound(new Audio("/sound/beep.mp3"));
        setStartSound(new Audio("/sound/start.mp3"));
        setToneSound(new Audio("/sound/tone.mp3"));
        setTone2Sound(new Audio("/sound/tone2.mp3"));
    }, [])


    const lastBeepSecond = useRef(0);
    const lastToneSecond = useRef(false);
    const lastTone2Second = useRef(false);

    const soundCheck = (stage: string, remainingTime: number, elapsedTime?: number) => {
        switch (stage) {
            case "PREP":
                if (remainingTime <= 3000 && remainingTime > 0 && gameSettingsRef.current.sounds.preGameCountdown) {
                    const secondsRemaining = Math.ceil(remainingTime / 1000);
                    if (secondsRemaining !== lastBeepSecond.current && beepSound) {
                        beepSound.play();
                        lastBeepSecond.current = secondsRemaining;
                    }
                }
                break;
            case "PREPEND":
                if (startSound && gameSettingsRef.current.sounds.preGameCountdown) {
                    startSound.play();
                }
            case "GAME":
                if (remainingTime <= 10000 && remainingTime > 0 && gameSettingsRef.current.sounds.endGameCountdown) {
                    const secondsRemaining = Math.ceil(remainingTime / 1000);
                    if (secondsRemaining !== lastBeepSecond.current) {
                        beepSound.play();
                        lastBeepSecond.current = secondsRemaining;
                    }
                }
                break;
            case "GAMEEND":
                if (startSound && gameSettingsRef.current.sounds.endGameCountdown) {
                    startSound.play();
                }
                break;
            case "REDSHOTCLOCK":
            case "BLUESHOTCLOCK":
                if (elapsedTime && gameSettingsRef.current.sounds.shotClock8sTone) {
                    const secondsElapsed = Math.ceil(elapsedTime / 1000);
                    if (secondsElapsed == 8 && !lastTone2Second.current && tone2Sound) {
                        tone2Sound.play();
                        lastTone2Second.current = true;
                    } else {
                        lastTone2Second.current = false;
                    }
                }
                break;
            case "REDSHOTCLOCKEND":
            case "BLUESHOTCLOCKEND":
            case "POSSESSIONCLOCKEND":
                if (toneSound && gameSettingsRef.current.sounds.shotClockEndTone) {
                    toneSound.play();
                }
                break;
            case "END":
                break;
        }
    }

    const stopSound = () => {

    }

    const forceStopSound = () => {
        if (beepSound) {
            beepSound.pause();
            beepSound.currentTime = 0;
        }
        if (startSound) {
            startSound.pause();
            startSound.currentTime = 0;
        }
        if (toneSound) {
            toneSound.pause();
            toneSound.currentTime = 0;
        }
    }
    // [Features] End of Sound Functions


    // [Core] Start of Clock Functions and States
    const [clockData, setClockData] = useState(ydoc.getMap("clockData") as Y.Map<any>);
    useEffect(() => {
        if (clockData.get("init") == undefined) {
            console.log("Initializing Clock Data")
            ydoc.transact((_y) => {
                clockData.set("stage", "PREP")
                clockData.set("timestamp", 0)
                clockData.set("elapsed", 0)
                clockData.set("paused", true)
                clockData.set("stageTrigger", false)
                clockData.set("init", true)
            })
        }
    }, [clockData]);
    const [clockText, setClockText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const [elapsedText, setElapsedText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });

    const clockInterval = useRef<any>(null);

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [clockStage, setClockStage] = useState("PREP" as string);
    const [clockPaused, setClockPaused] = useState(true);

    // [Core] Clock Main Function
    const updateClockText = () => {

        // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
        setClockStage(clockData.get("stage") as string);
        setClockPaused(clockData.get("paused") as boolean);

        // Calculate elapsedTime and remainingTime based on clock paused or not
        // To ensure every clock show the same time when stopped
        const elapsedTime = clockData.get("paused") ? clockData.get("elapsed") as number : (clockData.get("elapsed") as number) + ((Date.now() + timeOffset.current) - (clockData.get("timestamp") as number));
        const remainingTime = clockData.get("paused")
            ? (syncGameSettingsRef.current.stages[clockData.get("stage") as keyof typeof syncGameSettingsRef.current.stages] * 1000) - (clockData.get("elapsed") as number)
            : (syncGameSettingsRef.current.stages[clockData.get("stage") as keyof typeof syncGameSettingsRef.current.stages] * 1000) - (clockData.get("elapsed") as number) - ((Date.now() + timeOffset.current) - (clockData.get("timestamp") as number));

        // Check if still have remaining time in the current stage
        if (remainingTime >= 0) {

            // Check if the stage is just started
            if (!clockData.get("stageTrigger") && !clockData.get("paused") as boolean) {
                clockData.set("stageTrigger", true);
                console.log(`Just Started ${clockData.get("stage") as string}`);

                switch (clockData.get("stage") as string) {
                    case "GAME":
                        switch (possessionData.get("currentPossession") as string) {
                            case "red":
                                startRedShotClock();
                                break;
                            case "blue":
                                startBlueShotClock();
                                break;
                            case "possession":
                                startPossessionClock();
                                stopClock();
                                break;
                        }
                        break;
                }
            }

            // Calculate remainingTime from seconds to human-readable text
            // For On-screen clock display
            const remainingMinutes = Math.floor(remainingTime / 60000) + "";
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            const remainingMilliseconds = Math.floor(remainingTime % 1000) + "";
            setClockText({
                minutes: remainingMinutes.length < 2 ? "0" + remainingMinutes : remainingMinutes,
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 3 ? remainingMilliseconds.length < 2 ? "00" + remainingMilliseconds : "0" + remainingMilliseconds : remainingMilliseconds
            })

            // Calculate elapsedTime from seconds to human-readable text
            // For history entries
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = Math.floor(elapsedTime % 1000) + "";
            setElapsedText({
                minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
            })

            // After-math function
            // That has to check constantly
            soundCheck((clockData.get("stage") as string), remainingTime);

            //if (gameProps.get("replay")) { replayHistoryHandler((clockData.get("stage") as string), elapsedTime); }

            // Recall itself 57 milliseconds after
            // Yes, it isn't real-time, but it seems ones.
            // The site will crash if you make it real-time. ¯\_(ツ)_/¯
            if (!(clockData.get("paused") as boolean)) {
                // Clock start and stop interval written here due to remote client may start and stop 
                // Which updateClockText will trigger everytime clockData has changed locally or from remote
                // e.g. clockData.observeDeep(updateClockText);
                if (clockInterval.current == null) {
                    // Direct callback instead of wrapping another anomyous function to prevent memory leak ٩(´•⌢•｀ )۶⁼³₌₃
                    const tmpClockInterval = setInterval(updateClockText, 57);
                    clockInterval.current = tmpClockInterval;
                }
            } else {
                // Clear interval if paused
                clearInterval(clockInterval.current);
                clockInterval.current = null;
            }
        } else {
            // There is no remaining time in current stage
            // Continue to next stage

            // End of stage
            soundCheck((clockData.get("stage") as string) + "END", 0);

            // Check if still have stage
            if (GAME_STAGES.indexOf(clockData.get("stage") as string) + 1 < GAME_STAGES.length) {
                // Get the new stage name and remaining time
                const newGameStage = GAME_STAGES[GAME_STAGES.indexOf(clockData.get("stage") as string) + 1];
                console.log(`Resetting Timer for ${newGameStage}`);
                const remainingTime = GAME_STAGES_TIME[GAME_STAGES.indexOf(newGameStage)] * 1000;
                ydoc.transact((_y) => {
                    clockData.set("stage", newGameStage);
                    clockData.set("timestamp", (Date.now() + timeOffset.current));
                    clockData.set("elapsed", 0);
                    clockData.set("paused", remainingTime > 0 ? false : true);
                })

                if (newGameStage == "END") {
                    toast({
                        title: "Game END",
                        status: 'success',
                        duration: 5000,
                    })
                }
                // Game start wait judge approval
                if (newGameStage == "GAME") {
                    stopClock();
                    resetStage();
                }

                // Stop all clock when game end to add points if needed
                if (newGameStage == "END") {
                    stopPossessionClock();
                    stopRedShotClock();
                    stopBlueShotClock();
                }
            }
        }
    }

    // [Core] Clock Listener
    // It will trigger everytime clockData has changed locally or from remote
    clockData.observeDeep(updateClockText);

    // [Core] Start of Clock Helper Function
    const startClock = () => {
        // Start Clock Pre-check
        if (clockData.get("stage") == "GAME") {
            switch (possessionData.get("currentPossession") as string) {
                case "possession":
                    startPossessionClock();
                    return;
            }
        }

        console.log("Clock Started")
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", (Date.now() + timeOffset.current));
            clockData.set("elapsed", clockData.get("elapsed") as number);
            clockData.set("stageTrigger", clockData.get("stageTrigger") as boolean);
            clockData.set("paused", false);
        })

        // Start Clock After-check
        if (clockData.get("stage") == "GAME") {
            switch (possessionData.get("currentPossession") as string) {
                case "red":
                    startRedShotClock();
                    break;
                case "blue":
                    startBlueShotClock();
                    break;
            }
        }

        toast({
            title: "Clock Started",
            status: 'success',
            duration: 1000,
        })

        if (clockInterval.current == null) {
            // Direct callback instead of wrapping another anomyous function to prevent memory leak ٩(´•⌢•｀ )۶⁼³₌₃
            const tmpClockInterval = setInterval(updateClockText, 57);
            clockInterval.current = tmpClockInterval;
        }
    }

    const stopClock = () => {
        console.log("Clock Stopped")
        const elapsed = ((Date.now() + timeOffset.current) - (clockData.get("timestamp") as number)) + (clockData.get("elapsed") as number)
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", (Date.now() + timeOffset.current));
            clockData.set("elapsed", elapsed);
            clockData.set("paused", true);
        })

        stopRedShotClock();
        stopBlueShotClock();

        toast({
            title: "Clock Stopped",
            status: 'success',
            duration: 1000,
        })
        // Delay 50ms to prevent updateClockText start the sound again
        // setTimeout(() => { forceStopSound(); }, 50);

        // Clear interval if paused
        clearInterval(clockInterval.current);
        clockInterval.current = null;
    }

    const toggleClock = () => {
        if (!possessionClockData.get("paused") as boolean) { return; }
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
            clockData.set("timestamp", (Date.now() + timeOffset.current));
            clockData.set("elapsed", 0);
            clockData.set("stageTrigger", false);
            clockData.set("paused", true);

            redShotClockData.set("timestamp", (Date.now() + timeOffset.current));
            redShotClockData.set("elapsed", 0);
            redShotClockData.set("paused", true);

            blueShotClockData.set("timestamp", (Date.now() + timeOffset.current));
            blueShotClockData.set("elapsed", 0);
            blueShotClockData.set("paused", true);

            possessionClockData.set("timestamp", (Date.now() + timeOffset.current));
            possessionClockData.set("elapsed", 0);
            possessionClockData.set("firstPossession", true);
            possessionClockData.set("paused", true);

            possessionData.set("currentPossession", "possession");
            possessionData.set("nextPossession", "red");

        })
        toast({
            title: `Reset stage ${clockData.get("stage") as string}`,
            status: 'success',
            duration: 1000,
        })
    }

    const changeStage = (skipStage: number) => {

        resetBlueShotClock();
        resetRedShotClock();
        resetPossessionClock();

        const index = GAME_STAGES.indexOf(clockData.get("stage") as string);
        if (index + skipStage < 0) { stopClock(); return; }
        if (index + skipStage > GAME_STAGES.length - 1) { stopClock(); return; }
        const nextStage = GAME_STAGES[index + skipStage];
        const remainingTime = GAME_STAGES_TIME[index + skipStage] * 1000;
        console.log(`Skip stage to ${nextStage}`);
        ydoc.transact((_y) => {
            clockData.set("stage", nextStage);
            clockData.set("timestamp", (Date.now() + timeOffset.current));
            clockData.set("elapsed", 0);
            clockData.set("stageTrigger", false);
            clockData.set("paused", remainingTime > 0 ? false : true);
        })
        toast({
            title: `Skip stage ${clockData.get("stage") as string}`,
            status: 'success',
            duration: 1000,
        })
    }

    // [Core] End of Clock Helper Function
    // [Core] End of Clock Functions and States


    // [Feature] Start of ShotClock Functions and States
    const [redShotClockData, setRedShotClockData] = useState(ydoc.getMap("redShotClockData") as Y.Map<any>);
    const [blueShotClockData, setBlueShotClockData] = useState(ydoc.getMap("blueShotClockData") as Y.Map<any>);
    const [possessionClockData, setPossessionClockData] = useState(ydoc.getMap("possessionClockData") as Y.Map<any>);
    const [possessionData, setPossessionData] = useState(ydoc.getMap("possessionData") as Y.Map<any>);

    useEffect(() => {
        if (redShotClockData.get("init") == undefined) {
            console.log("Initializing Red Shot Clock Data")
            ydoc.transact((_y) => {
                redShotClockData.set("timestamp", 0)
                redShotClockData.set("elapsed", 0)
                redShotClockData.set("paused", true)
                redShotClockData.set("init", true)
            })
        }
    }, [redShotClockData]);

    useEffect(() => {
        if (blueShotClockData.get("init") == undefined) {
            console.log("Initializing Blue Shot Clock Data")
            ydoc.transact((_y) => {
                blueShotClockData.set("timestamp", 0)
                blueShotClockData.set("elapsed", 0)
                blueShotClockData.set("paused", true)
                blueShotClockData.set("init", true)
            })
        }
    }, [blueShotClockData]);

    useEffect(() => {
        if (possessionClockData.get("init") == undefined) {
            console.log("Initializing Possession Clock Data")
            ydoc.transact((_y) => {
                possessionClockData.set("timestamp", 0)
                possessionClockData.set("elapsed", 0)
                possessionClockData.set("paused", true)
                possessionClockData.set("firstPossession", true)
                possessionClockData.set("init", true)
            })
        }
    }, [possessionClockData]);

    useEffect(() => {
        if (possessionData.get("init") == undefined) {
            console.log("Initializing Possession Data")
            ydoc.transact((_y) => {
                possessionData.set("currentPossession", "possession")
                possessionData.set("nextPossession", "red")
                possessionData.set("init", true)
            })
        }
    }, [possessionData]);

    const [redShotClockText, setRedShotClockText] = useState({ seconds: "00", milliseconds: "00" });
    const [blueShotClockText, setBlueShotClockText] = useState({ seconds: "00", milliseconds: "00" });
    const [possessionClockText, setPossessionClockText] = useState({ seconds: "00", milliseconds: "00" });
    const redShotClockInterval = useRef<any>(null);
    const blueShotClockInterval = useRef<any>(null);
    const possessionClockInterval = useRef<any>(null);

    const [redShotClockPaused, setRedShotClockPaused] = useState(true);
    const [blueShotClockPaused, setBlueShotClockPaused] = useState(true);
    const [possessionClockPaused, setPossessionClockPaused] = useState(true);

    const updateRedShotClockText = () => {
        setRedShotClockPaused(redShotClockData.get("paused") as boolean);

        const remainingTime = redShotClockData.get("paused") ? (SHOTCLOCK * 1000) - (redShotClockData.get("elapsed") as number) : (SHOTCLOCK * 1000) - (redShotClockData.get("elapsed") as number) - ((Date.now() + timeOffset.current) - (redShotClockData.get("timestamp") as number));
        const elapsedTime = redShotClockData.get("paused") ? (redShotClockData.get("elapsed") as number) : (redShotClockData.get("elapsed") as number) + ((Date.now() + timeOffset.current) - (redShotClockData.get("timestamp") as number));
        if (remainingTime >= 0) {
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            const remainingMilliseconds = Math.floor((remainingTime % 1000) / 10) + "";
            setRedShotClockText({
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 2 ? "0" + remainingMilliseconds : remainingMilliseconds
            })

            soundCheck("REDSHOTCLOCK", remainingTime, elapsedTime);

            if (!(redShotClockData.get("paused") as boolean)) {
                if (redShotClockInterval.current == null) {
                    const tmpRedShotClockInterval = setInterval(updateRedShotClockText, 100);
                    redShotClockInterval.current = tmpRedShotClockInterval;
                }
            } else {
                clearInterval(redShotClockInterval.current);
                redShotClockInterval.current = null;
            }
        } else {

            soundCheck("REDSHOTCLOCKEND", 0);

            clearInterval(redShotClockInterval.current);
            if (redShotClockInterval.current != null) {
                ydoc.transact((_y) => {
                    redShotClockData.set("timestamp", (Date.now() + timeOffset.current));
                    redShotClockData.set("elapsed", (SHOTCLOCK * 1000));
                    redShotClockData.set("paused", true);

                    possessionData.set("currentPossession", "possession");
                })
            }
            redShotClockInterval.current = null;
            stopClock();
            console.log("Red Shot Clock Timeout")
        }
    }
    redShotClockData.observeDeep(updateRedShotClockText);

    const updateBlueShotClockText = () => {
        setBlueShotClockPaused(blueShotClockData.get("paused") as boolean);

        const remainingTime = blueShotClockData.get("paused") ? (SHOTCLOCK * 1000) - (blueShotClockData.get("elapsed") as number) : (SHOTCLOCK * 1000) - (blueShotClockData.get("elapsed") as number) - ((Date.now() + timeOffset.current) - (blueShotClockData.get("timestamp") as number));
        const elapsedTime = blueShotClockData.get("paused") ? (blueShotClockData.get("elapsed") as number) : (blueShotClockData.get("elapsed") as number) + ((Date.now() + timeOffset.current) - (blueShotClockData.get("timestamp") as number));
        if (remainingTime >= 0) {
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            const remainingMilliseconds = Math.floor((remainingTime % 1000) / 10) + "";
            setBlueShotClockText({
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 2 ? "0" + remainingMilliseconds : remainingMilliseconds
            })

            soundCheck("BLUESHOTCLOCK", remainingTime, elapsedTime);

            if (!(blueShotClockData.get("paused") as boolean)) {
                if (blueShotClockInterval.current == null) {
                    const tmpBlueShotClockInterval = setInterval(updateBlueShotClockText, 100);
                    blueShotClockInterval.current = tmpBlueShotClockInterval;
                }
            } else {
                clearInterval(blueShotClockInterval.current);
                blueShotClockInterval.current = null;
            }
        } else {

            soundCheck("BLUESHOTCLOCKEND", 0);

            clearInterval(blueShotClockInterval.current);
            if (blueShotClockInterval.current != null) {
                ydoc.transact((_y) => {
                    blueShotClockData.set("timestamp", (Date.now() + timeOffset.current));
                    blueShotClockData.set("elapsed", (SHOTCLOCK * 1000));
                    blueShotClockData.set("paused", true);

                    possessionData.set("currentPossession", "possession");
                })
            }
            blueShotClockInterval.current = null;
            stopClock();
            console.log("Blue Shot Clock Timeout")
        }
    }
    blueShotClockData.observeDeep(updateBlueShotClockText);

    const updatePossessionClockText = () => {
        setPossessionClockPaused(possessionClockData.get("paused") as boolean);

        const remainingTime = possessionClockData.get("paused") ? ((possessionClockData.get("firstPossession") ? FIRST_POSSESSION : POSSESSION) * 1000) - (possessionClockData.get("elapsed") as number) : ((possessionClockData.get("firstPossession") ? FIRST_POSSESSION : POSSESSION) * 1000) - (possessionClockData.get("elapsed") as number) - ((Date.now() + timeOffset.current) - (possessionClockData.get("timestamp") as number));
        if (remainingTime >= 0) {
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            const remainingMilliseconds = Math.floor((remainingTime % 1000) / 10) + "";
            setPossessionClockText({
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 2 ? "0" + remainingMilliseconds : remainingMilliseconds
            })

            soundCheck("POSSESSIONCLOCK", remainingTime);

            if (!(possessionClockData.get("paused") as boolean)) {
                if (possessionClockInterval.current == null) {
                    const tmpPossessionClockInterval = setInterval(updatePossessionClockText, 100);
                    possessionClockInterval.current = tmpPossessionClockInterval;
                }
            } else {
                clearInterval(possessionClockInterval.current);
                possessionClockInterval.current = null;
            }
        } else {

            soundCheck("POSSESSIONCLOCKEND", 0);

            clearInterval(possessionClockInterval.current);
            if (possessionClockInterval.current != null) {
                resetPossessionClock();
            }
            possessionClockInterval.current = null;
            if (possessionClockData.get("firstPossession") as boolean) {
                possessionClockData.set("firstPossession", false);
            }
            console.log("Possession Clock Timeout")
            possessionData.set("currentPossession", possessionData.get("nextPossession") as string);

        }
    }
    possessionClockData.observeDeep(updatePossessionClockText);

    possessionData.observeDeep(() => {
        if (clockData.get("stage") == "GAME") {
            switch (possessionData.get("currentPossession") as string) {
                case "red":
                    startRedShotClock();
                    break;
                case "blue":
                    startBlueShotClock();
                    break;
            }
        }
    });

    const startRedShotClock = () => {
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }
        if (clockData.get("paused")) {
            startClock();
        }
        if (redShotClockData.get("paused")) {
            resetBlueShotClock();
            resetPossessionClock();
            ydoc.transact((_y) => {
                possessionData.set("nextPossession", "blue");
                possessionData.set("currentPossession", "red");

                redShotClockData.set("timestamp", (Date.now() + timeOffset.current));
                redShotClockData.set("elapsed", redShotClockData.get("elapsed") as number);
                redShotClockData.set("paused", false);
            })
        }
    }

    const stopRedShotClock = () => {
        if (!redShotClockData.get("paused")) {
            ydoc.transact((_y) => {
                const elapsed = ((Date.now() + timeOffset.current) - (redShotClockData.get("timestamp") as number)) + (redShotClockData.get("elapsed") as number)
                redShotClockData.set("timestamp", (Date.now() + timeOffset.current));
                redShotClockData.set("elapsed", elapsed);
                redShotClockData.set("paused", true);
            })
        }
    }

    const toggleRedShotClock = () => {
        if (redShotClockData.get("paused") as boolean) {
            startRedShotClock();
        } else {
            stopRedShotClock();
        }
    }

    const resetRedShotClock = () => {
        ydoc.transact((_y) => {
            redShotClockData.set("timestamp", (Date.now() + timeOffset.current));
            redShotClockData.set("elapsed", 0);
            redShotClockData.set("paused", true);
        })
    }

    const startBlueShotClock = () => {
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }
        if (clockData.get("paused")) {
            startClock();
        }
        if (blueShotClockData.get("paused")) {
            resetRedShotClock();
            resetPossessionClock();
            ydoc.transact((_y) => {
                possessionData.set("nextPossession", "red");
                possessionData.set("currentPossession", "blue");

                blueShotClockData.set("timestamp", (Date.now() + timeOffset.current));
                blueShotClockData.set("elapsed", blueShotClockData.get("elapsed") as number);
                blueShotClockData.set("paused", false);
            })
        }
    }

    const stopBlueShotClock = () => {
        if (!blueShotClockData.get("paused")) {
            ydoc.transact((_y) => {
                const elapsed = ((Date.now() + timeOffset.current) - (blueShotClockData.get("timestamp") as number)) + (blueShotClockData.get("elapsed") as number)
                blueShotClockData.set("timestamp", (Date.now() + timeOffset.current));
                blueShotClockData.set("elapsed", elapsed);
                blueShotClockData.set("paused", true);
            })
        }
    }

    const toggleBlueShotClock = () => {
        if (blueShotClockData.get("paused") as boolean) {
            startBlueShotClock();
        } else {
            stopBlueShotClock();
        }
    }

    const resetBlueShotClock = () => {
        console.log("Reset Blue Shot Clock")
        ydoc.transact((_y) => {
            blueShotClockData.set("timestamp", (Date.now() + timeOffset.current));
            blueShotClockData.set("elapsed", 0);
            blueShotClockData.set("paused", true);
        })
    }

    const startPossessionClock = () => {
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }
        if (!clockData.get("paused")) {
            stopClock();
        }
        if (possessionClockData.get("paused")) {
            resetRedShotClock();
            resetBlueShotClock();
            ydoc.transact((_y) => {
                possessionData.set("currentPossession", "possession");

                possessionClockData.set("timestamp", (Date.now() + timeOffset.current));
                possessionClockData.set("elapsed", possessionClockData.get("elapsed") as number);
                possessionClockData.set("paused", false);
            })
        }
    }

    const stopPossessionClock = () => {
        if (!possessionClockData.get("paused")) {
            ydoc.transact((_y) => {
                const elapsed = ((Date.now() + timeOffset.current) - (possessionClockData.get("timestamp") as number)) + (possessionClockData.get("elapsed") as number)
                possessionClockData.set("timestamp", (Date.now() + timeOffset.current));
                possessionClockData.set("elapsed", elapsed);
                possessionClockData.set("paused", true);
            })
        }
    }

    const togglePossessionClock = () => {
        if (possessionClockData.get("paused") as boolean) {
            startPossessionClock();
        } else {
            stopPossessionClock();
        }
    }

    const resetPossessionClock = () => {
        ydoc.transact((_y) => {
            possessionClockData.set("timestamp", (Date.now() + timeOffset.current));
            possessionClockData.set("elapsed", 0);
            possessionClockData.set("paused", true);
        })
    }

    // [Feature] End of ShotClock Functions and States


    // [Core] Start of GameProps Functions and States
    const [gameProps, setGameProps] = useState(ydoc.getMap("gameProps") as Y.Map<any>);
    if (gameProps.get("init") == undefined) {
        console.log("Initializing GameProps Data")
        ydoc.transact((_y) => {
            gameProps.set("teams", { "red": { "cname": "征龍", "ename": "War Dragon" }, "blue": { "cname": "火之龍", "ename": "Fiery Dragon" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory);

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redDunk", 0);
            gamePropsItems.set("redTwoPoint", 0);
            gamePropsItems.set("redThreePoint", 0);
            gamePropsItems.set("blueDunk", 0);
            gamePropsItems.set("blueTwoPoint", 0);
            gamePropsItems.set("blueThreePoint", 0);
            gameProps.set("items", gamePropsItems);

            const gamePropsSettings = new Y.Map() as Y.Map<any>;
            gamePropsSettings.set("stages", gameSettings.stages);
            gameProps.set("settings", gamePropsSettings);

            gameProps.set("replay", false);

            gameProps.set("init", true);
        })
    }

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [historyState, setHistoryState] = useState<any[]>([]);
    const [itemsState, setItemsState] = useState<any>({
        redDunk: 0,
        redTwoPoint: 0,
        redThreePoint: 0,
        blueDunk: 0,
        blueTwoPoint: 0,
        blueThreePoint: 0,
    });
    const [teamState, setTeamState] = useState<{ red: { cname: string; ename: string; }; blue: { cname: string; ename: string; }; }>({
        red: { cname: "征龍", ename: "War Dragon" },
        blue: { cname: "火之龍", ename: "Fiery Dragon" }
    });
    const [syncGameSettings, setSyncGameSettings] = useState<any>({ stages: { PREP: 60, GAME: 120, END: 0 } });
    const syncGameSettingsRef = useRef(syncGameSettings);

    useEffect(() => {
        syncGameSettingsRef.current = syncGameSettings;
    }, [syncGameSettings]);

    // GameProps Main Scoring Function
    const [scores, setScores] = useState({ redPoints: 0, bluePoints: 0 });
    const greateVictoryRef = useRef<boolean>(false);

    const scoreCalculation = () => {
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;

        /*
        6.7.1 Points will be awarded for successful shots based on the shooting zone and
            shooting types as follows:
     
            6.7.1.1 Three (3) points for a shot made from the 3-point zone. The robot's base
            perimeter must be fully within the 3-point zone before, during and after
            the shot including space above the zone.
     
            6.7.1.2 Two (2) points for a shot that are neither a 3-point shot nor a dunk shot.
     
            6.7.1.3 Seven (7) points for a dunk shot. 
     
        9.4.3 The offensive team will be awarded points from the designated zone where the
            foul occurred. These points will not count as a successful shot attempt.
     
            9.4.3.1 If the fouled robot’s base perimeter is fully within the 3-point zone
            including space above, or the robot’s base perimeter is on the centerline,
            the offensive team will be awarded three (3) points.
     
            9.4.3.2 If the fouled robot’s base perimeter is in the 2-point zone, the offensive
            team will be awarded two (2) points.
     
            9.4.3.3 If the fouled robot is performing a dunk shoot, the offensive team will
            be awarded seven (7) points.
        */

        let redPoints = 0;
        let bluePoints = 0;

        redPoints += (itemsYMap.get("redTwoPoint") || 0) * 2;
        redPoints += (itemsYMap.get("redThreePoint") || 0) * 3;
        redPoints += (itemsYMap.get("redDunk") || 0) * 7;

        bluePoints += (itemsYMap.get("blueTwoPoint") || 0) * 2;
        bluePoints += (itemsYMap.get("blueThreePoint") || 0) * 3;
        bluePoints += (itemsYMap.get("blueDunk") || 0) * 7;


        setScores({ redPoints, bluePoints });
        return { redPoints, bluePoints }
    }


    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    gameProps.observeDeep(() => {
        const teamYMap = gameProps.get("teams") as { red: { cname: string; ename: string; }; blue: { cname: string; ename: string; }; };
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const settingsYMap = gameProps.get("settings") as Y.Map<any>;
        setTeamState(teamYMap);
        setHistoryState(historyYArray.toJSON());
        setItemsState(itemsYMap.toJSON());
        setSyncGameSettings(settingsYMap.toJSON());

        scoreCalculation();
    });

    const updateTeam = (value: any, side: string): void => {
        const teamYMap = gameProps.get("teams") as { red: { cname: string; ename: string; }; blue: { cname: string; ename: string; }; };
        let teams: { [key: string]: any } = teamYMap;
        teams[side] = value;
        gameProps.set("teams", teams);
        console.log(teams)
    }

    const ballScoring = (item: string, value: number, team: string, historyTime?: string) => {
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string; }>;
        // Validation
        if (value < 0) return;
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }
        if (!possessionClockData.get("paused") as boolean) {
            toast({
                title: "No editing during possession change.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        if ((itemsYMap.get(`${team}${item}`) as number) > value) {
            const indicesToDelete: number[] = [];

            historyYArray.forEach((val, index) => {
                if (val.action.startsWith(`${item}`) && val.team === team) {
                    if (Number(val.action.split(" ")[1]) >= value) {
                        indicesToDelete.push(index);
                    }
                }
            });

            for (let i = indicesToDelete.length - 1; i >= 0; i--) {
                historyYArray.delete(indicesToDelete[i], 1);
            }
        }

        if (value > 0) {
            historyYArray.push([{ action: `${item} ${value}`, time: historyTime || elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: team }])
        }
        itemsYMap.set(`${team}${item}`, value);

        if (clockData.get("stage") as string === "GAME") {
            startPossessionClock();
        }
    }
    // [Core] End of GameProps Functions and States


    // [Core] Start of Helper Functions and States
    const forceReset = () => {
        forceStopSound();
        setScores({ redPoints: 0, bluePoints: 0 });

        ydoc.transact((_y) => {
            // Clearing the map helps prevent memory leak due to removed past history ٩(´•⌢•｀ )۶⁼³₌₃
            clockData.clear()
            gameProps.clear()

            clockData.set("stage", "PREP")
            clockData.set("timestamp", 0)
            clockData.set("elapsed", 0)
            clockData.set("paused", true)
            clockData.set("stageTrigger", false)
            clockData.set("init", true)

            redShotClockData.clear()
            blueShotClockData.clear()
            possessionClockData.clear()
            possessionData.clear()

            redShotClockData.set("timestamp", 0)
            redShotClockData.set("elapsed", 0)
            redShotClockData.set("paused", true)
            redShotClockData.set("init", true)

            blueShotClockData.set("timestamp", 0)
            blueShotClockData.set("elapsed", 0)
            blueShotClockData.set("paused", true)
            blueShotClockData.set("init", true)

            possessionClockData.set("timestamp", 0)
            possessionClockData.set("elapsed", 0)
            possessionClockData.set("paused", true)
            possessionClockData.set("firstPossession", true)
            possessionClockData.set("init", true)

            possessionData.set("currentPossession", "possession")
            possessionData.set("nextPossession", "red")
            possessionData.set("init", true)

            gameProps.set("teams", { "red": { "cname": "征龍", "ename": "War Dragon" }, "blue": { "cname": "火之龍", "ename": "Fiery Dragon" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redDunk", 0);
            gamePropsItems.set("redTwoPoint", 0);
            gamePropsItems.set("redThreePoint", 0);
            gamePropsItems.set("blueDunk", 0);
            gamePropsItems.set("blueTwoPoint", 0);
            gamePropsItems.set("blueThreePoint", 0);
            gameProps.set("items", gamePropsItems);

            const gamePropsSettings = new Y.Map() as Y.Map<any>;
            gamePropsSettings.set("stages", gameSettings.stages);
            gameProps.set("settings", gamePropsSettings);

            gameProps.set("init", true)
        })
    }
    // [Core] End of Helper Functions and States

    const openSettingModal = () => {
        const settingsYMap = gameProps.get("settings") as Y.Map<any>;
        setSyncGameSettings(settingsYMap.toJSON());
        setGameSettingsModal(true);
    }

    const nicknameInputRef = useRef<HTMLInputElement>(null);
    const [nicknamePopover, setNicknamePopover] = useState(false);

    const handleNicknameChange = () => {
        if (nicknameInputRef.current) {
            const newNickname = nicknameInputRef.current.value.trim();
            if (newNickname) {
                setGameSettings((prev: any) => ({ ...prev, device: { ...prev.device, nickname: newNickname } }));
                yJsClient && yJsClient.getYPartyProvider().awareness.setLocalStateField("nickname", newNickname);
                setNicknamePopover(false);
            }
        } else {
            setNicknamePopover(false)
        }

    }

    return (
        <>
            <Grid
                h={containerHeight}
                templateRows='repeat(7, 1fr)'
                templateColumns='repeat(4, 1fr)'
                bgColor={"gray.600"}
                overflow={"hidden"}
                fontFamily={"Quicksand Variable, Noto Sans TC Variable, sans-serif"}
                fontWeight={"700"}
                fontSize={"2rem"}
                onContextMenu={(e: any) => e.preventDefault()}
            >

                <GridItem rowSpan={1} colSpan={1} m={"1vw"}>
                    <Box fontSize={"0.6em"} textColor={"white"}>
                        <Flex flexDir="row">
                            <Text userSelect="none">{"GameID:"}</Text>
                            <Text
                                cursor="pointer"
                                textShadow="0 0 16px white"
                                color="transparent"
                                _hover={{ textShadow: "none", color: "white" }}
                                onClick={() => {
                                    navigator.clipboard.writeText(gameID).then(() =>
                                        toast({ title: "GameID Copied!", status: "success", duration: 1000 })
                                    );
                                }}
                            >
                                {gameID}
                            </Text>
                        </Flex>
                        <Button onClick={forceReset} colorScheme="red" size="sm" >
                            Force Reset
                        </Button>
                    </Box>
                </GridItem>
                <GridItem rowSpan={2} colSpan={2} m={"1vw"} textColor={"white"}>
                    <TimerBox
                        timeText={clockText}
                        gameStage={clockStage}
                        clockToggle={!clockPaused}
                        hidden={false}
                        shorthand={true}
                        toggleClock={toggleClock}
                        resetStage={resetStage}
                        changeStage={changeStage}
                    />
                </GridItem>
                <GridItem rowSpan={1} colSpan={1} m={"1vw"}>
                    <Box textAlign={"end"} fontSize={"0.6em"} textColor={"white"}>
                        <Text textColor={onlineStatus == 1 ? 'lightgreen' : onlineStatus == 0 ? 'lightcoral' : 'orange'} userSelect={"none"} onClick={() => { onlineStatus == 2 && setTimeOffsetModal(true) }} style={{ cursor: onlineStatus == 2 ? "pointer" : "auto" }}>
                            {onlineStatus == 1 ? "Connected" : onlineStatus == 0 ? "Disconnected" : "Large Time Diff"} <FontAwesomeIcon icon={faCircleDot} />
                        </Text>
                        <Flex flexDirection={"column"} textAlign={"end"} alignSelf={"end"} alignItems={"end"} rowGap={"0.3rem"}>
                            <Button onClick={openSettingModal} colorScheme="green" size="sm">Game Setting</Button>
                            <Button as="a" href="/feedback" target="_blank" colorScheme="green" size="sm">Feedback</Button>
                        </Flex>
                    </Box>
                </GridItem>

                <GridItem rowSpan={6} colSpan={1} m={"1vw"} mr={0}>
                    <Flex flexDirection={"column"} gap={5} alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <ScoreDisplay color={"blue"} team={teamState.blue} editable={true} score={scores.bluePoints} setTeam={updateTeam} />
                        <HistoryList history={historyState} color={"blue"} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={6} colSpan={1} m={"1vw"} ml={0}>
                    <Flex flexDirection={"column"} gap={5} alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <ScoreDisplay color={"red"} team={teamState.red} editable={true} score={scores.redPoints} setTeam={updateTeam} />
                        <HistoryList history={historyState} team="RED" color={"red"} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={1} colSpan={2} m={"1vw"}>
                    <Flex flexDir={"row"} justifyContent={"space-between"}>
                        <ShotClock color={"blue"} timeText={blueShotClockText} startClock={startBlueShotClock} resetClock={resetBlueShotClock} clockPaused={blueShotClockPaused} possessionClockPaused={possessionClockPaused} possessionData={possessionData} smDevice={gameSettings.layout.smDevice} />
                        <PossessionClock timeText={possessionClockText} startClock={startPossessionClock} resetClock={resetPossessionClock} clockPaused={possessionClockPaused} smDevice={gameSettings.layout.smDevice} />
                        <ShotClock color={"red"} timeText={redShotClockText} startClock={startRedShotClock} resetClock={resetRedShotClock} clockPaused={redShotClockPaused} possessionClockPaused={possessionClockPaused} possessionData={possessionData} smDevice={gameSettings.layout.smDevice} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={5} colSpan={2} m={"1vw"}>
                    <Flex alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <Box position="relative" width="100%" height="100%">
                            <Image
                                src="/GameField.png"
                                alt="Field"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                }}
                            />
                            <Box
                                position="absolute"
                                left="20%"
                                top="50%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redDunk} setCounter={(val: number) => ballScoring("Dunk", val, "red")} color={"red"} smDevice={gameSettings.layout.smDevice} />
                            </Box>
                            <Box
                                position="absolute"
                                left="20%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redTwoPoint} setCounter={(val: number) => ballScoring("TwoPoint", val, "red")} color={"red"} smDevice={gameSettings.layout.smDevice} />
                            </Box>
                            <Box
                                position="absolute"
                                left="40%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redThreePoint} setCounter={(val: number) => ballScoring("ThreePoint", val, "red")} color={"red"} smDevice={gameSettings.layout.smDevice} />
                            </Box>
                            <Box
                                position="absolute"
                                right="15%"
                                top="50%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueDunk} setCounter={(val: number) => ballScoring("Dunk", val, "blue")} color={"blue"} smDevice={gameSettings.layout.smDevice} />
                            </Box>
                            <Box
                                position="absolute"
                                right="15%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueTwoPoint} setCounter={(val: number) => ballScoring("TwoPoint", val, "blue")} color={"blue"} smDevice={gameSettings.layout.smDevice} />
                            </Box>
                            <Box
                                position="absolute"
                                right="35%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueThreePoint} setCounter={(val: number) => ballScoring("ThreePoint", val, "blue")} color={"blue"} smDevice={gameSettings.layout.smDevice} />
                            </Box>
                        </Box>
                    </Flex>
                </GridItem>

            </Grid>



            <Modal isOpen={gameIDModal} onClose={() => { }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Connect to Game Room</ModalHeader>
                    <ModalBody>
                        <Input placeholder="Game ID or leave blank to create new game" ref={gameIDInput} />
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme='blue' mr={3} onClick={() => { submitGameID(gameIDInput.current?.value || String(Math.floor(10000000 + Math.random() * 90000000))); }}>
                            Submit
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 
            <Modal isOpen={false} onClose={() => { }} isCentered size={"lg"}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>⚠️WARNING!⚠️</ModalHeader>
                    <ModalBody>
                        <Text>Scoreboard is still on beta! Changes to layout and interaction are expected.</Text>
                        <Text>This is uncharted territory, please report any bugs or issues to the developer.</Text>
                        <Text fontSize={"1.2em"} fontWeight={"bold"}>You have been warned.</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme='red' mr={3} onClick={() => { setWarningModal(false) }}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal> */}

            <Modal isOpen={timeOffsetModal} onClose={() => { }} isCentered size={"lg"}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Large Time Difference</ModalHeader>
                    <ModalBody>
                        <Text>We have detected a large time difference between your device and the server.</Text>
                        <Text>We have temporarily adjusted the clock to match the server time.</Text>
                        <Text>However, this method is not as accurate as changing the system to sync with an NTP server.</Text>
                        <Text>Please consult Google or person with technical knowledge to adjust your system time.</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme='red' mr={3} onClick={() => { setTimeOffsetModal(false) }}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={changeLogsModal} onClose={() => { }} isCentered size={"lg"} scrollBehavior={"inside"}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Change Log</ModalHeader>
                    <ModalBody>
                        {changeLogs.map((log, index) => {
                            return (
                                <Box key={index} mb={"1rem"}>
                                    <Text fontSize={"0.8em"} as={"sub"}>{log.version}</Text>
                                    <Text fontWeight={"bold"}>{log.date}</Text>
                                    <ReactMarkdown className={"markdown"} components={MarkdownComponents}>
                                        {log.content}
                                    </ReactMarkdown>
                                    <Text fontSize={"1.1em"} as={"i"}>- {log.author}</Text>
                                </Box>
                            )
                        })}
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme='teal' mr={3} onClick={() => { setGameSettings({ ...gameSettings, changeLogs: changeLogs[0].internalCode }); setChangeLogsModal(false); }}>
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal >

            <Modal isOpen={gameSettingsModal} onClose={() => { setGameSettingsModal(false) }} isCentered size={"lg"}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Game Settings</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Accordion allowToggle>
                            <AccordionItem>
                                <h2>
                                    <AccordionButton>
                                        <Box as='span' flex='1' textAlign='left'>
                                            Sounds
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel>
                                    <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.sounds.preGameCountdown} onChange={() => { setGameSettings({ ...gameSettings, sounds: { ...gameSettings.sounds, preGameCountdown: !gameSettings.sounds.preGameCountdown } }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>PreGame 3s Countdown Sound Effect</Box></Flex>
                                    <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.sounds.endGameCountdown} onChange={() => { setGameSettings({ ...gameSettings, sounds: { ...gameSettings.sounds, endGameCountdown: !gameSettings.sounds.endGameCountdown } }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>EndGame 10s Countdown Sound Effect</Box></Flex>
                                    <br />
                                    <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.sounds.shotClock8sTone} onChange={() => { setGameSettings({ ...gameSettings, sounds: { ...gameSettings.sounds, shotClock8sTone: !gameSettings.sounds.shotClock8sTone } }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>ShotClock 8s Tone</Box></Flex>
                                    <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.sounds.shotClockEndTone} onChange={() => { setGameSettings({ ...gameSettings, sounds: { ...gameSettings.sounds, shotClockEndTone: !gameSettings.sounds.shotClockEndTone } }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>ShotClock/PossessionClock End Tone</Box></Flex>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <h2>
                                    <AccordionButton>
                                        <Box as='span' flex='1' textAlign='left'>
                                            Layout
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel>
                                    <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.layout.smDevice} onChange={() => { setGameSettings({ ...gameSettings, layout: { ...gameSettings.layout, smDevice: !gameSettings.layout.smDevice } }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>Enable Helper Button</Box></Flex>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <h2>
                                    <AccordionButton>
                                        <Box as='span' flex='1' textAlign='left'>
                                            Game Stages
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel>
                                    <TableContainer>
                                        <Table>
                                            <Thead>
                                                <Tr>
                                                    <Th>Stage</Th>
                                                    <Th>Duration</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {Object.keys(syncGameSettings.stages).map((stage, index) => {
                                                    return (
                                                        <Tr key={index}>
                                                            <Td p={"0.5rem"}>{stage}</Td>
                                                            <Td p={"0.5rem"}>
                                                                <NumberInput min={0} max={999} w={"5rem"} size={"sm"} value={Number(syncGameSettings.stages[stage as keyof typeof syncGameSettings.stages])}
                                                                    onChange={(value: any) => {
                                                                        ydoc.transact((_y: any) => {
                                                                            const gamePropsSettings = gameProps.get("settings") as Y.Map<any>;
                                                                            gamePropsSettings.set("stages", { ...gamePropsSettings.toJSON().stages, [stage]: Number(value) });
                                                                        })
                                                                    }}
                                                                >
                                                                    <NumberInputField />
                                                                    <NumberInputStepper>
                                                                        <NumberIncrementStepper />
                                                                        <NumberDecrementStepper />
                                                                    </NumberInputStepper>
                                                                </NumberInput>
                                                            </Td>
                                                        </Tr>
                                                    )
                                                })}
                                            </Tbody>
                                        </Table>
                                    </TableContainer>
                                    <Button mt={"0.5rem"} onClick={() => { setGameSettings({ ...gameSettings, stages: { ...gameProps.get("settings").toJSON()["stages"] } }) }} colorScheme="purple" size={"sm"}>Save as preference</Button>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <h2>
                                    <AccordionButton>
                                        <Box as='span' flex='1' textAlign='left'>
                                            Room
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel>
                                    <Box>
                                        <Popover isOpen={nicknamePopover} onClose={() => { setNicknamePopover(false) }}>
                                            <PopoverTrigger>
                                                <Button size="sm" onClick={() => { setNicknamePopover((prev) => !prev) }} py={2}>Change Nickname</Button>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                                <PopoverArrow />
                                                <PopoverBody>
                                                    <Input
                                                        ref={nicknameInputRef}
                                                        placeholder="New nickname"
                                                        size="sm"
                                                        mb={2}
                                                    />
                                                    <Button size="sm" onClick={handleNicknameChange}>Save</Button>
                                                </PopoverBody>
                                            </PopoverContent>
                                        </Popover>
                                        <SimpleGrid columns={2} spacing={4} py={2}>
                                            {roomClient.map((client: any, index: number) => (
                                                <Flex
                                                    key={index}
                                                    alignItems="center"
                                                    bg="gray.50"
                                                    p={3}
                                                    borderRadius="md"
                                                    boxShadow="sm"
                                                    transition="all 0.3s"
                                                    _hover={{ bg: "gray.100", transform: "translateY(-2px)" }}
                                                >
                                                    <Box
                                                        borderRadius="full"
                                                        overflow="hidden"
                                                        boxSize="40px"
                                                        mr={3}
                                                        boxShadow="md"
                                                        flexShrink={0}
                                                    >
                                                        <Image
                                                            src={`data:image/svg+xml;utf8,${generateFromString(client.uuid)}`}
                                                            alt={`${client.nickname}'s avatar`}
                                                        />
                                                    </Box>
                                                    <Text fontWeight="medium" fontSize="sm" isTruncated>
                                                        {client.nickname}
                                                    </Text>
                                                </Flex>
                                            ))}
                                        </SimpleGrid>
                                    </Box>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <h2>
                                    <AccordionButton>
                                        <Box as='span' flex='1' textAlign='left'>
                                            Advance
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel>
                                    <Button onClick={() => { navigator.clipboard.writeText(JSON.stringify(gameProps.toJSON())).then(() => toast({ title: "GameProps Copied!", status: "success", duration: 1000 })) }} colorScheme="blue" size={"sm"} m={"0.5em"}>Copy Game Props</Button>
                                    <Button onClick={() => { setChangeLogsModal(true) }} colorScheme="teal" size={"sm"} m={"0.5em"}>Change Logs</Button>
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>


                    </ModalBody>

                    {/* <ModalFooter>
                        {buildVersion ? <Text fontSize={"0.75rem"}>Version: {(buildVersion as string).substring(0, 6)}</Text> : <Text fontSize={"0.75rem"}>Version: Development</Text>}
                    </ModalFooter> */}

                </ModalContent>
            </Modal >
        </>
    )
}
