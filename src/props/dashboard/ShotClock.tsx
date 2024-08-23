import { Box, Flex, Text } from "@chakra-ui/react";


export function ShotClock(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"} style={{
                textAlign: "center",
                lineHeight: "1.8rem",
                backgroundColor: props.color == "red" ? "#F56565" : props.color == "blue" ? "#11B5E4" : props.color == "gold" ? "#F9A825" : "white",
                color: "black",
                width: "7rem",
                userSelect: "none",
                cursor: "pointer",
            }}
                onClick={(e) => { e.preventDefault(); }}
                onContextMenu={(e) => { e.preventDefault(); }}
            >
                <Text fontSize={"0.5em"}>Shot Clock</Text>
                <Text fontSize={"0.8em"} margin={"0.2rem"}>20</Text>
            </Box>
        </Flex>
    )
}