import { Alert, AlertDescription, AlertIcon, AlertTitle, Button, Flex, Radio, RadioGroup, Stack, Table, TableContainer, Tbody, Td, Text, Textarea, Tooltip, Tr, useToast } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { useEffect, useState } from "react";
import { IoMdInformationCircleOutline } from "react-icons/io";

const DETAIL_TEXT: { [key: string]: string } = {
    "firstSeedlingTime": "Average time of first seedling of all games$Lower is better",
    "first2BallTime": "Average time first shot in Area 2 of all games$Lower is better",
    "first3BallTime": "Average time first ball placed in silo of all games$Lower is better",
    "avgSeedling": "Average number of seedlings placed of all games$Higher is better",
    "avgSeedlingTime": "Average time between placing seedlings of all games$Lower is better|Including the first seedling",
    "avgArea2Ball": "Average number of balls shooted of Area 2 of all games$Higher is better",
    "avgArea2BallTime": "Average time between shooting balls of Area 2 of all games$Lower is better|Including the first ball",
    "avgArea3Ball": "Average number of balls placed in silos of all games$Higher is better",
    "avgArea3BallTime": "Average time between placing balls in silos of all games$Lower is better|Including the remaining time as of the robots is tring to place the last ball",
    "avgArea3RemainTime": "Average remaining time after the last ball is placed in the silo of all games$Lower is better (Except for Great Victory)|Game without placing balls in silo will have this value as 181 seconds",
}

