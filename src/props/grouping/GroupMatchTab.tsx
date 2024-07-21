import { Badge, Flex, Table, TableContainer, Tbody, Td, Text, Tr } from "@chakra-ui/react"
import Teams from "./grouping.json";
import Games from "./games.json";

const GROUPS = ["A", "B", "C", "D", "E"];

export default function GroupMatchTab(props: any) {

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

    const getTeamLose = (cname: any) => {
        let lose = 0;
        Object.keys(props.gamesResult).map((gameInt: any) => {
            const game = Games.groupMatches[parseInt(gameInt)];
            const teamsInGame = [Teams.filter((t)=>t.group==game[0][0]&&t.pos==game[0][1])[0], Teams.filter((t)=>t.group==game[1][0]&&t.pos==game[1][1])[0]];
            if (teamsInGame[1-props.gamesResult[gameInt].winner].cname==cname) {
                lose += 1;
            }
        })
        return lose;
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

    const getTeamRank = (cname: any) => {
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
        return ranks.map((t: any) => t.cname).indexOf(cname)+1
    }

    return (
        <>  
            {
                GROUPS.map((group: string) => {
                    return (
                        <>
                        <Text fontSize={"1.5rem"} my={"1rem"}>Group {group}</Text>
                        <TableContainer>
                            <Table>
                                <Tbody>
                                    {Teams.filter((t)=>t.group==group)
                                    .sort((a,b)=>a.pos-b.pos)
                                    .sort((a,b)=>getTeamShortestMuvang(a.cname)-getTeamShortestMuvang(b.cname))
                                    .sort((a,b)=>getTeamMuvang(b.cname)-getTeamMuvang(a.cname))
                                    .sort((a,b)=>getTeamWins(b.cname)-getTeamWins(a.cname))
                                    .map((team: any, index: number) => (
                                        <Tr key={team.cname} backgroundColor={getTeamRank(team.cname)<1 ? "white": getTeamRank(team.cname)<=5 ? "#f7dc6f": "#f0b27a"}>
                                            <Td>{team.cname}</Td>
                                            <Td>{team.ename}</Td>
                                            <Td>
                                                <Badge colorScheme={"green"}>
                                                    {getTeamWins([team.cname])} Wins
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <Badge colorScheme={"red"}>
                                                    {getTeamLose([team.cname])} Loss
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <Badge colorScheme={"orange"}>
                                                    {getTeamMuvang([team.cname])} Muvang
                                                </Badge>
                                                {getTeamMuvang([team.cname])>0 && 
                                                    <Badge ml={"0.2rem"} colorScheme={"orange"}>{getTeamShortestMuvang([team.cname])}s</Badge>
                                                }
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </TableContainer>
                        </>
                    )
                })
            }
        </>
    )
}