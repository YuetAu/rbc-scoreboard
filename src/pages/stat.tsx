'use client'
import Calculator from "@/props/stat/Calculator";
import { Box, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useToast } from "@chakra-ui/react";
import "@fontsource-variable/quicksand";
import { useRef, useState, useEffect } from "react";

import dynamic from 'next/dynamic'
const HistoryTab = dynamic(() => import('@/props/stat/History'), { ssr: false })



export default function Dashboard(props: any) {

    const isFirstReadHistory = useRef(true);
    const [history, setHistory] = useState({});

    const toast = useToast();

    useEffect(() => {
        if (isFirstReadHistory.current) {
            isFirstReadHistory.current = false;
            const historyJson = localStorage.getItem("statData");
            if (historyJson) {
                setHistory(JSON.parse(historyJson));
                toast({
                    title: "History Loaded",
                    description: `Loaded ${Object.keys(history).length} entries`,
                    status: "success",
                    duration: 9000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: "History Not Found",
                    description: "No history found",
                    status: "error",
                    duration: 9000,
                    isClosable: true,
                });
            }
        }
    }, [])

    const clearSave = () => {
        localStorage.setItem("statData", JSON.stringify({}));
        setHistory({});
        toast({
            title: "Success",
            description: "Cleared history",
            status: "success",
            duration: 5000,
            isClosable: true,
        })
    }

    return (
        <>
            <Box m={"2rem"}>
                <Text fontSize={"2rem"} my={"1rem"}>Stat</Text>
                <Tabs>
                    <TabList>

                        <Tab>Calculator</Tab>
                        <Tab>History</Tab>
                        
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            <Calculator setHistory={setHistory} />
                        </TabPanel>
                        <TabPanel>
                            <HistoryTab history={history} clearSave={clearSave} />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
                
                
            </Box>
        </>
        
    )
}
