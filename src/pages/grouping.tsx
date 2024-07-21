'use client'
import FirstRoundTab from "@/props/grouping/FirstRoundTab";
import GroupMatchTab from "@/props/grouping/GroupMatchTab";
import SecondRoundTab from "@/props/grouping/SecondRoundTab";
import { Box, Textarea, Text, Alert, AlertIcon, AlertTitle, AlertDescription, RadioGroup, Stack, Radio, Table, TableContainer, Td, Thead, Tbody, Tr, Tooltip, Flex, Tabs, TabList, Tab, TabPanels, TabPanel } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { useEffect, useState } from "react";



export default function Grouping(props: any) {

    const [round1GamesResult, setRound1GamesResult] = useState({});

    const [round2GameResult, setRound2GameResult] = useState({});

    return (
        <>
            <Box m={"2rem"}>
                <Text fontSize={"2rem"} my={"1rem"}>Grouping</Text>
                <Tabs>
                    <TabList>

                        <Tab>Group Match</Tab>
                        <Tab>First Round</Tab>
                        <Tab>Second Round</Tab>
                        
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            <GroupMatchTab gamesResult={round1GamesResult} />
                        </TabPanel>
                        <TabPanel>
                            <FirstRoundTab gamesResult={round1GamesResult} setGamesResult={setRound1GamesResult} />
                        </TabPanel>
                        <TabPanel>
                            <SecondRoundTab gamesResult={round1GamesResult} setGamesResult={setRound1GamesResult} games2Result={round2GameResult} setGames2Result={setRound2GameResult} />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
                
                
            </Box>
        </>
    )
}
