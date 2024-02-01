import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { FirebaseApp, FirebaseDatabase } from "@/firebase/config";
import { ColorPicker } from "@/props/dashboard/ColorPicker";
import { Counter } from "@/props/dashboard/Counter";
import HistoryList from "@/props/dashboard/HistoryList";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import TimerBox from "@/props/dashboard/TimerBox";
import { Box, Button, Image, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { faCircleDot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { child, get, onValue, ref, set, update } from "firebase/database";
import { useSnackbar } from "notistack";
import { generateSlug } from "random-word-slugs";
import { useEffect, useRef, useState } from "react";
import Teams from "../props/dashboard/teams.json";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import Head from 'next/head';

export default function Dashboard() {

    const dbRef = ref(FirebaseDatabase);

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const [gameID, setGameID] = useState("");
    const [deviceID, setDeviceID] = useState("");
    const gameStage = useRef("PREP");
    const clockData = useRef({ stage: "PREP", timestamp: 0, elapsed: 0, paused: true });
    const [clockText, setClockText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const [elapsedText, setElapsedText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const grandClock = useRef(false);
    const gameFetchLock = useRef(false);
    const clockElapse = useRef(0);
    const clockToggle = useRef(false);

    const [onlineStatus, setOnlineStatus] = useState(0);

    useEffect(()=>{
        const appCheck = initializeAppCheck(FirebaseApp, {
            provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY||""),
            
            // Optional argument. If true, the SDK automatically refreshes App Check
            // tokens as needed.
            isTokenAutoRefreshEnabled: true
        });
    },[])

    useEffect(() => {
        if (gameID && !gameFetchLock.current) {
            console.log("Fetching Game: "+gameID);
            get(child(dbRef, `games/${gameID}`)).then((snapshot) => {
                const gameData = snapshot.val();
                if (gameData) {
                    update(child(dbRef, `games/${gameID}`), {
                        device: { ...gameData.device, [deviceID]: "CONTROLLER" },
                    });
                    console.log("Game Fetched");
                    enqueueSnackbar(`Game Loaded`, {variant: "success"})
                    gameStage.current = gameData.clock.stage;
                    clockElapse.current = gameData.clock.elapsed;
                    clockToggle.current = !gameData.clock.paused;
                    clockData.current = gameData.clock;
                    updateClockText();
                    onValue(child(dbRef, `games/${gameID}/clock`), (snapshot) => {
                        const newClockData = snapshot.val();
                        if (newClockData) {
                            gameStage.current = newClockData.stage;
                            clockElapse.current = newClockData.elapsed;
                            clockToggle.current = !newClockData.paused;
                            clockData.current = newClockData;
                            updateClockText();
                        }
                    });

                    if (gameData.props) {
                        if (gameData.props.history.length > history.current.length) {
                            history.current = gameData.props.history || [];
                        }
                        setGameProps(gameData.props);
                    }
                    onValue(child(dbRef, `games/${gameID}/props`), (snapshot) => {
                        const newPropsData = snapshot.val();
                        if (newPropsData) {
                            if (newPropsData.history.length > history.current.length) {
                                history.current = newPropsData.history || [];
                            }
                            setGameProps(newPropsData);
                        } else {
                            setGameProps({});
                            history.current = [];
                        }
                    });

                    if (gameData.teams) {
                        setCurrentTeam(gameData.teams);
                    };
                    onValue(child(dbRef, `games/${gameID}/team`), (snapshot) => {
                        const newTeamData = snapshot.val();
                        if (newTeamData) {
                            setCurrentTeam(newTeamData);
                        }
                    });

                    // Check user online
                    onValue(child(dbRef, ".info/connected"), (snap) => {
                        if (snap.val() === true) {
                            setOnlineStatus(1);
                        } else {
                            setOnlineStatus(0);
                        }
                    });

                    onValue(child(dbRef, ".info/serverTimeOffset"), (snap) => {
                        const offset = snap.val();
                        if (offset > 1000) {
                            setOnlineStatus(2);
                        }
                    });
                } else {
                    console.log("Game does not exist");
                    createGame(gameID);
                }
            }).catch((error) => {
                console.error(error);
            }).finally(() => {
                gameFetchLock.current = false;
            });
        }
    }, [gameID])

    
    const [countdownBeep, setCountdownBeep] = useState<any>(null);
    useEffect(() => {
        setCountdownBeep(new Audio("/sound/countdown.mp3"));
    }, [])
    
    const soundCheck = (stage: string, remainingTime: number) => {
        switch (stage) {
            case "PREP":
                if (remainingTime <= 3000) {
                    countdownBeep.play();
                }
            break;
        }
    }

    const updateClockText = () => {
        const elapsedTime = clockData.current.paused ? clockData.current.elapsed : clockData.current.elapsed+(Date.now()-clockData.current.timestamp);
        const remainingTime = clockData.current.paused ? (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed : (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed-(Date.now()-clockData.current.timestamp);
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
            soundCheck(gameStage.current, remainingTime);
            if (clockToggle.current) {
                setTimeout(() => {
                    updateClockText();
                }, 37);
            }
        } else {
            if (grandClock.current) {
                if (GAME_STAGES.indexOf(gameStage.current)+1 < GAME_STAGES.length) {
                    const newGameStage = GAME_STAGES[GAME_STAGES.indexOf(gameStage.current)+1];
                    console.log(`Resetting Timer for ${newGameStage}`);
                    const remainingTime = GAME_STAGES_TIME[GAME_STAGES.indexOf(newGameStage)]*1000;
                    clockData.current = { stage: newGameStage, timestamp: Date.now(), elapsed: 0, paused: remainingTime > 0 ? false : true };
                    updateClockText();
                    gameStage.current = newGameStage;
                    clockToggle.current = remainingTime > 0 ? true : false;
                    clockElapse.current = 0;
                    //console.log("BEFORE RESET", gameProps)
                    set(child(dbRef, `games/${gameID}/clock`), {
                        stage: newGameStage,
                        timestamp: Date.now(),
                        elapsed: 0,
                        paused: remainingTime > 0 ? false : true
                    })
                    //console.log("AFTER RESET", gameProps)
                    if (newGameStage == "END") {
                        enqueueSnackbar(`Game END`, {variant: "success", preventDuplicate: true})
                        gameEndVictoryCalc();
                    }
                }
            }
        }
    }


    const createGame = (gameID: string) => {
        const newGameID = gameID;
        grandClock.current = true;
        const newDeviceID = generateSlug(2);
        setDeviceID(newDeviceID);
        set(child(dbRef, `games/${newGameID}`), {
            createdAt: Date.now(),
            device: {},
            clock: { stage: "PREP", timestamp: 0, elapsed: 0, paused: true },
            props: {},
        });
        setGameID(newGameID);
        setGameIDModal(false);
    };

    const startClock = () => {
        console.log("Clock Started")
        clockToggle.current = true;
        clockData.current = { stage: gameStage.current, elapsed: clockElapse.current, paused: false, timestamp: Date.now() };
        updateClockText();
        enqueueSnackbar("Clock Started", {variant: "success", preventDuplicate: true})
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}/clock`), {
                stage: gameStage.current,
                timestamp: Date.now(),
                elapsed: clockElapse.current,
                paused: false
            })
        }
    }

    const stopClock = () => {
        console.log("Clock Stopped")
        clockToggle.current = false;
        clockElapse.current += Date.now()-clockData.current.timestamp;
        clockData.current = { stage: gameStage.current, elapsed: clockElapse.current, paused: true, timestamp: Date.now() };
        updateClockText();
        enqueueSnackbar("Clock Stopped", {variant: "success", preventDuplicate: true})
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}/clock`), {
                stage: gameStage.current,
                timestamp: Date.now(),
                elapsed: clockElapse.current,
                paused: true
            })
        }
    }

    const toggleClock = () => {
        if (clockToggle.current) {
            stopClock();
        } else {
            startClock();
        }
    }

    const resetStage = () => {
        stopClock();
        closeSnackbar();
        console.log("Reset Stage Time")
        clockToggle.current = false;
        clockElapse.current = 0;
        clockData.current = { stage: gameStage.current, paused: true, elapsed: 0, timestamp: Date.now() };
        updateClockText();
        enqueueSnackbar(`Reset stage ${gameStage.current}`, {variant: "success", preventDuplicate: true});
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}/clock`), {
                stage: gameStage.current,
                timestamp: Date.now(),
                elapsed: 0,
                paused: true
            })
        }
    }

    const changeStage = (skipStage:number) => {
        if (GAME_STAGES.indexOf(gameStage.current)+skipStage < 0 ) {stopClock(); return;}
        if (GAME_STAGES.indexOf(gameStage.current)+skipStage > GAME_STAGES.length-1 ) {stopClock(); return;}
        const index = GAME_STAGES.indexOf(gameStage.current);
        const nextStage = GAME_STAGES[index+skipStage];
        const remainingTime = GAME_STAGES_TIME[index+skipStage]*1000;
        gameStage.current = nextStage;
        clockToggle.current = remainingTime > 0 ? true : false;
        clockElapse.current = 0;
        clockData.current = { stage: nextStage, timestamp: Date.now(), elapsed: 0, paused: remainingTime > 0 ? false : true };
        updateClockText();
        enqueueSnackbar(`Skip stage to ${gameStage.current}`, {variant: "success", preventDuplicate: true})
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}/clock`), {
                stage: nextStage,
                timestamp: Date.now(),
                elapsed: 0,
                paused: remainingTime > 0 ? false : true
            })
        }
    }

    const gameIDInput = useRef<HTMLInputElement>(null);
    const [gameIDModal, setGameIDModal] = useState(true);

    const submitGameID = async () => {
        if (gameIDInput.current) {
            if (gameIDInput.current.value == "") return;
            console.log("Game ID: "+gameIDInput.current.value);
            setDeviceID(generateSlug(2));
            setGameID(gameIDInput.current.value);
            setGameIDModal(false);
            updateClockText();
        }
    }

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

    const resetClock = () => {
        stopClock();
        console.log("Reset Clock")
        clockToggle.current = false;
        clockElapse.current = 0;
        gameStage.current = GAME_STAGES[0]
        clockData.current = { stage: gameStage.current, paused: true, elapsed: 0, timestamp: Date.now() };
        updateClockText();
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}/clock`), {
                stage: gameStage.current,
                timestamp: Date.now(),
                elapsed: 0,
                paused: true
            })
        }
    }

    // Game Teams

    const [currentTeam, setCurrentTeam] = useState({"redTeam": {"cname": "征龍", "ename": "War Dragon"}, "blueTeam": {"cname": "火之龍", "ename": "Fiery Dragon"}});

    useEffect(() => {
        console.log("Updating Teams")

        if (gameID == "") return;

        set(child(dbRef, `games/${gameID}/team`), currentTeam);
    }, [currentTeam])

    const redUpdateTeam = (value: any) => {
        setCurrentTeam({...currentTeam, redTeam: value});
    }

    const blueUpdateTeam = (value: any) => {
        setCurrentTeam({...currentTeam, blueTeam: value});
    }

    // Game Props
    const lastGameProps = useRef<any>("");
    const greatVictory = useRef<boolean>(false);
    const [gameProps, setGameProps] = useState<any>({});
    const history = useRef<any[]>([]);


    const resetProps = () => {
        setGameProps({});
        history.current = [];
        greatVictory.current = false;
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}/props`), {});
        }
    }

    
    const forceReset = () => {
        stopClock();
        console.log("Reset Clock")
        clockToggle.current = false;
        clockElapse.current = 0;
        gameStage.current = GAME_STAGES[0]
        clockData.current = { stage: gameStage.current, paused: true, elapsed: 0, timestamp: Date.now() };
        updateClockText();
        setGameProps({});
        history.current = [];
        greatVictory.current = false;
        if (gameID != "") {
            set(child(dbRef, `games/${gameID}`), {
                clock: {
                    stage: gameStage.current,
                    timestamp: Date.now(),
                    elapsed: 0,
                    paused: true
                }
            })
        }
    }

    useEffect(() => {
        if (gameID == "") return;

        if (lastGameProps.current == JSON.stringify(gameProps)) return;
        lastGameProps.current = JSON.stringify(gameProps);

        if (greatVictory.current) return;

        if (gameStage.current === "PREP") {
            resetProps();
            enqueueSnackbar("No editing in PREP stage.", {variant: "error"})
            return;
        }

        //console.log("UPDATE", gameProps);
        
        console.log("Updating Props");
        
        const scores = scoreCalculation();

        set(child(dbRef, `games/${gameID}/props`), {...gameProps, scores, history: history.current});
    }, [gameProps])

    const redStorageZoneAction = (value: number) => {
        // Validation
        if (value > (gameProps.redSeedling || 0)) {
            enqueueSnackbar("Storage Zone exceeded placed Seedling!", {variant: "error", preventDuplicate: true})
            return;
        }

        history.current.push({action: `RED Storage Zone ${value}`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: "RED"})
        setGameProps({...gameProps, redStorageZone: value });
        
    }

    const redSeedlingAction = (value: number) => {
        // Validation
        if (value > 12) {
            enqueueSnackbar("Seedling exceeded!", {variant: "error"})
            return;
        }

        history.current.push({action: `RED Seedling ${value}`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: "RED"})
        setGameProps({...gameProps, redSeedling: value});
        
    }

    const blueStorageZoneAction = (value: number) => {
        // Validation
        if (value > (gameProps.blueSeedling || 0)) {
            enqueueSnackbar("Storage Zone exceeded placed Seedling!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}, preventDuplicate: true})
            return;
        }

        history.current.push({action: `BLUE Storage Zone ${value}`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: "BLUE"})
        setGameProps({...gameProps, blueStorageZone: value });
        
    }

    const blueSeedlingAction = (value: number) => {
        // Validation
        if (value > 12) {
            enqueueSnackbar("Seedling exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}, preventDuplicate: true})
            return;
        }

        history.current.push({action: `BLUE Seedling ${value}`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: "BLUE"})
        setGameProps({...gameProps, blueSeedling: value });
        
    }

    const [siloForceColor, setSiloForceColor] = useState<any>([["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"]]);

    const siloAction = (silo: number, pos: number, color: String) => {
        //console.log("Silo Action", gameProps)
        let tmpSilos = gameProps.silos?[...gameProps.silos]:[["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"],["NONE","NONE","NONE"]];

        let siloHeight = 0;
        for (let index = 0; index < tmpSilos[silo].length; index++) {
            const val = tmpSilos[silo][index];
            if (val === "NONE") {
                siloHeight = index;
                break;
            }
            siloHeight = 2;
        }

        if (pos > siloHeight) pos = siloHeight;
        tmpSilos[silo][pos] = color;
        history.current.push({action: `Silo ${silo} ${pos} ${color}`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: color=="RED"?"RED":"BLUE"})
        setGameProps({...gameProps, silos: [...tmpSilos]});
    }

    const scoresRef = useRef<any>({red: 0, blue: 0});

    const scoreCalculation = () => {
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

        redPoints += (gameProps.redSeedling || 0) * 10;
        bluePoints += (gameProps.blueSeedling || 0) * 10;

        redPoints += (gameProps.redStorageZone || 0) * 10;
        bluePoints += (gameProps.blueStorageZone || 0) * 10;

        gameProps.silos?.forEach((silo: String[]) => {
            silo.forEach((color: String) => {
                if (color == "RED") redPoints += 30;
                if (color == "BLUE") bluePoints += 30;
            })
        });
        //console.log("SCORE", gameProps.silos)

        /*
        ‘V Goal’ “Mùa Vàng” (Harvest Glory) is achieved when 3 Silos
        meeting following conditions.
        + A Silo is full (3) and contains a minimum of 2 own team color’s
        Paddy Rice.
        + The top Paddy Rice is of the team’s colour.
        The team wins at the moment when Mua Vang is achieved.
        */

        if (greatVictory.current) return;

        let redOccoupiedSilos = 0;
        let blueOccoupiedSilos = 0;

        gameProps.silos?.forEach((silo: String[]) => {
            const siloArray = silo;
            const lastElement = siloArray[siloArray.length - 1];

            if (lastElement === "RED" && siloArray.filter((color: String) => color === "RED").length >= 2 && siloArray.length == 3) {
                redOccoupiedSilos++;
            } else if (lastElement === "BLUE" && siloArray.filter((color: String) => color === "BLUE").length >= 2 && siloArray.length == 3) {
                blueOccoupiedSilos++;
            }
        })

        let greatVictoryObject = {}

        if (redOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed-(Date.now()-clockData.current.timestamp);
            enqueueSnackbar(`RED GREAT VICTORY`, {variant: "success", autoHideDuration: 10000, preventDuplicate: true});
            stopClock();
            if (grandClock.current) history.current.push({action: `RED GREAT VICTORY`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: "RED"});
            greatVictory.current = true;
            greatVictoryObject = {redGreatVictory: true, greatVictoryTimestamp}
        } else if (blueOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed-(Date.now()-clockData.current.timestamp);
            enqueueSnackbar(`BLUE GREAT VICTORY`, {variant: "success", anchorOrigin: { horizontal: "right", vertical: "bottom" }, autoHideDuration: 10000, preventDuplicate:true});
            stopClock();
            if (grandClock.current) history.current.push({action: `BLUE GREAT VICTORY`, time: elapsedText.minutes+":"+elapsedText.seconds+"."+elapsedText.milliseconds, team: "BLUE"});
            greatVictory.current = true;
            greatVictoryObject = {blueGreatVictory: true, greatVictoryTimestamp}
        }

        scoresRef.current = {redPoints, bluePoints}
        return {redPoints, bluePoints, ...greatVictoryObject}
    }

    const gameEndVictoryCalc = () => {
        /*
        3.7 Deciding the Winner
        A Winning Team is determined as follows:
        1) The team that achieves absolute victory, the “Mùa Vàng”
        2) The team with a higher total score.
        3) In case 2 teams have the same scores:
        (a) The team with a higher total score of the stored Paddy Rice in Area 3.
        (b) The team with a higher total score of the harvested balls.
        (c) The team with a higher total score of planting in Area 1.
        (d) The team gains score of planting in advance in Area 1.
        (e) Determination by The Judge Committee.
        */

        //console.log("gameEndVictoryCalc", gameProps)

        let redPoints = scoresRef.current.redPoints;
        let bluePoints = scoresRef.current.bluePoints;
        //console.log(redPoints, bluePoints)

        if (redPoints > bluePoints) {
            enqueueSnackbar(`RED WINS`, {variant: "success", autoHideDuration: 10000, preventDuplicate: true});
            //stopClock();
            //greatVictory.current = true;
            //history.current.push({action: `RED WINS`, time: "03:00:00", team: "RED"});
            //setGameProps({...gameProps, scores: {...gameProps.scores, redVictory: true}});
        } else if (bluePoints > redPoints) {
            enqueueSnackbar(`BLUE WINS`, {variant: "success", autoHideDuration: 10000, preventDuplicate: true});
            //stopClock();
            //greatVictory.current = true;
            //history.current.push({action: `BLUE WINS`, time: "03:00:00", team: "BLUE"});
            //setGameProps({...gameProps, scores: {...gameProps.scores, blueVictory: true}});
        } 
        // Dun want to write
    }

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
                GameID: {gameID}
                <br />
                <Button onClick={()=>{navigator.clipboard.writeText(gameID).then(()=>enqueueSnackbar("GameID Copied!", {variant: "success", preventDuplicate: true}))}} colorScheme="blue" size={"sm"}>Copy GameID</Button>
                <br />
                <Button onClick={()=>{forceReset();closeSnackbar();enqueueSnackbar("Props Reset!", {variant: "success", preventDuplicate: true})}} colorScheme="red" size={"sm"}>Force Reset</Button>
            </Box>
            <Box style={{
                fontSize: '1rem',
                margin: '1rem',
                zIndex: 10,
                color: onlineStatus==1?'lightgreen':onlineStatus==0?'lightcoral':'orange',
            }}>
                {onlineStatus==1 ? "Connected" : onlineStatus==0 ? "Disconnected": "Large Time Diff"} <FontAwesomeIcon icon={faCircleDot} />
                <br />
            </Box>
            <Box style={{
                right: "1rem",
                top: "2rem",
                zIndex: 10,
                position: 'absolute',
                color: onlineStatus==1?'lightgreen':onlineStatus==0?'lightcoral':'orange',
            }}>
            <Button onClick={()=>navigator.clipboard.writeText(JSON.stringify({...gameProps, teams: currentTeam}))} colorScheme="blue" size={"sm"}>Copy Game Props</Button>
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
                    gameStage={gameStage.current} 
                    clockToggle={clockToggle.current}
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
                    <ScoreDisplay color={"red"} team={currentTeam.redTeam} editable={true} score={gameProps.scores?.redPoints||0} teams={Teams} setTeam={redUpdateTeam} />
                </Box>
                <Box style={{
                    right: '7%',
                    top: '-5%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <ScoreDisplay color={"blue"} team={currentTeam.blueTeam} editable={true} score={gameProps.scores?.bluePoints||0} teams={Teams} setTeam={blueUpdateTeam} />
                </Box>
                <Box style={{
                    left: '4%',
                    top: '41%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <HistoryList history={gameProps.history || []} team="RED" color={"red"} />
                </Box>
                <Box style={{
                    right: '4%',
                    top: '41%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <HistoryList history={gameProps.history || []} team="BLUE" color={"blue"} />
                </Box>
                <Box style={{
                    height: '95%',
                    width: '100%',
                    zIndex: 1,
                }}>
                    <Image src="/GameField.png" alt="Logo" style={{
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
                        <ColorPicker forceColor={siloForceColor[0][0]} color={gameProps.silos&&gameProps.silos[0][0]||"NONE"} setPicker={siloAction} pos={[0,0]}/>
                    </Box>
                    <Box style={{
                        left: '10%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[0][1]} color={gameProps.silos&&gameProps.silos[0][1]||"NONE"} setPicker={siloAction} pos={[0,1]}/>
                    </Box>
                    <Box style={{
                        left: '10%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[0][2]} color={gameProps.silos&&gameProps.silos[0][2]||"NONE"} setPicker={siloAction} pos={[0,2]}/>
                    </Box>

                    <Box style={{
                        left: '27%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[1][0]} color={gameProps.silos&&gameProps.silos[1][0]||"NONE"} setPicker={siloAction} pos={[1,0]}/>
                    </Box>
                    <Box style={{
                        left: '27%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[1][1]} color={gameProps.silos&&gameProps.silos[1][1]||"NONE"} setPicker={siloAction} pos={[1,1]}/>
                    </Box>
                    <Box style={{
                        left: '27%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[1][2]} color={gameProps.silos&&gameProps.silos[1][2]||"NONE"} setPicker={siloAction} pos={[1,2]}/>
                    </Box>

                    <Box style={{
                        left: '43.5%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[2][0]} color={gameProps.silos&&gameProps.silos[2][0]||"NONE"} setPicker={siloAction} pos={[2,0]}/>
                    </Box>
                    <Box style={{
                        left: '43.5%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[2][1]} color={gameProps.silos&&gameProps.silos[2][1]||"NONE"} setPicker={siloAction} pos={[2,1]}/>
                    </Box>
                    <Box style={{
                        left: '43.5%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[2][2]} color={gameProps.silos&&gameProps.silos[2][2]||"NONE"} setPicker={siloAction} pos={[2,2]}/>
                    </Box>

                    <Box style={{
                        left: '60%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[3][0]} color={gameProps.silos&&gameProps.silos[3][0]||"NONE"} setPicker={siloAction} pos={[3,0]}/>
                    </Box>
                    <Box style={{
                        left: '60%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[3][1]} color={gameProps.silos&&gameProps.silos[3][1]||"NONE"} setPicker={siloAction} pos={[3,1]}/>
                    </Box>
                    <Box style={{
                        left: '60%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[3][2]} color={gameProps.silos&&gameProps.silos[3][2]||"NONE"} setPicker={siloAction} pos={[3,2]}/>
                    </Box>

                    <Box style={{
                        left: '76.5%',
                        bottom: '8%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[4][0]} color={gameProps.silos&&gameProps.silos[4][0]||"NONE"} setPicker={siloAction} pos={[4,0]}/>
                    </Box>
                    <Box style={{
                        left: '76.5%',
                        bottom: '38%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[4][1]} color={gameProps.silos&&gameProps.silos[4][1]||"NONE"} setPicker={siloAction} pos={[4,1]}/>
                    </Box>
                    <Box style={{
                        left: '76.5%',
                        bottom: '68%',
                        position: 'absolute',
                        zIndex: 10,
                    }}>
                        <ColorPicker forceColor={siloForceColor[4][2]} color={gameProps.silos&&gameProps.silos[4][2]||"NONE"} setPicker={siloAction} pos={[4,2]}/>
                    </Box>
                    
                </Box>

                {/* <Box style={{
                    left: '47%',
                    top: '1%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redFirstSilo||0} setCounter={redFirstSiloAction} color={"red"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '50.8%',
                    top: '1%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueFirstSilo||0} setCounter={blueFirstSiloAction} color={"blue"} small={true} disableLeftClick={true} />
                </Box> 
                <Box style={{
                    left: '47%',
                    top: '7%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redSecondSilo||0} setCounter={redSecondSiloAction} color={"red"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '50.8%',
                    top: '7%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueSecondSilo||0} setCounter={blueSecondSiloAction} color={"blue"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '47%',
                    top: '13.1%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redThirdSilo||0} setCounter={redThirdSiloAction} color={"red"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '50.8%',
                    top: '13.1%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueThirdSilo||0} setCounter={blueThirdSiloAction} color={"blue"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '47%',
                    top: '19.1%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redFourthSilo||0} setCounter={redFourthSiloAction} color={"red"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '50.8%',
                    top: '19.1%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueFourthSilo||0} setCounter={blueFourthSiloAction} color={"blue"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '47%',
                    top: '25.2%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.redFifthSilo||0} setCounter={redFifthSiloAction} color={"red"} small={true} disableLeftClick={true} />
                </Box>
                <Box style={{
                    left: '50.8%',
                    top: '25.2%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <Counter counter={gameProps.blueFifthSilo||0} setCounter={blueFifthSiloAction} color={"blue"} small={true} disableLeftClick={true} />
                </Box> */}
                <Box style={{
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
                </Box>
            </Box>
        </Box>
        <Modal isOpen={gameIDModal} onClose={()=>{}} isCentered>
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
        </Modal>
        </>
    )
}