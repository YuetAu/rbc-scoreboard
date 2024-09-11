import { Box, Flex, Text } from "@chakra-ui/react";


export function ShotClock(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"} style={{
                position: "relative",
                textAlign: "center",
                lineHeight: "1.8rem",
                backgroundColor: props.color == "red" ? "#F56565" : props.color == "blue" ? "#11B5E4" : props.color == "gold" ? "#F9A825" : "white",
                animation: (!props.clockPaused) ? `${props.color}Possession 0.5s linear infinite` : props.possessionData.get("nextPossession") == props.color && (!props.possessionClockPaused) ? `${props.color}Possession 1.5s linear infinite` : "none",
                color: "black",
                width: "7rem",
                userSelect: "none",
                cursor: "pointer",
            }}
                onClick={(e) => { !props.smDevice ? props.possessionData.set("nextPossession", props.color) : true }}
                onContextMenu={() => { if (!props.smDevice) { props.resetClock(); props.startClock(); } }}
            >
                <Text fontSize={"0.5em"}>Shot Clock</Text>
                <Text fontSize={"0.8em"} margin={"0.2rem"} fontFamily={"'Source Code Pro Variable', sans-serif"}>{props.timeText.seconds}.{props.timeText.milliseconds}</Text>
                {props.smDevice && (<>
                    <Box
                        position={"absolute"}
                        top={"4.5rem"}
                        left={"-0.5rem"}
                        width={"8rem"}
                        zIndex={5}
                        backgroundColor={props.possessionData.get("nextPossession") == props.color ? "gray.500" : "white"}
                        shadow={"md"} rounded={"sm"} style={{
                            fontSize: "1rem",
                            textAlign: "center",
                            lineHeight: "2rem",
                            color: "black",
                            //width: "2rem",
                            userSelect: "none",
                            cursor: "pointer",
                        }}
                        onClick={() => { props.possessionData.set("nextPossession", props.color); }}
                    >
                        {"Next Possession"}
                    </Box>
                    <Box
                        position={"absolute"}
                        top={"7rem"}
                        left={"-0.5rem"}
                        width={"8rem"}
                        zIndex={5}
                        backgroundColor={props.clockPaused ? "white" : "gray.500"}
                        shadow={"md"} rounded={"sm"} style={{
                            fontSize: "1rem",
                            textAlign: "center",
                            lineHeight: "2rem",
                            color: "black",
                            //width: "2rem",
                            userSelect: "none",
                            cursor: "pointer",
                        }}
                        onClick={() => { if (props.clockPaused) { props.resetClock(); props.startClock(); } }}
                    >
                        {"Start Now"}
                    </Box>
                </>)}
            </Box>
        </Flex >
    )
}

export function PossessionClock(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"}
                backgroundColor={"white"}
                style={{
                    position: "relative",
                    textAlign: "center",
                    lineHeight: "1.8rem",
                    color: "black",
                    width: "7rem",
                    userSelect: "none",
                    cursor: "pointer",
                }}
                onClick={(e) => { if (!props.smDevice) { props.resetClock(); props.startClock(); } }}
            >
                <Text fontSize={"0.5em"}>Possession</Text>
                <Text fontSize={"0.8em"} margin={"0.2rem"} fontFamily={"'Source Code Pro Variable', sans-serif"}>{props.timeText.seconds}.{props.timeText.milliseconds}</Text>

                {props.smDevice && (<>
                    <Box
                        position={"absolute"}
                        top={"4.5rem"}
                        left={"-0.5rem"}
                        width={"8rem"}
                        zIndex={5}
                        backgroundColor={props.clockPaused ? "white" : "gray.500"}
                        shadow={"md"} rounded={"sm"} style={{
                            fontSize: "1rem",
                            textAlign: "center",
                            lineHeight: "2rem",
                            color: "black",
                            //width: "2rem",
                            userSelect: "none",
                            cursor: "pointer",
                        }}
                        onClick={() => { if (props.clockPaused) { props.resetClock(); props.startClock(); } }}
                    >
                        {"Start Now"}
                    </Box>
                </>)}
            </Box>
        </Flex>
    )
}