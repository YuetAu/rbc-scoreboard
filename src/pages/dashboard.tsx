'use client'

import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { ColorPicker } from "@/props/dashboard/ColorPicker";
import { Counter } from "@/props/dashboard/Counter";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import TimerBox from "@/props/dashboard/TimerBox";
import { YJsClient } from "@/yjsClient/yjsClient";
import { Box, Button, Flex, Grid, GridItem, Image, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Radio, RadioGroup, Stack, Switch, Table, TableContainer, Tbody, Td, Text, Textarea, Th, Thead, Tr, useToast } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { faCircleDot, faVideoCamera } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Head from 'next/head';
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


    // [Features] Replay Game Session

    const [replayGameModal, setReplayGameModal] = useState(false);
    const replayGameModalTextArea = useRef<HTMLTextAreaElement>(null);
    const [replayGameInputOption, setReplayGameInputOption] = useState('ALL');
    const [replayGameHistory, setReplayGameHistory] = useState<any[]>([]);
    const replayHistory = useRef<{ timestamp: number; action: string; time: string; team: string; }[]>([]);

    const parseHistory = (historyJSON: string, replayGameInputOption: string) => {
        try {
            var history = (JSON.parse(historyJSON)).history as any[];
            console.log(history)
            history.forEach((entry) => {
                try {
                    let timeText = entry.time.split(":");
                    let minutes = parseInt(timeText[0]);
                    let seconds = parseFloat(timeText[1]);
                    entry.timestamp = (minutes * 60 + seconds) * 1000;
                } catch (error) {
                    throw new Error("Unable to parse time");
                }
            });
            if (replayGameInputOption != "ALL") {
                history = history.filter((entry) => {
                    return entry.team == replayGameInputOption;
                })
            }
            setReplayGameHistory([...history]);
            replayHistory.current = [...history];
            setReplayGameModal(false);
            toast({
                title: "Success",
                description: "Game history loaded successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Unable to parse game history",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
    }

    const replayHistoryHandler = (stage: string, elapsedTime: number) => {
        if (stage === "GAME") {
            if (replayHistory.current[0] && elapsedTime > replayHistory.current[0].timestamp) {
                const team = replayHistory.current[0].team;
                const action = replayHistory.current[0].action.split(" ");
                const keyword = action[0];
                switch (keyword) {
                    case "Seedling":
                        if (team === "RED") {
                            redSeedlingAction(parseInt(action[1]), replayHistory.current[0].time);
                        } else {
                            blueSeedlingAction(parseInt(action[1]), replayHistory.current[0].time);
                        }
                        if (pop) { pop.currentTime = 0; pop.play(); }
                        break;
                    case "StorageZone":
                        if (team === "RED") {
                            redStorageZoneAction(parseInt(action[1]), replayHistory.current[0].time);
                        } else {
                            blueStorageZoneAction(parseInt(action[1]), replayHistory.current[0].time);
                        }
                        if (pop) { pop.currentTime = 0; pop.play(); }
                        break;
                    case "Silo":
                        const x = parseInt(action[1]);

                        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
                        let silo = silosYArray.get(x);

                        // Physics Engine \ō͡≡o˞̶ \ō͡≡o˞̶ \ō͡≡o˞̶
                        let siloHeight = 0;
                        for (let index = 0; index < silo.length; index++) {
                            const val = silo[index];
                            if (val === "NONE") {
                                siloHeight = index;
                                break;
                            }
                            siloHeight = 2;
                        }

                        if (siloHeight < 3) {
                            if (team === "RED") {
                                siloAction(x, 3, "RED", replayHistory.current[0].time);
                            } else {
                                siloAction(x, 3, "BLUE", replayHistory.current[0].time);
                            }
                            if (pop) { pop.currentTime = 0; pop.play(); }
                        }
                        break;
                }
                replayHistory.current.shift();
            }
        }
    }


    // [Features] Game Save and Load Functions

    const isFirstReadGameSave = useRef(false);
    const [gameSaveModal, setGameSaveModal] = useState(false);
    const [gameSaveDictionary, setGameSaveDictionary] = useState<any>({});
    useEffect(() => {
        const localGameSaves = localStorage.getItem("gameSaves");
        if (localGameSaves && !isFirstReadGameSave.current) {
            setGameSaveDictionary(JSON.parse(localGameSaves));
            isFirstReadGameSave.current = true;
        } else {
            localStorage.setItem("gameSaves", JSON.stringify(gameSaveDictionary));
        }
    }, [gameSaveDictionary]);

    const saveCurrentGame = () => {
        const currentGameJson = JSON.stringify(gameProps.toJSON())
        const currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Hong_Kong' });

        if (!gameSaveDictionary[currentDate]) {
            setGameSaveDictionary({ ...gameSaveDictionary, [currentDate]: currentGameJson });
            toast({
                title: "Success",
                description: "Game saved successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
            })
        } else {
            toast({
                title: "Error",
                description: "Game already saved",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
    }

    const removeSavedGame = (gameName: string) => {
        if (gameSaveDictionary[gameName]) {
            const newGameSaveDictionary = { ...gameSaveDictionary };
            if (newGameSaveDictionary[gameName]) {
                delete newGameSaveDictionary[gameName];
            }
            setGameSaveDictionary(newGameSaveDictionary)
            toast({
                title: "Success",
                description: "Game deleted successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
            })
        } else {
            toast({
                title: "Error",
                description: "Game already deleted",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
    }



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

            if (gameProps.get("replay")) { replayHistoryHandler((clockData.get("stage") as string), elapsedTime); }

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
                    //gameEndVictoryCalc();
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
            clockData.set("paused", false);
        })
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
            clockData.set("paused", true);
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


    // [Core] Start of GameProps Functions and States
    const [gameProps, setGameProps] = useState(ydoc.getMap("gameProps") as Y.Map<any>);
    if (gameProps.get("init") == undefined) {
        console.log("Initializing GameProps Data")
        ydoc.transact((_y) => {
            gameProps.set("teams", { "red": { "cname": "征龍", "ename": "War Dragon" }, "blue": { "cname": "火之龍", "ename": "Fiery Dragon" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory);

            const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            gameProps.set("silos", gamePropsSilos);

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redSeedling", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueSeedling", 0);
            gameProps.set("items", gamePropsItems);


            gameProps.set("replay", false);

            gameProps.set("init", true);
        })
    }

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [siloState, setSiloState] = useState([["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]]);
    const [historyState, setHistoryState] = useState<any[]>([]);
    const [itemsState, setItemsState] = useState<any>({
        redStorageZone: 0,
        redSeedling: 0,
        blueStorageZone: 0,
        blueSeedling: 0
    });
    const [teamState, setTeamState] = useState<{ redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; }>({
        redTeam: { cname: "征龍", ename: "War Dragon" },
        blueTeam: { cname: "火之龍", ename: "Fiery Dragon" }
    });

    // GameProps Main Scoring Function
    const [scores, setScores] = useState({ redPoints: 0, bluePoints: 0 });
    const greateVictoryRef = useRef<boolean>(false);

    const scoreCalculation = () => {
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        /*
        The score is calculated as follows:
        (a) Robots successfully plant 01 (one) Seedling: 10 points.
        (b) Robots successfully harvest 01 (one) Paddy Rice in the Storage Zone: 10
        points.
        (c) Robots successfully harvest 01 (one) Empty Grain in the Storage Zone: 10
        points.
        (d) The Robot 2 successfully stores 01 (one) Paddy Rice in a Silo: 30 points. 
        */

        let redPoints = 0;
        let bluePoints = 0;

        redPoints += (itemsYMap.get("redSeedling") || 0) * 10;
        bluePoints += (itemsYMap.get("blueSeedling") || 0) * 10;

        redPoints += (itemsYMap.get("redStorageZone") || 0) * 10;
        bluePoints += (itemsYMap.get("blueStorageZone") || 0) * 10;

        silosYArray?.forEach((silo: string[]) => {
            silo.forEach((color: string) => {
                if (color == "RED") redPoints += 30;
                if (color == "BLUE") bluePoints += 30;
            })
        });

        /*
        ‘V Goal’ “Mùa Vàng” (Harvest Glory) is achieved when 3 Silos
        meeting following conditions.
        + A Silo is full (3) and contains a minimum of 2 own team color’s
        Paddy Rice.
        + The top Paddy Rice is of the team’s colour.
        The team wins at the moment when Mua Vang is achieved.
        */

        let redOccoupiedSilos = 0;
        let blueOccoupiedSilos = 0;

        silosYArray?.forEach((silo: string[]) => {
            const siloArray = silo;
            const lastElement = siloArray[siloArray.length - 1];

            if (lastElement === "RED" && siloArray.filter((color: String) => color === "RED").length >= 2 && siloArray.length == 3) {
                redOccoupiedSilos++;
            } else if (lastElement === "BLUE" && siloArray.filter((color: String) => color === "BLUE").length >= 2 && siloArray.length == 3) {
                blueOccoupiedSilos++;
            }
        })

        if (greateVictoryRef.current) {
            setScores({ redPoints, bluePoints });
            return { redPoints, bluePoints, redGreatVictory: false, blueGreatVictory: false, greatVictoryTimestamp: 0 }
        }

        let greatVictoryObject = { redGreatVictory: false, blueGreatVictory: false, greatVictoryTimestamp: 0 }

        if (redOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
            const elapsedTime = (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = elapsedTime % 1000 + "";
            const elapsedText = {
                minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
            }
            toast({
                title: "RED GREAT VICTORY",
                status: 'success',
                position: 'bottom-left',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            if (historyYArray.get(historyYArray.length - 1)?.action !== `RED GreatVictory`) historyYArray.push([{ action: `GreatVictory`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }]);
            greatVictoryObject = { redGreatVictory: true, blueGreatVictory: false, greatVictoryTimestamp }
            stopClock();
        } else if (blueOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(clockData.get("stage") as string)] * 1000) - (clockData.get("elapsed") as number) - (Date.now() - (clockData.get("timestamp") as number));
            const elapsedTime = (clockData.get("elapsed") as number) + (Date.now() - (clockData.get("timestamp") as number));
            const elapsedMinutes = Math.floor(elapsedTime / 60000) + "";
            const elapsedSeconds = Math.floor(elapsedTime / 1000 % 60) + "";
            const elapsedMilliseconds = elapsedTime % 1000 + "";
            const elapsedText = {
                minutes: elapsedMinutes.length < 2 ? "0" + elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0" + elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00" + elapsedMilliseconds : "0" + elapsedMilliseconds : elapsedMilliseconds
            }
            toast({
                title: "BLUE GREAT VICTORY",
                status: 'success',
                position: 'bottom-right',
                duration: 5000,
            })
            greateVictoryRef.current = true;
            if (historyYArray.get(historyYArray.length - 1)?.action !== `BLUE GreatVictory`) historyYArray.push([{ action: `GreatVictory`, time: elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
            greatVictoryObject = { redGreatVictory: true, blueGreatVictory: true, greatVictoryTimestamp }
            stopClock();
        }

        setScores({ redPoints, bluePoints });
        return { redPoints, bluePoints, ...greatVictoryObject }
    }


    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    gameProps.observeDeep(() => {

        const teamYMap = gameProps.get("teams") as { redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; };
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const itemsYMap = gameProps.get("items") as Y.Map<number>;
        setTeamState(teamYMap);
        setHistoryState(historyYArray.toJSON());
        setSiloState(silosYArray.toJSON());
        setItemsState(itemsYMap.toJSON());

        scoreCalculation();
    });

    const updateTeam = (value: any, side: string): void => {
        const teamYMap = gameProps.get("teams") as { red: { cname: string; ename: string; }; blue: { cname: string; ename: string; }; };
        let teams: { [key: string]: any } = teamYMap;
        teams[side] = value;
        gameProps.set("teams", teams);
    }

    const siloAction = (x: number, y: number, color: string, historyTime?: string): void => {
        // Validation
        if (clockData.get("stage") as string === "PREP") {
            toast({
                title: "No editing in PREP stage.",
                status: 'error',
                duration: 500,
            })
            return;
        }

        const silosYArray = gameProps.get("silos") as Y.Array<string[]>;
        const historyYArray = gameProps.get("history") as Y.Array<{ action: string; time: string; team: string }>;
        let silo = silosYArray.get(x);

        // Physics Engine \ō͡≡o˞̶ \ō͡≡o˞̶ \ō͡≡o˞̶
        if (color != "NONE") {
            let siloHeight = 0;
            for (let index = 0; index < silo.length; index++) {
                const val = silo[index];
                if (val === "NONE") {
                    siloHeight = index;
                    break;
                }
                siloHeight = 2;
            }

            if (y > siloHeight) y = siloHeight;
        }

        historyYArray.forEach((val, index) => {
            if (val.action.startsWith(`Silo ${x} ${y}`)) {
                historyYArray.delete(index);
            }
        })
        historyYArray.push([{ action: `Silo ${x} ${y} ${color}`, time: historyTime || elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: color }])

        ydoc.transact((_y) => {
            silo[y] = color;
            silosYArray.delete(x, 1);
            silosYArray.insert(x, [silo]);
        })
    }


    const redStorageZoneAction = (value: number, historyTime?: string) => {
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
        if (value > (itemsYMap.get("redSeedling") as number || 0)) {
            toast({
                title: "Storage Zone exceeded placed Seedling!",
                status: 'error',
                position: 'bottom-left',
                duration: 500,
            })
            return;
        }
        historyYArray.forEach((val, index) => {
            if (val.action.startsWith(`StorageZone ${value}`) && val.team === "RED") {
                historyYArray.delete(index);
            }
        })
        historyYArray.push([{ action: `StorageZone ${value}`, time: historyTime || elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }])
        itemsYMap.set("redStorageZone", value);
    }

    const redSeedlingAction = (value: number, historyTime?: string) => {
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
        if (value > 12) {
            toast({
                title: "Seedling exceeded!",
                status: 'error',
                position: 'bottom-left',
                duration: 500,
            })
            return;
        }

        historyYArray.forEach((val, index) => {
            if (val.action.startsWith(`Seedling ${value}`) && val.team === "RED") {
                historyYArray.delete(index);
            }
        })
        historyYArray.push([{ action: `Seedling ${value}`, time: historyTime || elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "RED" }])
        itemsYMap.set("redSeedling", value);
    }

    const blueStorageZoneAction = (value: number, historyTime?: string) => {
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
        if (value > (itemsYMap.get("blueSeedling") as number || 0)) {
            toast({
                title: "Storage Zone exceeded placed Seedling!",
                status: 'error',
                position: 'bottom-right',
                duration: 500,
            })
            return;
        }

        historyYArray.forEach((val, index) => {
            if (val.action.startsWith(`StorageZone ${value}`) && val.team === "BLUE") {
                historyYArray.delete(index);
            }
        })
        historyYArray.push([{ action: `StorageZone ${value}`, time: historyTime || elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
        itemsYMap.set("blueStorageZone", value);
    }

    const blueSeedlingAction = (value: number, historyTime?: string) => {
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
        if (value > 12) {
            toast({
                title: "Seedling exceeded!",
                status: 'error',
                position: 'bottom-right',
                duration: 500,
            })
            return;
        }

        historyYArray.forEach((val, index) => {
            if (val.action.startsWith(`Seedling ${value}`) && val.team === "BLUE") {
                historyYArray.delete(index);
            }
        })
        historyYArray.push([{ action: `Seedling ${value}`, time: historyTime || elapsedText.minutes + ":" + elapsedText.seconds + "." + elapsedText.milliseconds, team: "BLUE" }])
        itemsYMap.set("blueSeedling", value);
    }
    // [Core] End of GameProps Functions and States


    // [Core] Start of Helper Functions and States
    const forceReset = () => {
        forceStopSound();
        setScores({ redPoints: 0, bluePoints: 0 });
        greateVictoryRef.current = false;

        console.log(replayGameHistory, replayHistory.current)
        replayHistory.current = [...replayGameHistory]
        console.log(replayGameHistory, replayHistory.current)
        const replayState = gameProps.get("replay") as boolean;

        ydoc.transact((_y) => {
            // Clearing the map helps prevent memory leak due to removed past history ٩(´•⌢•｀ )۶⁼³₌₃
            clockData.clear()
            gameProps.clear()

            clockData.set("stage", "PREP")
            clockData.set("timestamp", 0)
            clockData.set("elapsed", 0)
            clockData.set("paused", true)
            clockData.set("init", true)

            gameProps.set("teams", { "red": { "cname": "征龍", "ename": "War Dragon" }, "blue": { "cname": "火之龍", "ename": "Fiery Dragon" } })

            const gameHistory = new Y.Array();
            gameProps.set("history", gameHistory)

            const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            gamePropsSilos.insert(0, [["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"], ["NONE", "NONE", "NONE"]])
            gameProps.set("silos", gamePropsSilos)

            const gamePropsItems = new Y.Map() as Y.Map<number>;
            gamePropsItems.set("redStorageZone", 0);
            gamePropsItems.set("redSeedling", 0);
            gamePropsItems.set("blueStorageZone", 0);
            gamePropsItems.set("blueSeedling", 0);
            gameProps.set("items", gamePropsItems)

            gameProps.set("replay", replayState);

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
                templateRows='repeat(5, 1fr)'
                templateColumns='repeat(4, 1fr)'
                bgColor={"gray.600"}
                overflow={"hidden"}
                fontFamily={"Quicksand Variable, sans-serif"}
                fontWeight={"700"}
                fontSize={"2rem"}
            >
                <GridItem rowSpan={6} colSpan={1} m={"1vw"} mr={0}>
                    <Flex flexDirection={"column"} gap={5} alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <ScoreDisplay color={"red"} team={teamState.redTeam} editable={true} score={scores.redPoints} teams={Teams} setTeam={updateTeam} />
                        <HistoryList history={historyState} team="RED" color={"red"} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={1} colSpan={2} m={"1vw"} textColor={"white"}>
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
                <GridItem rowSpan={6} colSpan={1} m={"1vw"} ml={0}>
                    <Flex flexDirection={"column"} gap={5} alignItems={"center"} height={"100%"} justifyContent={"center"}>
                        <ScoreDisplay color={"blue"} team={teamState.blueTeam} editable={true} score={scores.bluePoints} teams={Teams} setTeam={updateTeam} />
                        <HistoryList history={historyState} color={"blue"} />
                    </Flex>
                </GridItem>
                <GridItem rowSpan={4} colSpan={2} m={"1vw"}>
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
                                left="0"
                                top="0"
                                width="100%"
                                height="100%"
                            >
                                <Box
                                    position="absolute"
                                    left="60%"
                                    top="40%"
                                    transform="translate(-50%, -50%) scale(1)"
                                    transformOrigin='center'
                                >
                                    <Counter counter={itemsState.redSeedling} setCounter={redSeedlingAction} color={"red"} />
                                </Box>
                            </Box>
                        </Box>
                    </Flex>
                </GridItem>

            </Grid>



            <Modal isOpen={false} onClose={() => { }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Connect to Game Room</ModalHeader>
                    <ModalBody>
                        <Input placeholder="Game ID" ref={gameIDInput} />
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme='blue' mr={3} onClick={() => submitGameID(gameIDInput.current?.value)}>
                            Submit
                        </Button>
                        <Button colorScheme='green' mr={3} onClick={() => submitGameID(String(Math.floor(10000000 + Math.random() * 90000000)))}>
                            Create Game
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

                        <Flex mt="0.5rem"><Button colorScheme={"teal"} onClick={() => setReplayGameModal(true)}>Replay Game Settings</Button></Flex>

                        <Flex mt="0.5rem"><Button colorScheme={"purple"} onClick={() => setGameSaveModal(true)}>Game Saves</Button></Flex>
                    </ModalBody>

                    <ModalFooter>
                        {props.buildVersion ? <Text fontSize={"0.75rem"}>Version: {(props.buildVersion as string).substring(0, 6)}</Text> : <Text fontSize={"0.75rem"}>Version: Development</Text>}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal size={"xl"} isOpen={replayGameModal} onClose={() => { setReplayGameModal(false) }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Replay Game</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <RadioGroup onChange={setReplayGameInputOption} value={replayGameInputOption}>
                            <Stack direction='row'>
                                <Radio value='ALL'>All History</Radio>
                                <Radio value='RED'>RED Team History</Radio>
                                <Radio value='BLUE'>BLUE Team History</Radio>
                            </Stack>
                        </RadioGroup>
                        <Textarea size={"md"} ref={replayGameModalTextArea} placeholder='Paste Game Props JSON here' />
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme='red' mr={3} onClick={() => { replayHistory.current = []; setReplayGameHistory([]); setReplayGameModal(false); }}>Clear</Button>
                        <Button colorScheme='blue' mr={3} onClick={() => { parseHistory(replayGameModalTextArea.current?.value || "", replayGameInputOption) }}>
                            Submit
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>


            <Modal size={"xl"} isOpen={gameSaveModal} onClose={() => { setGameSaveModal(false) }} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        Game Saves
                        <Button onClick={saveCurrentGame} colorScheme="green" style={{ position: "absolute", right: "1rem", top: "0.75rem" }}>Save</Button>
                    </ModalHeader>
                    <ModalBody>
                        {JSON.stringify(gameSaveDictionary) == "{}" ? <Text m={"1.5rem"} textAlign={"center"} fontStyle={"italic"}>No Game Saves</Text> :
                            (<TableContainer>
                                <Table variant="striped" size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>Time</Th>
                                            <Th>Action</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {Object.entries(gameSaveDictionary).map(([key, value]) => (
                                            <Tr key={key}>
                                                <Td>{key}</Td>
                                                <Td>
                                                    <Button mx={"0.1rem"} size={"xs"} onClick={() => { parseHistory(value as string, "RED"); gameProps.set("replay", true); setGameSaveModal(false); setGameSettingsModal(false); }} colorScheme={"red"}>Load RED</Button>
                                                    <Button mx={"0.1rem"} size={"xs"} onClick={() => { parseHistory(value as string, "ALL"); gameProps.set("replay", true); setGameSaveModal(false); setGameSettingsModal(false); }} colorScheme={"green"}>Load ALL</Button>
                                                    <Button mx={"0.1rem"} size={"xs"} onClick={() => { parseHistory(value as string, "BLUE"); gameProps.set("replay", true); setGameSaveModal(false); setGameSettingsModal(false); }} colorScheme={"blue"}>Load BLUE</Button>

                                                    <Button mx={"0.5rem"} size={"xs"} onClick={() => { removeSavedGame(key) }} colorScheme={"orange"}>DELETE</Button>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>)}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}

export const getStaticProps = (async () => {
    const buildVersion = process.env.CF_PAGES_COMMIT_SHA || null;
    return { props: { buildVersion } }
})