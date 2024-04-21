'use client'

import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { FirebaseApp, FirebaseDatabase } from "@/firebase/config";
import { ColorPicker } from "@/props/dashboard/ColorPicker";
import { Counter } from "@/props/dashboard/Counter";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import TimerBox from "@/props/dashboard/TimerBox";
import { Box, Button, Flex, HStack, Image, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Switch, Text, useToast } from "@chakra-ui/react";
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
import { patternGenerator } from "@/helpers/PatternGenerator";

const ydoc = new Y.Doc();
const provider = new YPartyKitProvider("https://rt-scoreboard-party.yuetau.partykit.dev", "test", ydoc);

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



    // [Features] GameSetting Functions and States
    const isFirstReadSettings = useRef(false);
    const [gameSettingsModal, setGameSettingsModal] = useState(false);
    const [gameSettings, setGameSettings] = useState({ preGameCountdown: true, endGameCountdown: true, bgm: false });

    useEffect(() => {
        const localGameSettings = localStorage.getItem("gameSettings");
        if (localGameSettings && !isFirstReadSettings.current) {
            setGameSettings(JSON.parse(localGameSettings));
            isFirstReadSettings.current = true;
        } else {
            localStorage.setItem("gameSettings", JSON.stringify(gameSettings));
        }
    }, [gameSettings]);



    // [Core] Start of Clock Functions and States
    const clockData = ydoc.getMap("clockData");
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
    const [clockText, setClockText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const [elapsedText, setElapsedText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });

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
            const remainingMinutes = Math.floor(remainingTime/60000)+"";
            const remainingSeconds = Math.floor(remainingTime/1000%60)+"";
            const remainingMilliseconds = remainingTime%1000+"";
            setClockText({
                minutes: remainingMinutes.length < 2 ? "0"+remainingMinutes : remainingMinutes,
                seconds: remainingSeconds.length < 2 ? "0"+remainingSeconds : remainingSeconds,
                milliseconds: remainingMilliseconds.length < 3 ? remainingMilliseconds.length < 2 ? "00"+remainingMilliseconds : "0"+remainingMilliseconds : remainingMilliseconds
            })

            // Calculate elapsedTime from seconds to human-readable text
            // For history entries
            const elapsedMinutes = Math.floor(elapsedTime/60000)+"";
            const elapsedSeconds = Math.floor(elapsedTime/1000%60)+"";
            const elapsedMilliseconds = elapsedTime%1000+"";
            setElapsedText({
                minutes: elapsedMinutes.length < 2 ? "0"+elapsedMinutes : elapsedMinutes,
                seconds: elapsedSeconds.length < 2 ? "0"+elapsedSeconds : elapsedSeconds,
                milliseconds: elapsedMilliseconds.length < 3 ? elapsedMilliseconds.length < 2 ? "00"+elapsedMilliseconds : "0"+elapsedMilliseconds : elapsedMilliseconds
            })

            // After-math function
            // That has to check constantly
            soundCheck((clockData.get("stage") as string), remainingTime);

            // Recall itself 37 milliseconds after
            // Yes, it isn't real-time, but it seems ones.
            // The site will crash if you make it real-time. ¯\_(ツ)_/¯
            if (!(clockData.get("paused") as boolean)) {
                setTimeout(() => {
                    updateClockText();
                }, 37);
            }
        } else {
            // There is no remaining time in current stage
            // Continue to next stage

            // Check if still have stage
            if (GAME_STAGES.indexOf(clockData.get("stage") as string)+1 < GAME_STAGES.length) {
                // Get the new stage name and remaining time
                const newGameStage = GAME_STAGES[GAME_STAGES.indexOf(clockData.get("stage") as string)+1];
                console.log(`Resetting Timer for ${newGameStage}`);
                const remainingTime = GAME_STAGES_TIME[GAME_STAGES.indexOf(newGameStage)]*1000;
                ydoc.transact((_y) => {
                    clockData.set("stage", newGameStage);
                    clockData.set("timestamp", Date.now());
                    clockData.set("elapsed", 0);
                    clockData.set("paused", remainingTime > 0 ? false : true);
                })

                if (newGameStage == "END") {
                    toast({
                        title: "Game END",
                        status: 'success'
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
            status: 'success'
        })
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
        toast({
            title: "Clock Stopped",
            status: 'success'
        })
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
        toast({
            title: `Reset stage ${clockData.get("stage") as string}`,
            status: 'success'
        })
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
        toast({
            title: `Skip stage ${clockData.get("stage") as string}`,
            status: 'success'
        })
    }
    
    // [Core] End of Clock Helper Function
    // [Core] End of Clock Functions and States


    // [Core] Start of GameProps Functions and States
    const gameProps = ydoc.getMap("gameProps");
    const gameHistory = new Y.Array() as Y.Array<string>;
    if (gameProps.get("init") == undefined) {
        console.log("Initializing GameProps Data")
        ydoc.transact((_y) => {
            gameProps.set("teams", {"redTeam": {"cname": "征龍", "ename": "War Dragon"}, "blueTeam": {"cname": "火之龍", "ename": "Fiery Dragon"}})
            gameProps.set("history", gameHistory)

            const gamePropsSilos = new Y.Array() as Y.Array<string[]>;
            gamePropsSilos.insert(0, [["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"]])

            gameProps.set("init", true)
        })
    }

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    const [siloState, setSiloState] = useState([["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"]]);
    const [teamState, setTeamState] = useState<{ redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; }>({
        redTeam: { cname: "征龍", ename: "War Dragon" },
        blueTeam: { cname: "火之龍", ename: "Fiery Dragon" }
    });

    // Hydration Issue, just for good practice ヽ(･∀･)ﾉ
    gameProps.observeDeep(() => {
        setTeamState(gameProps.get("teams") as SetStateAction<{ redTeam: { cname: string; ename: string; }; blueTeam: { cname: string; ename: string; }; }>);
        const silos = gameProps.get("silos") as Y.Array<Y.Array<string>>;
        // Me fucking lazy. (｀□′)╯┴┴
        setSiloState([
            silos.get(0).toArray(),
            silos.get(1).toArray(),
            silos.get(2).toArray(),
            silos.get(3).toArray(),
            silos.get(4).toArray(),
        ]);
    });

    const updateTeam = (value: any, side: string): void => {
        let teams: { [key: string]: any } = gameProps.get("teams") as { [key: string]: any };
        teams[side] = value;
        gameProps.set("teams", teams);
    }

    const siloAction = (x: number, y: number, color: string): void => {
        let silo = (gameProps.get("silos") as Y.Array<Y.Array<string>>).get(x);
        console.log(`Silo Action: ${x} ${y} ${color} Silo Height ${silo.length}`);
        if (y >= silo.length) {y = silo.length} else {silo.delete(y, 1)};
        silo.insert(y, [color]);
    }


    // [Core] Helper Functions and States
    const forceReset = () => {
        ydoc.transact((_y) => {
            clockData.set("stage", "PREP")
            clockData.set("timestamp", 0)
            clockData.set("elapsed", 0)
            clockData.set("paused", true)
            clockData.set("init", true)

            gameProps.set("teams", {"redTeam": {"cname": "征龍", "ename": "War Dragon"}, "blueTeam": {"cname": "火之龍", "ename": "Fiery Dragon"}})
            gameProps.set("history", gameHistory)

            const silos = gameProps.get("silos") as Y.Array<Y.Array<string>>;
            silos.get(0).delete(0, silos.get(0).length);
            silos.get(1).delete(0, silos.get(1).length);
            silos.get(2).delete(0, silos.get(2).length);
            silos.get(3).delete(0, silos.get(3).length);
            silos.get(4).delete(0, silos.get(4).length);

            gameProps.set("init", true)
        })
    }


    // [Features] Start of Sound Functions
    const [countdownBeep, setCountdownBeep] = useState<any>(null);
    const [countdownBeep10, setCountdownBeep10] = useState<any>(null);
    const [bgm, setBGM] = useState<any>(null);
    useEffect(() => {
        setCountdownBeep(new Audio("/sound/countdown.mp3"));
        setCountdownBeep10(new Audio("/sound/countdown10.mp3"));
        setBGM(new Audio("/sound/bgm.mp3"));
    }, [])
    
    const soundCheck = (stage: string, remainingTime: number) => {
        switch (stage) {
            case "PREP":
                if (remainingTime <= 3000 && countdownBeep && countdownBeep.paused && gameSettings.preGameCountdown) {
                    countdownBeep.play();
                }
                break;
            case "GAME":
                if (remainingTime <= 179950 && !(remainingTime >= 1798000) && bgm && bgm.paused && gameSettings.bgm) {
                    bgm.volume = 1.0;
                    bgm.play();
                }
                if (remainingTime <= 10000 && countdownBeep10 && countdownBeep10.paused && gameSettings.endGameCountdown) {
                    bgm.volume = 0.7;
                    countdownBeep10.play();
                }
                break;
            case "END":
                if (!bgm.paused) {
                    bgm.pause();
                    bgm.currentTime = 0;
                }
                break;
        }
    }

    const stopSound = () => {
        countdownBeep.pause();
        countdownBeep10.pause();
        bgm.pause();
    }

    const forceStopSound = () => {
        if (!countdownBeep.paused) {
            countdownBeep.pause();
            countdownBeep.currentTime = 0;
        }
        if (!countdownBeep10.paused) {
            countdownBeep10.pause();
            countdownBeep10.currentTime = 0;
        }
        if (!bgm.paused) {
            bgm.pause();
            bgm.currentTime = 0;
        }
    }

    // [Features] End of Sound Functions


    // [Features] PatternGenerator Functions and States
    const [patternRandomGeneratorModal, setPatternRandomGeneratorModal] = useState(false);
    const [pattern, setPattern] = useState<[string[][],string[][]]>([[],[]]);

    useEffect(() => {
        if (pattern[0].length === 0) setPattern((patternGenerator() as [string[][], string[][]]));
    }, [pattern])

    return (
        <>
        <Head>
            <title>{"HKUST Robocon 2024"}</title>
        </Head>
        <Box style={{
            height: containerHeight,
            position: 'absolute',
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            //overflow: 'hidden',
            backgroundColor: '#3A3B3C',
            fontFamily: "'Quicksand Variable', sans-serif",
            fontWeight: "700",
            fontSize: "2rem",
            color: 'white',
        }}>
            <Box style={{
                fontSize: '1.3rem',
                margin: '1rem',
                zIndex: 10
            }}>
                GameID: 
                <br />
                {/* <Button onClick={()=>{navigator.clipboard.writeText(gameID).then(()=>enqueueSnackbar("GameID Copied!", {variant: "success", preventDuplicate: true}))}} colorScheme="blue" size={"sm"}>Copy GameID</Button>
                <br />
                <Button onClick={()=>navigator.clipboard.writeText(JSON.stringify({...gameProps, teams: currentTeam}))} colorScheme="blue" size={"sm"}>Copy Game Props</Button>
                <br />  */}
                <Button onClick={()=>{forceReset();toast.closeAll();toast({title: "Props Reset!", status: "success"})}} colorScheme="red" size={"sm"}>Force Reset</Button>
                
            </Box>
            {/* <Box style={{
                fontSize: '1rem',
                margin: '1rem',
                zIndex: 10,
                color: onlineStatus==1?'lightgreen':onlineStatus==0?'lightcoral':'orange',
            }}>
                {onlineStatus==1 ? "Connected" : onlineStatus==0 ? "Disconnected": "Large Time Diff"} <FontAwesomeIcon icon={faCircleDot} />
                <br />
            </Box> */}
            <Box style={{
                right: "1rem",
                top: "2.5rem",
                zIndex: 10,
                position: 'absolute',
                fontSize: '1.3rem',
                textAlign: 'right',
            }}>
                <Button onClick={()=>{setGameSettingsModal(true)}} colorScheme="teal" size={"sm"}>Game Settings</Button>
                <br />
                <Button onClick={()=>{setPatternRandomGeneratorModal(true)}} colorScheme="teal" size={"sm"}>Pattern Generator</Button>
            </Box>
            <Box style={{
                height: '0%',
                width: '100%',
                position: 'absolute',
                justifyContent: 'center',
            }}>
                {/** Clock Box */}
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
            </Box>   
            <Box style={{
                height: '75%',
                width: '100%',
                top: '25%',
                position: 'absolute',
            }}>
                <Box style={{
                    left: '7%',
                    top: '-5%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <ScoreDisplay color={"red"} team={teamState.redTeam} editable={true} score={0} teams={Teams} setTeam={updateTeam} teamColor={"redTeam"} />
                </Box>
                <Box style={{
                    right: '7%',
                    top: '-5%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <ScoreDisplay color={"blue"} team={teamState.blueTeam} editable={true} score={0} teams={Teams} setTeam={updateTeam} teamColor={"blueTeam"} />
                </Box>
                <Box style={{
                    left: '4%',
                    top: '41%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <HistoryList history={(gameProps.get("history") as Y.Array<string>).toArray() || []} team="RED" color={"red"} />
                </Box>
                <Box style={{
                    right: '4%',
                    top: '41%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <HistoryList history={(gameProps.get("history") as Y.Array<string>).toArray() || []} team="BLUE" color={"blue"} />
                </Box>
                <Box style={{
                    height: '95%',
                    width: '100%',
                    zIndex: 1,
                }}>
                    <Image src="/GameField.webp" fallbackSrc="/GameField.png" alt="Logo" style={{
                        height: '100%',
                        width: '100%',
                        objectFit: 'contain',
                    }}/>
                </Box>

                <Box
                    shadow="lg"
                    rounded="md"
                    style={{
                        left: '39.3%',
                        top: '0.5%',
                        position: 'absolute',
                        zIndex: 10,
                        fontSize: "2rem",
                        textAlign: "center",
                        lineHeight: "2.5rem",
                        backgroundColor: "white",
                        color: "black",
                        width: "19.7rem",
                        height: "10.5rem",
                        overflow: "hidden",
                    }}
                >
                    <Box style={{
                        left: '10%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[0][0]} setPicker={siloAction} pos={[0,0]}/>
                    </Box>
                    <Box style={{
                        left: '10%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[0][1]} setPicker={siloAction} pos={[0,1]}/>
                    </Box>
                    <Box style={{
                        left: '10%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[0][2]} setPicker={siloAction} pos={[0,2]}/>
                    </Box>

                    <Box style={{
                        left: '27%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[1][0]} setPicker={siloAction} pos={[1,0]}/>
                    </Box>
                    <Box style={{
                        left: '27%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[1][1]} setPicker={siloAction} pos={[1,1]}/>
                    </Box>
                    <Box style={{
                        left: '27%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[1][2]} setPicker={siloAction} pos={[1,2]}/>
                    </Box>

                    <Box style={{
                        left: '43.5%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[2][0]} setPicker={siloAction} pos={[2,0]}/>
                    </Box>
                    <Box style={{
                        left: '43.5%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[2][1]} setPicker={siloAction} pos={[2,1]}/>
                    </Box>
                    <Box style={{
                        left: '43.5%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[2][2]} setPicker={siloAction} pos={[2,2]}/>
                    </Box>

                    <Box style={{
                        left: '60%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[3][0]} setPicker={siloAction} pos={[3,0]}/>
                    </Box>
                    <Box style={{
                        left: '60%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[3][1]} setPicker={siloAction} pos={[3,1]}/>
                    </Box>
                    <Box style={{
                        left: '60%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[3][2]} setPicker={siloAction} pos={[3,2]}/>
                    </Box>

                    <Box style={{
                        left: '76.5%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[4][0]} setPicker={siloAction} pos={[4,0]}/>
                    </Box>
                    <Box style={{
                        left: '76.5%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[4][1]} setPicker={siloAction} pos={[4,1]}/>
                    </Box>
                    <Box style={{
                        left: '76.5%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker color={siloState[4][2]} setPicker={siloAction} pos={[4,2]}/>
                    </Box>
                    
                </Box>

               {/*  <Box style={{
                    left: '34.7%',
                    top: '12.5%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redStorageZone||0} setCounter={redStorageZoneAction} color={"red"} />
                </Box>
                <Box style={{
                    left: '62.7%',
                    top: '12.5%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueStorageZone||0} setCounter={blueStorageZoneAction} color={"blue"} />
                </Box>
                <Box style={{
                    left: '42%',
                    top: '71.3%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redSeedling||0} setCounter={redSeedlingAction} color={"red"} />
                </Box>
                <Box style={{
                    left: '55.3%',
                    top: '71.3%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueSeedling||0} setCounter={blueSeedlingAction} color={"blue"} />
                </Box> */}
            </Box>
            
        </Box>


        {/* <Modal isOpen={gameIDModal} onClose={()=>{}} isCentered>
            <ModalOverlay />
            <ModalContent>
            <ModalHeader>Connect to Game Room</ModalHeader>
            <ModalBody>
                <Input placeholder="Game ID" ref={gameIDInput}/>
            </ModalBody>

            <ModalFooter>
                <Button colorScheme='blue' mr={3} onClick={submitGameID}>
                Submit
                </Button>
                <Button colorScheme='green' mr={3} onClick={()=>createGame(String(Math.floor(10000000 + Math.random() * 90000000)))}>
                Create Game
                </Button>
            </ModalFooter>
            </ModalContent>
        </Modal> */}

        <Modal isOpen={gameSettingsModal} onClose={()=>{setGameSettingsModal(false)}} isCentered>
            <ModalOverlay />
            <ModalContent>
            <ModalHeader>Game Settings</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.preGameCountdown} onChange={()=>{setGameSettings({...gameSettings, preGameCountdown: !gameSettings.preGameCountdown})}}/> <Box mt={"-0.2rem"} ml={"0.5rem"}>PreGame 3s Countdown Sound Effect</Box></Flex>
                <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.endGameCountdown} onChange={()=>{setGameSettings({...gameSettings, endGameCountdown: !gameSettings.endGameCountdown})}}/> <Box mt={"-0.2rem"} ml={"0.5rem"}>EndGame 10s Countdown Sound Effect</Box></Flex>
                <Flex my="0.5rem"><Switch colorScheme='teal' size='md' isChecked={gameSettings.bgm} onChange={()=>{setGameSettings({...gameSettings, bgm: !gameSettings.bgm})}}/> <Box mt={"-0.2rem"} ml={"0.5rem"}>InGame Background Music</Box></Flex>
            </ModalBody>

            <ModalFooter>
                {props.buildVersion ? <Text fontSize={"0.75rem"}>Version: {(props.buildVersion as string).substring(0,6)}</Text> : <Text fontSize={"0.75rem"}>Version: Development</Text>}
            </ModalFooter>
            </ModalContent>
        </Modal>

        <Modal isOpen={patternRandomGeneratorModal} onClose={()=>{setPatternRandomGeneratorModal(false)}} isCentered>
            <ModalOverlay />
            <ModalContent>
            <ModalHeader>Pattern Generator</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <Box>
                    <Box my="1rem" style={{transform: 'rotate(45deg)'}}>
                    {pattern[1].map((row, rowIndex) => {
                        return (
                            <Box key={rowIndex} style={{display: "flex", justifyContent: "center"}}>
                                {row.map((cell, cellIndex) => {
                                    return (
                                        <Box key={cellIndex} style={{width: "2rem", height: "2rem", backgroundColor: cell=="red"?"red":cell=="purple"?"purple":"white", borderRadius: "50%"}}></Box>
                                    )
                                })}
                            </Box>
                        )
                    })}
                    </Box>
                    <Box mb="0.5rem" mt="4rem">
                    {pattern[0].map((row, rowIndex) => {
                        return (
                            <Box key={rowIndex} style={{display: "flex", justifyContent: "center"}}>
                                {row.map((cell, cellIndex) => {
                                    return (
                                        <Box key={cellIndex} style={{width: "2rem", height: "2rem", backgroundColor: cell=="red"?"red":cell=="purple"?"purple":"white", borderRadius: "50%"}}></Box>
                                    )
                                })}
                            </Box>
                        )
                    })}
                    </Box>
                    <br />
                    <Button onClick={()=>{setPattern((patternGenerator() as [string[][], string[][]]))}} colorScheme="teal">Generate Random Pattern</Button>
                </Box>
            </ModalBody>

            <ModalFooter>
                <Text fontSize={"0.75rem"}>Idealogy by Starfall</Text>
            </ModalFooter>
            </ModalContent>
        </Modal>
        </>
    )
}