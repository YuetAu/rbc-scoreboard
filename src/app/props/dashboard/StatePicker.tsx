import { Box, Flex } from "@chakra-ui/react";


export function StatePicker(props: any) {
    return (
        <Flex>
            <Box shadow={"lg"} rounded={"lg"} px={"0.5rem"} style={{
                fontSize: props.small ? "1.4rem" : "2rem",
                fontWeight: "600",
                textAlign: "center",
                lineHeight: props.small ? "1.6rem" : "2.5rem",
                backgroundColor: (props.state as boolean) ? "#599f6e" : props.color == "red" ? "#F56565" : props.color == "blue" ? "#11B5E4" : props.color == "gold" ? "#F9A825" : "white",
                color: "black",
                userSelect: "none",
                cursor: "pointer",
            }}
                onClick={() => { props.setState((!props.state as boolean) ? 1 : 0); }}
            >
                {props.placeholder}
            </Box>
        </Flex >
    )
}