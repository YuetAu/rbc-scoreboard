import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Button, ButtonGroup, Flex, Input, Table, TableContainer, Tbody, Td, Text, Tr } from "@chakra-ui/react"
import Teams from "./grouping.json";
import Games from "./games.json";


export default function FirstRoundTab(props: any) {

    const gameWinSide = (team: any, game: any) => {
        props.setGamesResult((prev: any) => {
            let newResult = {...prev};
            newResult[game] = {...newResult[game], "winner": team};
            return newResult;
        });
    }

    return (
        <>
            <Accordion>
            {Games.groupMatches.map((match: any, index: number) => {
               return (
                    <AccordionItem key={match}>
                        <AccordionButton>
                            <Flex width={"100%"} justifyContent="space-between">
                                {Teams.filter((t)=>t.group==match[0][0]&&t.pos==match[0][1]).map((team: any) => (
                                    <Text key={team.cname} fontWeight={"700"} textColor={"#11B5E4"} width={"20rem"}>{team.cname}</Text>
                                ))}
                                {Teams.filter((t)=>t.group==match[1][0]&&t.pos==match[1][1]).map((team: any) => (
                                    <Text key={team.cname} fontWeight={"700"} textColor={"#F56565"} width={"20rem"}>{team.cname}</Text>
                                ))}
                                <AccordionIcon />
                            </Flex>
                        </AccordionButton>
                        <AccordionPanel pb={"1rem"} px={"5rem"}>
                            <Flex>
                            <ButtonGroup isAttached mx={"1rem"}>
                                <Button size={"sm"} backgroundColor={"#11B5E4"} textColor={"white"} isActive={index in props.gamesResult && "winner" in props.gamesResult[index] && props.gamesResult[index].winner==0} onClick={(e)=>{gameWinSide(0, index)}}>BLUE</Button>
                                <Button size={"sm"} backgroundColor={"#F56565"} textColor={"white"} isActive={index in props.gamesResult && "winner" in props.gamesResult[index] && props.gamesResult[index].winner==1} onClick={(e)=>{gameWinSide(1, index)}}>RED</Button>
                            </ButtonGroup>
                            <Input type="number" width={"10rem"} size={"sm"} mx={"1rem"} placeholder="Muvang Time" value={index in props.gamesResult? props.gamesResult[index].muvang : ""} onChange={(e) => {props.setGamesResult((prev: any) => {
                                let newResult = {...prev};
                                newResult[index] = {...newResult[index], "muvang": parseInt(e.target.value)};
                                return newResult;
                            })}} />
                            </Flex>
                        </AccordionPanel>
                    </AccordionItem>
                )
            })}
            </Accordion>
        </>
    )
}