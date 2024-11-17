import { Box, Flex } from "@chakra-ui/react";

function calcualateWidth(counter: number, small: boolean) {
    switch ((counter || 0).toString().length) {
        case 1:
            return small ? "2.0rem" : "2.5rem";
        case 2:
            return small ? "2.5rem" : "3.5rem";
        case 3:
            return small ? "3.0rem" : "4.5rem";
        case 4:
            return small ? "3.5rem" : "5.6rem";
        default:
            return small ? "4.0rem" : "6.8rem";
    }
}

export function Counter(props: any) {
    return (
        <Flex>


            <Box shadow={"lg"} rounded={"lg"} px={"0.5rem"} style={{
                fontSize: props.small ? "1.7rem" : "1.9rem",
                textAlign: "center",
                lineHeight: props.small ? "2rem" : "2.5rem",
                backgroundColor: props.color == "red" ? "#F56565" : props.color == "blue" ? "#11B5E4" : props.color == "gold" ? "#F9A825" : "white",
                color: "black",
                width: calcualateWidth(props.counter, props.small),
                userSelect: "none",
                cursor: "pointer",
            }}
                onClick={() => { !props.smDevice ? props.setCounter((props.counter || 0) + 1) : true }}
                onContextMenu={() => { !props.disableLeftClick && !props.smDevice ? props.setCounter(props.counter - 1 > 0 ? props.counter - 1 : 0) : true }}
            >
                {props.counter || 0}
                {props.smDevice && (<>
                    <Box
                        position={"absolute"}
                        top={"0.3rem"}
                        left={"-2.5rem"}
                        shadow={"md"} rounded={"sm"} style={{
                            fontSize: "1.7rem",
                            textAlign: "center",
                            lineHeight: "2rem",
                            backgroundColor: "white",
                            color: "black",
                            width: "2rem",
                            userSelect: "none",
                            cursor: "pointer",
                        }}
                        onClick={(e) => { console.log("Minus"); e.preventDefault(); props.setCounter(props.counter - 1 > 0 ? props.counter - 1 : 0); }}
                    >
                        {"-"}
                    </Box>
                    <Box
                        position={"absolute"}
                        top={"0.3rem"}
                        left={"3rem"}
                        shadow={"md"} rounded={"sm"} style={{
                            fontSize: "1.7rem",
                            textAlign: "center",
                            lineHeight: "2rem",
                            backgroundColor: "white",
                            color: "black",
                            width: "2rem",
                            userSelect: "none",
                            cursor: "pointer",
                        }}
                        onClick={(e) => { console.log("Plus"); e.preventDefault(); props.setCounter(props.counter + 1); }}
                    >
                        {"+"}
                    </Box>
                </>)}
            </Box>
        </Flex >
    )
}