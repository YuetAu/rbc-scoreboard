import { Box, Flex, Text } from "@chakra-ui/react";


export function ShotClock(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"} style={{
                textAlign: "center",
                lineHeight: "1.8rem",
                backgroundColor: props.color == "red" ? "#F56565" : props.color == "blue" ? "#11B5E4" : props.color == "gold" ? "#F9A825" : "white",
                animation: (!props.clockPaused) ? `${props.color}Possession 0.5s linear infinite` : props.possessionData.get("nextPossession") == props.color && (!props.possessionClockPaused) ? `${props.color}Possession 1.5s linear infinite` : "none",
                color: "black",
                width: "7rem",
                userSelect: "none",
                cursor: "pointer",
            }}
                onClick={(e) => { e.preventDefault(); props.possessionData.set("nextPossession", props.color) }}
                onContextMenu={(e) => { e.preventDefault(); props.resetClock(); props.startClock(); }}
            >
                <Text fontSize={"0.5em"}>Shot Clock</Text>
                <Text fontSize={"0.8em"} margin={"0.2rem"} fontFamily={"'Source Code Pro Variable', sans-serif"}>{props.timeText.seconds}.{props.timeText.milliseconds}</Text>
            </Box>
        </Flex>
    )
}

export function PossessionClock(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"} style={{
                textAlign: "center",
                lineHeight: "1.8rem",
                backgroundColor: "white",
                color: "black",
                width: "7rem",
                userSelect: "none",
                cursor: "pointer",
            }}
                onClick={(e) => { e.preventDefault(); props.resetClock(); props.startClock(); }}
                onContextMenu={(e) => { e.preventDefault(); }}
            >
                <Text fontSize={"0.5em"}>Possession</Text>
                <Text fontSize={"0.8em"} margin={"0.2rem"} fontFamily={"'Source Code Pro Variable', sans-serif"}>{props.timeText.seconds}.{props.timeText.milliseconds}</Text>
            </Box>
        </Flex>
    )
}