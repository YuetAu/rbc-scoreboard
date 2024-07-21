import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Button, ButtonGroup, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Games from "./games.json";
import Teams from "./grouping.json";

const GROUPS = ["A", "B", "C", "D", "E"];

export default function SecondRoundTab(props: any) {

    const gameWinSide = (team: any, game: any) => {
        props.setGames2Result((prev: any) => {
            let newResult = {...prev};
            newResult[game] = {...newResult[game], "winner": team};
            return newResult;
        });
    }

    const getTeamWins = (cname: any) => {
        let wins = 0;
        Object.keys(props.gamesResult).map((gameInt: any) => {
            const game = Games.groupMatches[parseInt(gameInt)];
            const teamsInGame = [Teams.filter((t)=>t.group==game[0][0]&&t.pos==game[0][1])[0], Teams.filter((t)=>t.group==game[1][0]&&t.pos==game[1][1])[0]];
            if (teamsInGame[props.gamesResult[gameInt].winner].cname==cname) {
                wins += 1;
            }
        })
        return wins;
    }

    const getTeamMuvang = (cname: any) => {
        let muvang = 0;
        Object.keys(props.gamesResult).map((gameInt: any) => {
            const game = Games.groupMatches[parseInt(gameInt)];
            const teamsInGame = [Teams.filter((t)=>t.group==game[0][0]&&t.pos==game[0][1])[0], Teams.filter((t)=>t.group==game[1][0]&&t.pos==game[1][1])[0]];
            if (props.gamesResult[gameInt].muvang) {
                if (teamsInGame[props.gamesResult[gameInt].winner].cname==cname) {
                    muvang += 1;
                }
            }
        })
        return muvang;
    }

    const getTeamShortestMuvang = (cname: any) => {
        let shortestMuvang = 181
        Object.keys(props.gamesResult).map((gameInt: any) => {
            const game = Games.groupMatches[parseInt(gameInt)];
            const teamsInGame = [Teams.filter((t)=>t.group==game[0][0]&&t.pos==game[0][1])[0], Teams.filter((t)=>t.group==game[1][0]&&t.pos==game[1][1])[0]];
            if (props.gamesResult[gameInt].muvang) {
                if (teamsInGame[props.gamesResult[gameInt].winner].cname==cname) {
                    if (props.gamesResult[gameInt].muvang<shortestMuvang) {
                        shortestMuvang = props.gamesResult[gameInt].muvang;
                    }
                }
            }
        })
        return shortestMuvang;
    }

    const getRank = () => {
        let top5: any[] = []
        let after3: any[] = []
        GROUPS.forEach((group: string) => {
            const groupRank = Teams.filter((t)=>t.group==group)
                            .sort((a,b)=>getTeamShortestMuvang(a.cname)-getTeamShortestMuvang(b.cname))
                            .sort((a,b)=>getTeamMuvang(b.cname)-getTeamMuvang(a.cname))
                            .sort((a,b)=>getTeamWins(b.cname)-getTeamWins(a.cname))
            top5.push(groupRank[0])
            after3.push(groupRank[1])
        })
        top5 = top5.sort((a,b)=>getTeamShortestMuvang(a.cname)-getTeamShortestMuvang(b.cname))
            .sort((a,b)=>getTeamMuvang(b.cname)-getTeamMuvang(a.cname))
            .sort((a,b)=>getTeamWins(b.cname)-getTeamWins(a.cname))
        after3 = after3.sort((a,b)=>getTeamShortestMuvang(a.cname)-getTeamShortestMuvang(b.cname))
            .sort((a,b)=>getTeamMuvang(b.cname)-getTeamMuvang(a.cname))
            .sort((a,b)=>getTeamWins(b.cname)-getTeamWins(a.cname))

        const ranks = top5.concat(after3.slice(0,3))
        return ranks
    }

    const [rank, setRank] = useState<any>([]);

    useEffect(() => {
        setRank(getRank());
        console.log(getRank())
    }, [props.gamesResult])

    return (
        <>
            <Accordion>
            {Games.round2.map((match: any, index: number) => {
               return (
                    <AccordionItem key={match}>
                        <AccordionButton>
                            <Flex width={"100%"} justifyContent="space-between">
                                <Text fontWeight={"700"} textColor={"#11B5E4"} width={"20rem"}>{rank[match[0]] && rank[match[0]].cname}</Text>
                                <Text fontWeight={"700"} textColor={"#F56565"} width={"20rem"}>{rank[match[1]] && rank[match[1]].cname}</Text>
                                <AccordionIcon />
                            </Flex>
                        </AccordionButton>
                        <AccordionPanel pb={"1rem"} px={"5rem"}>
                            <Flex>
                            <ButtonGroup isAttached mx={"1rem"}>
                                <Button size={"sm"} backgroundColor={"#11B5E4"} textColor={"white"} isActive={index in props.games2Result && "winner" in props.games2Result[index] && props.games2Result[index].winner==0} onClick={(e)=>{gameWinSide(0, index)}}>BLUE</Button>
                                <Button size={"sm"} backgroundColor={"#F56565"} textColor={"white"} isActive={index in props.games2Result && "winner" in props.games2Result[index] && props.games2Result[index].winner==1} onClick={(e)=>{gameWinSide(1, index)}}>RED</Button>
                            </ButtonGroup>
                            <Input type="number" width={"10rem"} size={"sm"} mx={"1rem"} placeholder="Muvang Time" value={index in props.games2Result? props.games2Result[index].muvang : ""} onChange={(e) => {props.setGamesResult((prev: any) => {
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