export default function Calculator(props: any) {
    const average = (array: number[]) => array.reduce((a, b) => a + b) / array.length;

    const toast = useToast()

    const saveData = () => {
        const oldData = localStorage.getItem("statData")
        if (oldData) {
            const oldDataJSON = JSON.parse(oldData)
            const newData = {
               ...oldDataJSON,
                [(new Date).toLocaleDateString('eu-GB')]: gamesStat,
            }
            props.setHistory(newData)
            localStorage.setItem("statData", JSON.stringify(newData))
        } else {
            localStorage.setItem("statData", JSON.stringify({
                [(new Date).toLocaleDateString('eu-GB')]: gamesStat,
            }))
        }
        toast({
            title: "Data saved",
            status: "success",
            duration: 9000,
            isClosable: true,
        })
    }

    const [textArea, setTextArea] = useState<string>("")
    const [gamesArray, setGamesArray] = useState<any[]>([])
    const [gamesStat, setGamesStat] = useState<any>({})
    const [errorAlert, setErrorAlert] = useState<number>(-1)

    const [gamesSide, setGamesSide] = useState<string>("RED")

    useEffect(() => {
        setGamesArray([])
        setErrorAlert(-1)
        const textSplit = textArea.split("\n")
        console.log(textSplit)
        textSplit.forEach((line, index) => {
            try {
                const lineJSON = JSON.parse(line)
                if (!("items" in lineJSON)) throw new Error("No items")
                setGamesArray((prevGamesArray) => [...prevGamesArray, lineJSON])
            } catch (e) {
                console.log("Error at line " + index)
                setErrorAlert(index)
            }
        })
    }, [textArea])

    useEffect(() => {
        if (gamesArray.length == 0) return
        var avgfirstSeedlingTime = -1
        var avgfirst2BallTime = -1
        var avgfirst3BallTime = -1
        var avgSeedling = -1
        var avgSeedlingTime = -1
        var avg2Ball = -1
        var avg2BallTime = -1
        var avg3Ball = -1
        var avg3BallTime = -1
        var avgArea3RemainTime = -1
        gamesArray.forEach((game: any) => {
            const seedlings = gamesSide == "RED" ? game.items["redSeedling"] : game.items["blueSeedling"]
            const storageZone = gamesSide == "RED" ? game.items["redStorageZone"] : game.items["blueStorageZone"]
            var siloBall = 0

            var firstSeedlingTime = -1
            var first2BallTime = -1
            var first3BallTime = -1

            var lastSeedling = -1
            var last2Ball = -1
            var last3Ball = -1
            var seedlingTime: number[] = []
            var ball2Time: number[] = []
            var ball3Time: number[] = []
            var greatVictory: boolean = false
            game.history.forEach((event: any) => {
                if (event.team == gamesSide) {
                    const actionSplit = event.action.split(" ")
                    if (typeof event.time === 'string') {
                        const timeSplit = event.time.split(":")
                        event.time = timeSplit[0] * 60 + timeSplit[1] * 1;
                    }
                    switch (actionSplit[0]) {
                        case "Seedling":
                            if (firstSeedlingTime == -1) firstSeedlingTime = event.time
                            if (event.time > 0) seedlingTime.push(event.time - lastSeedling)
                            lastSeedling = event.time
                            break;
                        case "StorageZone":
                            if (first2BallTime == -1) first2BallTime = event.time
                            if (event.time > 0) ball2Time.push(event.time - last2Ball)
                            last2Ball = event.time
                            break;
                        case "Silo":
                            if (first3BallTime == -1) first3BallTime = event.time
                            if (event.time > 0) ball3Time.push(event.time - last3Ball)
                            last3Ball = event.time
                            siloBall += 1
                            break;
                        case "GreatVictory":
                            greatVictory = true;
                            break;
                    }
                }
            }) 

            var currentAvgSeedlingTime = -1
            var currentAvgBall2Time = -1
            var currentAvgBall3Time = -1
            if (seedlingTime.length > 0) {
                currentAvgSeedlingTime = average(seedlingTime)
            }
            if (ball2Time.length > 0) {
                currentAvgBall2Time = average(ball2Time)
            }
            if (ball3Time.length > 0) {
                currentAvgBall3Time = average(ball3Time)
            }

            if (avgSeedling == -1) avgSeedling = seedlings
            avgSeedling = (avgSeedling + seedlings) / 2

            if (avgSeedlingTime == -1) avgSeedlingTime = currentAvgSeedlingTime
            avgSeedlingTime = (avgSeedlingTime + currentAvgSeedlingTime) / 2

            if (avg2Ball == -1) avg2Ball = storageZone
            avg2Ball = (avg2Ball + storageZone) / 2

            if (avg3Ball == -1) avg3Ball = siloBall
            avg3Ball = (avg3Ball + siloBall) / 2

            if (avg2BallTime == -1) avg2BallTime = currentAvgBall2Time
            avg2BallTime = (avg2BallTime + currentAvgBall2Time) / 2

            if (avg3BallTime == -1) avg3BallTime = currentAvgBall3Time
            avg3BallTime = (avg3BallTime + currentAvgBall3Time) / 2

            if (avgfirstSeedlingTime == -1) avgfirstSeedlingTime = firstSeedlingTime
            avgfirstSeedlingTime = (avgfirstSeedlingTime + firstSeedlingTime) / 2
            
            if (avgfirst2BallTime == -1) avgfirst2BallTime = first2BallTime
            avgfirst2BallTime = (avgfirst2BallTime + first2BallTime) / 2

            if (avgfirst3BallTime == -1) avgfirst3BallTime = first3BallTime
            avgfirst3BallTime = (avgfirst3BallTime + first3BallTime) / 2

            if (avgArea3RemainTime == -1) avgArea3RemainTime = (180-last3Ball)
            avgArea3RemainTime = (avgArea3RemainTime + (180-last3Ball)) / 2
        })

        setGamesStat({
            "firstSeedlingTime": avgfirstSeedlingTime.toFixed(2),
            "first2BallTime": avgfirst2BallTime.toFixed(2),
            "first3BallTime": avgfirst3BallTime.toFixed(2),
            "avgSeedling": avgSeedling.toFixed(2),
            "avgSeedlingTime": avgSeedlingTime.toFixed(2),
            "avgArea2Ball": avg2Ball.toFixed(2),
            "avgArea2BallTime": avg2BallTime.toFixed(2),
            "avgArea3Ball": avg3Ball.toFixed(2),
            "avgArea3BallTime": avg3BallTime.toFixed(2),
            "avgArea3RemainTime": avgArea3RemainTime.toFixed(2),
        })
    }, [gamesArray, gamesSide])

    return (
        <>
            <Textarea height={"15rem"} onChange={(e) => { setTextArea(e.target.value) }} value={textArea} />
            <Flex width={"100%"} justifyContent="space-between">
                <Text fontSize={"0.8rem"}>Enter JSON data separated by new lines</Text>
                {gamesArray.length > 0 && (<Text fontSize={"0.8rem"}>Parsed {gamesArray.length} games</Text>)}
            </Flex>
            <RadioGroup onChange={setGamesSide} value={gamesSide}>
                <Stack direction='row'>
                    <Radio value='RED'>RED</Radio>
                    <Radio value='BLUE'>BLUE</Radio>
                </Stack>
            </RadioGroup>

            {errorAlert >= 0 && (
                <Alert status='error'>
                    <AlertIcon />
                    <AlertTitle>Parse Error</AlertTitle>
                    <AlertDescription>Error at line {errorAlert}</AlertDescription>
                </Alert>
            )} 

            
            {gamesArray.length > 0 && (
            <>
            <TableContainer>
                <Table variant="simple" colorScheme="blue" mt={"2rem"}>
                    <Tbody>
                        {Object.keys(gamesStat).map((key: string) => {
                            const keysplit = DETAIL_TEXT[key].split("|");
                            const boldsplit = keysplit[0].split("$");
                            return (
                                <Tr key={key}>
                                <Td>
                                    <Flex>
                                    {boldsplit[0]}
                                    {
                                        boldsplit.length > 1 && (
                                            <Text fontWeight={"700"} ml={"1rem"}>{boldsplit[1]}</Text>
                                        )
                                    }
                                    {
                                        keysplit.length > 1 && (
                                            <Tooltip label={keysplit[1]} placement="right">
                                                <span style={{marginLeft: "0.5rem", marginTop: "0.2rem"}}><IoMdInformationCircleOutline /></span>
                                            </Tooltip>
                                        )
                                    }
                                    </Flex>
                                </Td>
                                <Td>{gamesStat[key]}</Td>
                                </Tr>
                            );
                        })}
                    </Tbody>
                </Table>
            </TableContainer>
            <Button colorScheme={"green"} mt={"1rem"} onClick={saveData}>Save</Button>
            </>
            )}
        </>
    )
}