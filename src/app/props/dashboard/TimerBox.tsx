import { GAME_STAGES, GAME_STAGES_TEXT } from "@/app/common/gameStages";
import { Box, Button, ButtonGroup } from "@chakra-ui/react";
import "@fontsource-variable/source-code-pro";

export default function TimerBox(props: any) {
    const time = props.timeText;
    return (
        <>
            <Box style={{
                position: "relative",
                fontSize: props.hidden ? "3.5rem" : "2rem",
                textAlign: "center",
                height: "1.5rem",
                lineHeight: props.hidden ? "2rem" : "1rem",
                userSelect: "none",
            }}>
                {props.shorthand ? props.gameStage : GAME_STAGES_TEXT[GAME_STAGES.indexOf(props.gameStage)]}
            </Box>
            <Box style={{
                position: "relative",
                fontSize: "5rem",
                textAlign: "center",
                height: "4.5rem",
                margin: "0",
                padding: "0",
                fontFamily: "'Source Code Pro Variable', sans-serif",
                fontWeight: "600",
                lineHeight: props.hidden ? "1rem" : "4.5rem",
                userSelect: "none",
            }}>
                {time.minutes}:{time.seconds}.{time.milliseconds}
            </Box>
            <Box hidden={props.hidden} style={{
                position: "relative",
                height: "4rem",
                textAlign: "center",
            }}>
                <ButtonGroup spacing='2'>
                    <Button onClick={() => props.changeStage(-1)}>{"<<"}Prev</Button>
                    <Button onClick={() => props.changeStage(1)}>Next{">>"}</Button>
                    <Button colorScheme={props.clockToggle ? "red" : "green"} onClick={props.toggleClock}>{props.clockToggle ? "Stop" : "Start"}</Button>
                    <Button colorScheme="red" onClick={props.resetStage}>Reset</Button>
                </ButtonGroup>
            </Box>
        </>
    )
}