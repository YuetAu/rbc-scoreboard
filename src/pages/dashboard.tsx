'use client'

import { FIRST_POSSESSION, GAME_STAGES, GAME_STAGES_TIME, POSSESSION, SHOTCLOCK } from "@/common/gameStages";
import { Counter } from "@/props/dashboard/Counter";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import { PossessionClock, ShotClock } from "@/props/dashboard/ShotClock";
import TimerBox from "@/props/dashboard/TimerBox";
import { YJsClient } from "@/yjsClient/yjsClient";
import { Box, Button, Flex, Grid, GridItem, Image, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Radio, RadioGroup, Stack, Switch, Table, TableContainer, Tbody, Td, Text, Textarea, Th, Thead, Tr, useToast } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import Head from 'next/head';
import { faCircleDot, faVideoCamera } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import Teams from "../props/dashboard/teams.json";


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


    // [Core] GameID Functions and States
    const [gameID, setGameID] = useState("");
    const [gameIDModal, setGameIDModal] = useState(true);
    const gameIDInput = useRef<HTMLInputElement>(null);
    const [ydoc, setYDoc] = useState<Y.Doc>(new Y.Doc());
    const [onlineStatus, setOnlineStatus] = useState(0);

    const submitGameID = (gameID?: string) => {
        if (gameID) {
            const yJsClient = new YJsClient(gameID);
            setGameID(gameID);
            setYDoc(yJsClient.getYDoc());
            setClockData(yJsClient.getYDoc().getMap("clockData") as Y.Map<any>);
            setGameProps(yJsClient.getYDoc().getMap("gameProps") as Y.Map<any>);
            setRedShotClockData(yJsClient.getYDoc().getMap("redShotClockData") as Y.Map<any>);
            setBlueShotClockData(yJsClient.getYDoc().getMap("blueShotClockData") as Y.Map<any>);
            setPossessionClockData(yJsClient.getYDoc().getMap("possessionClockData") as Y.Map<any>);
            setPossessionData(yJsClient.getYDoc().getMap("possessionData") as Y.Map<any>);
            setGameIDModal(false);
            yJsClient.getYPartyProvider().on("status", connectionEventHandler);
        }
    }

    const connectionEventHandler = (event: any) => {
        if (event.status == "connected") {
            setOnlineStatus(1);
        } else {
            setOnlineStatus(0);
        }
    }

    // [Features] GameSetting Functions and States
    const isFirstReadSettings = useRef(false);
    const [gameSettingsModal, setGameSettingsModal] = useState(false);
    const [gameSettings, setGameSettings] = useState({ preGameCountdown: true, endGameCountdown: true });

    useEffect(() => {
        const localGameSettings = localStorage.getItem("gameSettings");
        if (localGameSettings && !isFirstReadSettings.current) {
            setGameSettings(JSON.parse(localGameSettings));
            isFirstReadSettings.current = true;
        } else {
            localStorage.setItem("gameSettings", JSON.stringify(gameSettings));
        }
    }, [gameSettings]);

    // [Features] Start of Sound Functions
    const [countdownBeep, setCountdownBeep] = useState<any>(null);
    const [countdownBeep10, setCountdownBeep10] = useState<any>(null);
    const [pop, setPop] = useState<any>(null);
    useEffect(() => {
        setCountdownBeep(new Audio("/sound/countdown.mp3"));
        setCountdownBeep10(new Audio("/sound/countdown10.mp3"));
        setPop(new Audio("/sound/pop.mp3"));
    }, [])

    const soundCheck = (stage: string, remainingTime: number) => {
        switch (stage) {
            case "PREP":
                if (remainingTime <= 3000 && countdownBeep && countdownBeep.paused && gameSettings.preGameCountdown) {
                    countdownBeep.paused && countdownBeep.play();
                }
                break;
            case "GAME":
                if (remainingTime <= 10000 && countdownBeep10 && countdownBeep10.paused && gameSettings.endGameCountdown) {
                    countdownBeep10.currentTime = (10000 - remainingTime) / 1000;
                    countdownBeep.paused && countdownBeep10.play();
                }
                break;
            case "END":
                break;
        }
    }

    const stopSound = () => {
        //countdownBeep && countdownBeep.pause(); // Ignore countdownBeep to passthough last second beep
        countdownBeep10 && countdownBeep10.pause();
    }

    const forceStopSound = () => {
        if (countdownBeep && !countdownBeep.paused) {
            countdownBeep.pause();
            countdownBeep.currentTime = 0;
        }
        if (countdownBeep10 && !countdownBeep10.paused) {
            countdownBeep10.pause();
            countdownBeep10.currentTime = 0;
        }
        if (pop && !pop.paused) {
            pop.pause();
            pop.currentTime = 0;
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
        const elapsedTime = clockData.get("paused") ? clockData.get("elapsed") as number : (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
        const remainingTime = clockData.get("paused") ? (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) : (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
        // Check if still have remaining time in the current stage
        if (remainingTime >= 0) {

            // Check if the stage is just started
            if (!clockData.get("stageTrigger")) {
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
            const remainingMilliseconds = remainingTime % 1000 + "";
            setClockText({
                minutes: remainingMinutes.length < 2 ? "0" + remainingMinutes : remainingMinutes,
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 3 ? remainingMilliseconds.length < 2 ? "00" + remainingMilliseconds : "0" + remainingMilliseconds : remainingMilliseconds
            })

            // Calculate elapsedTime from seconds to human-readable text
            // For history entries
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = elapsedTime % 1000 + "";
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

            // Check if still have stage
            if (GAME_STAGES.indexOf(clockData.get("stage") as string) + 1 < GAME_STAGES.length) {
                // Get the new stage name and remaining time
                const newGameStage = GAME_STAGES[GAME_STAGES.indexOf(clockData.get("stage") as string) + 1];
                console.log(`Resetting Timer for ${newGameStage}`);
                const remainingTime = GAME_STAGES_TIME[GAME_STAGES.indexOf(newGameStage)] * 1000;
                ydoc.transact((_y) => {
                    clockData.set("stage", newGameStage);
                    clockData.set("timestamp", Date.now());
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
            }
        }
    }

    // [Core] Clock Listener
    // It will trigger everytime clockData has changed locally or from remote
    clockData.observeDeep(updateClockText);

    // [Core] Start of Clock Helper Function
    const startClock = () => {
        console.log("Clock Started")
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
            clockData.set("elapsed", clockData.get("elapsed") as number);
            clockData.set("stageTrigger", clockData.get("stageTrigger") as boolean);
            clockData.set("paused", false);
        })

        if (clockData.get("stage") == "GAME") {
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
        const elapsed = (Date.now() - (clockData.get("timestamp") as number)) + (clockData.get("elapsed") as number)
        ydoc.transact((_y) => {
            clockData.set("stage", clockData.get("stage") as string);
            clockData.set("timestamp", Date.now());
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
        setTimeout(() => { stopSound(); }, 50);
        setTimeout(() => { stopSound(); }, 100);

        // Clear interval if paused
        clearInterval(clockInterval.current);
        clockInterval.current = null;
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
            clockData.set("stageTrigger", false);
            clockData.set("paused", true);

            redShotClockData.set("timestamp", Date.now());
            redShotClockData.set("elapsed", 0);
            redShotClockData.set("paused", true);

            blueShotClockData.set("timestamp", Date.now());
            blueShotClockData.set("elapsed", 0);
            blueShotClockData.set("paused", true);

            possessionClockData.set("timestamp", Date.now());
            possessionClockData.set("elapsed", 0);
            possessionClockData.set("paused", true);
        })
        toast({
            title: `Reset stage ${clockData.get("stage") as string}`,
            status: 'success',
            duration: 1000,
        })
    }

    const changeStage = (skipStage: number) => {
        const index = GAME_STAGES.indexOf(clockData.get("stage") as string);
        if (index + skipStage < 0) { stopClock(); return; }
        if (index + skipStage > GAME_STAGES.length - 1) { stopClock(); return; }
        const nextStage = GAME_STAGES[index + skipStage];
        const remainingTime = GAME_STAGES_TIME[index + skipStage] * 1000;
        console.log(`Skip stage to ${nextStage}`);
        ydoc.transact((_y) => {
            clockData.set("stage", nextStage);
            clockData.set("timestamp", Date.now());
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

    const [redShotClockText, setRedShotClockText] = useState({ seconds: "00" });
    const [blueShotClockText, setBlueShotClockText] = useState({ seconds: "00" });
    const [possessionClockText, setPossessionClockText] = useState({ seconds: "00" });
    const redShotClockInterval = useRef<any>(null);
    const blueShotClockInterval = useRef<any>(null);
    const possessionClockInterval = useRef<any>(null);

    const [redShotClockPaused, setRedShotClockPaused] = useState(true);
    const [blueShotClockPaused, setBlueShotClockPaused] = useState(true);
    const [possessionClockPaused, setPossessionClockPaused] = useState(true);

    const [nextPossession, setNextPossession] = useState("red");
    const [currentPossession, setCurrentPossession] = useState("possession");

    const updateRedShotClockText = () => {
        setRedShotClockPaused(redShotClockData.get("paused") as boolean);

        const remainingTime = redShotClockData.get("paused") ? (SHOTCLOCK * 1000) - (redShotClockData.get("elapsed") as number) : (SHOTCLOCK * 1000) - (redShotClockData.get("elapsed") as number) - (Date.now() - (redShotClockData.get("timestamp") as number));
        if (remainingTime >= 0) {
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            setRedShotClockText({
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
            })
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
            clearInterval(redShotClockInterval.current);
            if (redShotClockInterval.current != null) {
                ydoc.transact((_y) => {
                    redShotClockData.set("timestamp", Date.now());
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

        const remainingTime = blueShotClockData.get("paused") ? (SHOTCLOCK * 1000) - (blueShotClockData.get("elapsed") as number) : (SHOTCLOCK * 1000) - (blueShotClockData.get("elapsed") as number) - (Date.now() - (blueShotClockData.get("timestamp") as number));
        if (remainingTime >= 0) {
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            setBlueShotClockText({
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
            })
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
            clearInterval(blueShotClockInterval.current);
            if (blueShotClockInterval.current != null) {
                ydoc.transact((_y) => {
                    blueShotClockData.set("timestamp", Date.now());
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

        const remainingTime = possessionClockData.get("paused") ? ((possessionClockData.get("firstPossession") ? FIRST_POSSESSION : POSSESSION) * 1000) - (possessionClockData.get("elapsed") as number) : ((possessionClockData.get("firstPossession") ? FIRST_POSSESSION : POSSESSION) * 1000) - (possessionClockData.get("elapsed") as number) - (Date.now() - (possessionClockData.get("timestamp") as number));
        if (remainingTime >= 0) {
            const remainingSeconds = Math.floor(remainingTime / 1000 % 60) + "";
            setPossessionClockText({
                seconds: remainingSeconds.length < 2 ? "0" + remainingSeconds : remainingSeconds,
            })
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
        setCurrentPossession(possessionData.get("currentPossession") as string);
        setNextPossession(possessionData.get("nextPossession") as string);
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

                redShotClockData.set("timestamp", Date.now());
                redShotClockData.set("elapsed", redShotClockData.get("elapsed") as number);
                redShotClockData.set("paused", false);
            })
        }
    }

    const stopRedShotClock = () => {
        if (!redShotClockData.get("paused")) {
            ydoc.transact((_y) => {
                const elapsed = (Date.now() - (redShotClockData.get("timestamp") as number)) + (redShotClockData.get("elapsed") as number)
                redShotClockData.set("timestamp", Date.now());
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
            redShotClockData.set("timestamp", Date.now());
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

                blueShotClockData.set("timestamp", Date.now());
                blueShotClockData.set("elapsed", blueShotClockData.get("elapsed") as number);
                blueShotClockData.set("paused", false);
            })
        }
    }

    const stopBlueShotClock = () => {
        if (!blueShotClockData.get("paused")) {
            ydoc.transact((_y) => {
                const elapsed = (Date.now() - (blueShotClockData.get("timestamp") as number)) + (blueShotClockData.get("elapsed") as number)
                blueShotClockData.set("timestamp", Date.now());
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
            blueShotClockData.set("timestamp", Date.now());
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
        if (possessionClockData.get("paused")) {
            setCurrentPossession("possession");
            resetRedShotClock();
            resetBlueShotClock();
            ydoc.transact((_y) => {
                possessionClockData.set("timestamp", Date.now());
                possessionClockData.set("elapsed", possessionClockData.get("elapsed") as number);
                possessionClockData.set("paused", false);
            })
        }
    }

    const stopPossessionClock = () => {
        if (!possessionClockData.get("paused")) {
            ydoc.transact((_y) => {
                const elapsed = (Date.now() - (possessionClockData.get("timestamp") as number)) + (possessionClockData.get("elapsed") as number)
                possessionClockData.set("timestamp", Date.now());
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
            possessionClockData.set("timestamp", Date.now());
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

            gamePropsItems.set("redFoulDunk", 0);
            gamePropsItems.set("redFoulTwoPoint", 0);
            gamePropsItems.set("redFoulThreePoint", 0);
            gamePropsItems.set("blueFoulDunk", 0);
            gamePropsItems.set("blueFoulTwoPoint", 0);
            gamePropsItems.set("blueFoulThreePoint", 0);
            gameProps.set("items", gamePropsItems);


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

        redFoulDunk: 0,
        redFoulTwoPoint: 0,
        redFoulThreePoint: 0,
        blueFoulDunk: 0,
        blueFoulTwoPoint: 0,
        blueFoulThreePoint: 0,
    });
    const [teamState, setTeamState] = useState<{ red: { cname: string; ename: string; }; blue: { cname: string; ename: string; }; }>({
        red: { cname: "征龍", ename: "War Dragon" },
        blue: { cname: "火之龍", ename: "Fiery Dragon" }
    });

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

        redPoints += (itemsYMap.get("blueFoulTwoPoint") || 0) * 2;
        redPoints += (itemsYMap.get("blueFoulThreePoint") || 0) * 3;
        redPoints += (itemsYMap.get("blueFoulDunk") || 0) * 7;


        bluePoints += (itemsYMap.get("blueTwoPoint") || 0) * 2;
        bluePoints += (itemsYMap.get("blueThreePoint") || 0) * 3;
        bluePoints += (itemsYMap.get("blueDunk") || 0) * 7;

        bluePoints += (itemsYMap.get("redFoulTwoPoint") || 0) * 2;
        bluePoints += (itemsYMap.get("redFoulThreePoint") || 0) * 3;
        bluePoints += (itemsYMap.get("redFoulDunk") || 0) * 7;


        setScores({ redPoints, bluePoints });
        return { redPoints, bluePoints }
    }


    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    gameProps.observeDeep(() => {
        const teamYMap = gameProps.get("teams") as { red: { cname: string; ename: string; }; blue: { cname: string; ename: string; }; };
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        setTeamState(teamYMap);
        setHistoryState(historyYArray.toJSON());
        setItemsState(itemsYMap.toJSON());

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
            clockData.set("stageTrigger", false);
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

            gamePropsItems.set("redFoulDunk", 0);
            gamePropsItems.set("redFoulTwoPoint", 0);
            gamePropsItems.set("redFoulThreePoint", 0);
            gamePropsItems.set("blueFoulDunk", 0);
            gamePropsItems.set("blueFoulTwoPoint", 0);
            gamePropsItems.set("blueFoulThreePoint", 0);

            gameProps.set("items", gamePropsItems);

            gameProps.set("init", true)
        })
    }
    // [Core] End of Helper Functions and States


    return (
        <>
            <Head>
                <title>{"Robocon 2025"}</title>
            </Head>

            <Grid
                h={containerHeight}
                templateRows='repeat(7, 1fr)'
                templateColumns='repeat(4, 1fr)'
                bgColor={"gray.600"}
                overflow={"hidden"}
                fontFamily={"Quicksand Variable, sans-serif"}
                fontWeight={"700"}
                fontSize={"2rem"}
                onContextMenu={(e) => e.preventDefault()}
            >

                <GridItem rowSpan={1} colSpan={1} m={"1vw"}>
                    <Box fontSize={"0.7em"} textColor={"white"}>
                        <span style={{ userSelect: "none" }}>GameID: </span>{gameID}
                        <Button onClick={forceReset} colorScheme="red" size="sm" ml={2}>
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
                    <Box textAlign={"end"} fontSize={"0.7em"}>
                        <Text textColor={onlineStatus == 1 ? 'lightgreen' : onlineStatus == 0 ? 'lightcoral' : 'orange'} userSelect={"none"}>
                            {onlineStatus == 1 ? "Connected" : onlineStatus == 0 ? "Disconnected" : "Large Time Diff"} <FontAwesomeIcon icon={faCircleDot} />
                        </Text>
                    </Box>
                </GridItem>

                <GridItem rowSpan={6} colSpan={1} m={"1vw"} mr={0}>
                    <Flex flexDirection={"column"} gap={5} alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <ScoreDisplay color={"blue"} team={teamState.blue} editable={true} score={scores.bluePoints} teams={Teams} setTeam={updateTeam} />
                        <HistoryList history={historyState} color={"blue"} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={6} colSpan={1} m={"1vw"} ml={0}>
                    <Flex flexDirection={"column"} gap={5} alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <ScoreDisplay color={"red"} team={teamState.red} editable={true} score={scores.redPoints} teams={Teams} setTeam={updateTeam} />
                        <HistoryList history={historyState} team="RED" color={"red"} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={1} colSpan={2} m={"1vw"}>
                    <Flex flexDir={"row"} justifyContent={"space-between"}>
                        <ShotClock color={"blue"} timeText={blueShotClockText} startClock={startBlueShotClock} resetClock={resetBlueShotClock} clockPaused={blueShotClockPaused} possessionClockPaused={possessionClockPaused} possessionData={possessionData} />
                        <PossessionClock timeText={possessionClockText} startClock={startPossessionClock} resetClock={resetPossessionClock} />
                        <ShotClock color={"red"} timeText={redShotClockText} startClock={startRedShotClock} resetClock={resetRedShotClock} clockPaused={redShotClockPaused} possessionClockPaused={possessionClockPaused} possessionData={possessionData} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={5} colSpan={2} m={"1vw"}>
                    <Flex alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <Box position="relative" width="100%" height="100%">
                            <Image
                                src="GameField.png"
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
                                <Counter counter={itemsState.redDunk} setCounter={(val: number) => ballScoring("Dunk", val, "red")} color={"red"} />
                            </Box>
                            <Box
                                position="absolute"
                                left="20%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redTwoPoint} setCounter={(val: number) => ballScoring("TwoPoint", val, "red")} color={"red"} />
                            </Box>
                            <Box
                                position="absolute"
                                left="40%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redThreePoint} setCounter={(val: number) => ballScoring("ThreePoint", val, "red")} color={"red"} />
                            </Box>
                            <Box
                                position="absolute"
                                left="33%"
                                top="80%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                                shadow={"lg"} rounded={"lg"} px={"0.5rem"}
                                bgColor={"white"}
                                fontSize={"1rem"}
                                userSelect={"none"}
                            >
                                Red Offending
                            </Box>
                            <Box
                                position="absolute"
                                left="27%"
                                top="50%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redFoulDunk} setCounter={(val: number) => ballScoring("FoulDunk", val, "red")} color={"blue"} />
                            </Box>
                            <Box
                                position="absolute"
                                left="20%"
                                top="33%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redFoulTwoPoint} setCounter={(val: number) => ballScoring("FoulTwoPoint", val, "red")} color={"blue"} />
                            </Box>
                            <Box
                                position="absolute"
                                left="40%"
                                top="33%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.redFoulThreePoint} setCounter={(val: number) => ballScoring("FoulThreePoint", val, "red")} color={"blue"} />
                            </Box>
                            <Box
                                position="absolute"
                                left="33%"
                                top="20%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                                shadow={"lg"} rounded={"lg"} px={"0.5rem"}
                                bgColor={"white"}
                                fontSize={"1rem"}
                                userSelect={"none"}
                            >
                                Red Foul
                            </Box>
                            <Box
                                position="absolute"
                                right="15%"
                                top="50%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueDunk} setCounter={(val: number) => ballScoring("Dunk", val, "blue")} color={"blue"} />
                            </Box>
                            <Box
                                position="absolute"
                                right="15%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueTwoPoint} setCounter={(val: number) => ballScoring("TwoPoint", val, "blue")} color={"blue"} />
                            </Box>
                            <Box
                                position="absolute"
                                right="35%"
                                top="67%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueThreePoint} setCounter={(val: number) => ballScoring("ThreePoint", val, "blue")} color={"blue"} />
                            </Box>
                            <Box
                                position="absolute"
                                right="14%"
                                top="80%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                                shadow={"lg"} rounded={"lg"} px={"0.5rem"}
                                bgColor={"white"}
                                fontSize={"1rem"}
                                userSelect={"none"}
                            >
                                Blue Offending
                            </Box>
                            <Box
                                position="absolute"
                                right="22%"
                                top="50%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueFoulDunk} setCounter={(val: number) => ballScoring("FoulDunk", val, "blue")} color={"red"} />
                            </Box>
                            <Box
                                position="absolute"
                                right="15%"
                                top="33%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueFoulTwoPoint} setCounter={(val: number) => ballScoring("FoulTwoPoint", val, "blue")} color={"red"} />
                            </Box>
                            <Box
                                position="absolute"
                                right="35%"
                                top="33%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                            >
                                <Counter counter={itemsState.blueFoulThreePoint} setCounter={(val: number) => ballScoring("FoulThreePoint", val, "blue")} color={"red"} />
                            </Box>
                            <Box
                                position="absolute"
                                right="20%"
                                top="20%"
                                transform="translate(-50%, -50%) scale(1)"
                                transformOrigin='center'
                                shadow={"lg"} rounded={"lg"} px={"0.5rem"}
                                bgColor={"white"}
                                fontSize={"1rem"}
                                userSelect={"none"}
                            >
                                Blue Foul
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
                        <Button colorScheme='blue' mr={3} onClick={() => submitGameID(gameIDInput.current?.value || String(Math.floor(10000000 + Math.random() * 90000000)))}>
                            Submit
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={gameSettingsModal} onClose={() => { setGameSettingsModal(false) }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Game Settings</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.preGameCountdown} onChange={() => { setGameSettings({ ...gameSettings, preGameCountdown: !gameSettings.preGameCountdown }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>PreGame 3s Countdown Sound Effect</Box></Flex>
                        <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.endGameCountdown} onChange={() => { setGameSettings({ ...gameSettings, endGameCountdown: !gameSettings.endGameCountdown }) }} /> <Box mt={"-0.2rem"} ml={"0.5rem"}>EndGame 10s Countdown Sound Effect</Box></Flex>
                    </ModalBody>

                    <ModalFooter>
                        {props.buildVersion ? <Text fontSize={"0.75rem"}>Version: {(props.buildVersion as string).substring(0, 6)}</Text> : <Text fontSize={"0.75rem"}>Version: Development</Text>}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}

export const getStaticProps = (async () => {
    const buildVersion = process.env.CF_PAGES_COMMIT_SHA || null;
    return { props: { buildVersion } }
})