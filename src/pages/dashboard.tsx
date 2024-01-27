import { GAME_STAGES, GAME_STAGES_TIME } from "@/common/gameStages";
import { FirebaseDatabase } from "@/firebase/config";
import { Box, Button, Image, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from "@chakra-ui/react";
import { ref, child, set, get, update, onValue } from "firebase/database";
import { generateSlug } from "random-word-slugs";
import { useEffect, useRef, useState } from "react";
import "@fontsource-variable/quicksand";
import TimerBox from "@/props/dashboard/TimerBox";
import { Counter } from "@/props/dashboard/Counter";
import { useSnackbar } from "notistack";
import { ScoreDisplay } from "@/props/dashboard/ScoreDisplay";
import Teams from "../props/dashboard/teams.json";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleDot } from '@fortawesome/free-solid-svg-icons'

export default function Dashboard() {

    const dbRef = ref(FirebaseDatabase);

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const [gameID, setGameID] = useState("");
    const [deviceID, setDeviceID] = useState("");
    const gameStage = useRef("PREP");
    const clockData = useRef({ stage: "PREP", timestamp: 0, elapsed: 0, paused: true });
    const [clockText, setClockText] = useState({ minutes: "00", seconds: "00", milliseconds: "000" });
    const grandClock = useRef(false);
    const gameFetchLock = useRef(false);
    const clockElapse = useRef(0);
    const clockToggle = useRef(false);

    const [onlineStatus, setOnlineStatus] = useState(0);

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
                    if (gameData.props) setGameProps(gameData.props);
                    onValue(child(dbRef, `games/${gameID}/props`), (snapshot) => {
                        const newPropsData = snapshot.val();
                        if (newPropsData) {
                            setGameProps(newPropsData);
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

    const updateClockText = () => {
        const remainingTime = clockData.current.paused ? (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed : (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed-(Date.now()-clockData.current.timestamp);
        if (remainingTime >= 0) { 
            const minutes = Math.floor(remainingTime/60000)+"";
            const seconds = Math.floor(remainingTime/1000%60)+"";
            const milliseconds = remainingTime%1000+"";
            setClockText({
                minutes: minutes.length < 2 ? "0"+minutes : minutes,
                seconds: seconds.length < 2 ? "0"+seconds : seconds,
                milliseconds: milliseconds.length < 3 ? milliseconds.length < 2 ? "00"+milliseconds : "0"+milliseconds : milliseconds
            })
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
                    set(child(dbRef, `games/${gameID}/clock`), {
                        stage: newGameStage,
                        timestamp: Date.now(),
                        elapsed: 0,
                        paused: remainingTime > 0 ? false : true
                    })
                    if (newGameStage == "END") {
                        enqueueSnackbar(`Game END`, {variant: "success"})
                        //gameEndVictoryCalc();
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
        enqueueSnackbar("Clock Started", {variant: "success"})
        set(child(dbRef, `games/${gameID}/clock`), {
            stage: gameStage.current,
            timestamp: Date.now(),
            elapsed: clockElapse.current,
            paused: false
        })
    }

    const stopClock = () => {
        console.log("Clock Stopped")
        clockToggle.current = false;
        clockElapse.current += Date.now()-clockData.current.timestamp;
        clockData.current = { stage: gameStage.current, elapsed: clockElapse.current, paused: true, timestamp: Date.now() };
        updateClockText();
        enqueueSnackbar("Clock Stopped", {variant: "success"})
        set(child(dbRef, `games/${gameID}/clock`), {
            stage: gameStage.current,
            timestamp: Date.now(),
            elapsed: clockElapse.current,
            paused: true
        })
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
        enqueueSnackbar(`Reset stage ${gameStage.current}`, {variant: "success"});
        set(child(dbRef, `games/${gameID}/clock`), {
            stage: gameStage.current,
            timestamp: Date.now(),
            elapsed: 0,
            paused: true
        })
    }

    const changeStage = (skipStage:number) => {
        if (GAME_STAGES.indexOf(gameStage.current)+skipStage < 0 ) return;
        if (GAME_STAGES.indexOf(gameStage.current)+skipStage > GAME_STAGES.length-1 ) return;
        const index = GAME_STAGES.indexOf(gameStage.current);
        const nextStage = GAME_STAGES[index+skipStage];
        const remainingTime = GAME_STAGES_TIME[index+skipStage]*1000;
        gameStage.current = nextStage;
        clockToggle.current = remainingTime > 0 ? true : false;
        clockElapse.current = 0;
        clockData.current = { stage: nextStage, timestamp: Date.now(), elapsed: 0, paused: remainingTime > 0 ? false : true };
        updateClockText();
        enqueueSnackbar(`Skip stage to ${gameStage.current}`, {variant: "success"})
        set(child(dbRef, `games/${gameID}/clock`), {
            stage: nextStage,
            timestamp: Date.now(),
            elapsed: 0,
            paused: remainingTime > 0 ? false : true
        })
    }

    const gameIDInput = useRef<HTMLInputElement>(null);
    const [gameIDModal, setGameIDModal] = useState(true);

    const submitGameID = async () => {
        await syncTime();
        if (gameIDInput.current) {
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
        set(child(dbRef, `games/${gameID}/clock`), {
            stage: gameStage.current,
            timestamp: Date.now(),
            elapsed: 0,
            paused: true
        })
    }

    // Game Teams

    const [currentTeam, setCurrentTeam] = useState({"redTeam": {"cname": "征龍", "ename": "War Dragon"}, "blueTeam": {"cname": "火之龍", "ename": "Fiery Dragon"}});

    useEffect(() => {
        console.log("Updating Teams")
        console.log(currentTeam)

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
    const silos = useRef<String[][]>([[],[],[],[],[]]);


    const resetProps = () => {
        setGameProps({});
        silos.current = [[],[],[],[],[]];
        greatVictory.current = false;
        set(child(dbRef, `games/${gameID}/props`), {});
    }

    useEffect(() => {
        if (gameID == "") return;

        if (lastGameProps.current == JSON.stringify(gameProps)) return;
        lastGameProps.current = JSON.stringify(gameProps);

        if (greatVictory.current) return;

        if (gameStage.current == "PREP") {
            resetProps();
            enqueueSnackbar("No editing in PREP stage.", {variant: "error"})
            return;
        }
        
        console.log("Updating Props");
        
        const scores = scoreCalculation();

        set(child(dbRef, `games/${gameID}/props`), {...gameProps, scores});
    }, [gameProps])

    const redFirstSiloAction = (value: number) => {
        // Validation
        if ((gameProps.blueFirstSilo || 0) + value > 3) {
            enqueueSnackbar("First Silo exceeded!", {variant: "error"});
            return;
        }

        silos.current[0].push("RED");
        setGameProps({...gameProps, redFirstSilo: value, silos: silos.current});
        
    }

    const redSecondSiloAction = (value: number) => {
        // Validation
        if ((gameProps.blueSecondSilo || 0) + value > 3) {
            enqueueSnackbar("Second Silo exceeded!", {variant: "error"})
            return;
        }

        silos.current[1].push("RED");
        setGameProps({...gameProps, redSecondSilo: value, silos: silos.current });
        
    }

    const redThirdSiloAction = (value: number) => {
        // Validation
        if ((gameProps.blueThirdSilo || 0) + value > 3) {
            enqueueSnackbar("Third Silo exceeded!", {variant: "error"})
            return;
        }

        silos.current[2].push("RED");
        setGameProps({...gameProps, redThirdSilo: value, silos: silos.current });
        
    }

    const redFourthSiloAction = (value: number) => {
        // Validation
        if ((gameProps.blueFourthSilo || 0) + value > 3) {
            enqueueSnackbar("Fourth Silo exceeded!", {variant: "error"})
            return;
        }

        silos.current[3].push("RED");
        setGameProps({...gameProps, redFourthSilo: value, silos: silos.current });
        
    }

    const redFifthSiloAction = (value: number) => {
        // Validation
        if ((gameProps.blueFifthSilo || 0) + value > 3) {
            enqueueSnackbar("Fifth Silo exceeded!", {variant: "error"})
            return;
        }

        silos.current[4].push("RED");
        setGameProps({...gameProps, redFifthSilo: value, silos: silos.current });
        
    }

    const redStorageZoneAction = (value: number) => {
        // Validation
        if (value > (gameProps.redSeedling || 0)) {
            enqueueSnackbar("Storage Zone exceeded placed Seedling!", {variant: "error"})
            return;
        }

        setGameProps({...gameProps, redStorageZone: value });
        
    }

    const redSeedlingAction = (value: number) => {
        // Validation
        if (value > 12) {
            enqueueSnackbar("Seedling exceeded!", {variant: "error"})
            return;
        }

        setGameProps({...gameProps, redSeedling: value });
        
    }

    const blueFirstSiloAction = (value: number) => {
        // Validation
        if ((gameProps.redFirstSilo || 0) + value > 3) {
            enqueueSnackbar("First Silo exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}});;
            return;
        }

        silos.current[0].push("BLUE");
        setGameProps({...gameProps, blueFirstSilo: value, silos: silos.current });
        
    }

    const blueSecondSiloAction = (value: number) => {
        // Validation
        if ((gameProps.redSecondSilo || 0) + value > 3) {
            enqueueSnackbar("Second Silo exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}});
            return;
        }

        silos.current[1].push("BLUE");
        setGameProps({...gameProps, blueSecondSilo: value, silos: silos.current });
        
    }

    const blueThirdSiloAction = (value: number) => {
        // Validation
        if ((gameProps.redThirdSilo || 0) + value > 3) {
            enqueueSnackbar("Third Silo exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}});
            return;
        }

        silos.current[2].push("BLUE");
        setGameProps({...gameProps, blueThirdSilo: value, silos: silos.current });
        
    }

    const blueFourthSiloAction = (value: number) => {
        // Validation
        if ((gameProps.redFourthSilo || 0) + value > 3) {
            enqueueSnackbar("Fourth Silo exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}});
            return;
        }

        silos.current[3].push("BLUE");
        setGameProps({...gameProps, blueFourthSilo: value, silos: silos.current });
        
    }

    const blueFifthSiloAction = (value: number) => {
        // Validation
        if ((gameProps.redFifthSilo || 0) + value > 3) {
            enqueueSnackbar("First Silo exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}});
            return;
        }

        silos.current[4].push("BLUE");
        setGameProps({...gameProps, blueFifthSilo: value, silos: silos.current });
        
    }

    const blueStorageZoneAction = (value: number) => {
        // Validation
        if (value > (gameProps.blueSeedling || 0)) {
            enqueueSnackbar("Storage Zone exceeded placed Seedling!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}})
            return;
        }

        setGameProps({...gameProps, blueStorageZone: value });
        
    }

    const blueSeedlingAction = (value: number) => {
        // Validation
        if (value > 12) {
            enqueueSnackbar("Seedling exceeded!", {variant: "error", anchorOrigin: {vertical: "bottom", horizontal: "right"}})
            return;
        }

        setGameProps({...gameProps, blueSeedling: value });
        
    }

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

        redPoints += ((gameProps.redFirstSilo || 0) + (gameProps.redSecondSilo || 0) + (gameProps.redThirdSilo || 0) + (gameProps.redFourthSilo || 0) + (gameProps.redFifthSilo || 0)) * 30;
        bluePoints += ((gameProps.blueFirstSilo || 0) + (gameProps.blueSecondSilo || 0) + (gameProps.blueThirdSilo || 0) + (gameProps.blueFourthSilo || 0) + (gameProps.blueFifthSilo || 0)) * 30;

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

        for (let i = 0; i < silos.current.length; i++) {
            const siloArray = silos.current[i];
            const lastElement = siloArray[siloArray.length - 1];

            if (lastElement === "RED" && siloArray.filter((color: String) => color === "RED").length >= 2) {
                redOccoupiedSilos++;
            } else if (lastElement === "BLUE" && siloArray.filter((color: String) => color === "BLUE").length >= 2) {
                blueOccoupiedSilos++;
            }
        }

        let greatVictoryObject = {}

        if (redOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed-(Date.now()-clockData.current.timestamp);
            enqueueSnackbar(`RED GREAT VICTORY`, {variant: "success", autoHideDuration: 10000, preventDuplicate: true});
            stopClock();
            greatVictory.current = true;
            greatVictoryObject = {redGreatVictory: true, greatVictoryTimestamp}
        } else if (blueOccoupiedSilos >= 3) {
            let greatVictoryTimestamp = (GAME_STAGES_TIME[GAME_STAGES.indexOf(gameStage.current)]*1000)-clockData.current.elapsed-(Date.now()-clockData.current.timestamp);
            enqueueSnackbar(`BLUE GREAT VICTORY`, {variant: "success", anchorOrigin: { horizontal: "right", vertical: "bottom" }, autoHideDuration: 10000, preventDuplicate:true});
            stopClock();
            greatVictory.current = true;
            greatVictoryObject = {blueGreatVictory: true, greatVictoryTimestamp}
        }

        return {...gameProps.scores, redPoints: redPoints, bluePoints: bluePoints, ...greatVictoryObject}
    }

    return (
        <>
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
                <Button onClick={()=>{navigator.clipboard.writeText(gameID).then(()=>enqueueSnackbar("GameID Copied!", {variant: "success"}))}} colorScheme="blue" size={"sm"}>Copy GameID</Button>
                <br />
                <Button onClick={()=>{resetProps();resetClock();closeSnackbar();enqueueSnackbar("Props Reset!", {variant: "success"})}} colorScheme="red" size={"sm"}>Force Reset</Button>
            </Box>
            <Box style={{
                fontSize: '1rem',
                margin: '1rem',
                zIndex: 10,
                color: onlineStatus==1?'lightgreen':onlineStatus==0?'lightcoral':'orange',
            }}>
                <FontAwesomeIcon icon={faCircleDot} /> {onlineStatus==1 ? "Connected" : onlineStatus==0 ? "Disconnected": "Large Time Diff"}
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
                    left: '4%',
                    top: '10%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <ScoreDisplay color={"red"} team={currentTeam.redTeam} editable={true} score={gameProps.scores?.redPoints||0} teams={Teams} setTeam={redUpdateTeam} />
                </Box>
                <Box style={{
                    right: '4%',
                    top: '10%',
                    position: 'absolute',
                    zIndex: 10,
                }}>
                    <ScoreDisplay color={"blue"} team={currentTeam.blueTeam} editable={true} score={gameProps.scores?.bluePoints||0} teams={Teams} setTeam={blueUpdateTeam} />
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
                <Box style={{
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
                </Box>
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
                <Button colorScheme='green' mr={3} onClick={()=>createGame(generateSlug(2))}>
                Create Game
                </Button>
            </ModalFooter>
            </ModalContent>
        </Modal>
        </>
    )
}