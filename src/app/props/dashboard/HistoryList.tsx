import { Box, Flex, Table, Thead, Tbody, Tr, Th, Td, TableCaption, TableContainer } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

export default function HistoryList(props: any) {


    return (
        <Flex width={"100%"} alignItems={"center"} justifyContent={"center"}>
            <Box
                shadow="lg"
                rounded="md"
                style={{
                    fontSize: "2rem",
                    textAlign: "center",
                    lineHeight: "2.5rem",
                    backgroundColor: "white",
                    color: "black",
                    width: "100%",
                    height: "18rem",
                    overflow: "hidden",
                }}
            >
                <Table variant="striped" size="sm">
                    <Thead>
                        <Tr>
                            <Th width={"50%"}>Action</Th>
                            <Th width={"50%"}>Time</Th>
                        </Tr>
                    </Thead>
                </Table>
                <div
                    style={{
                        overflowY: "scroll",
                        height: "calc(100% - 1.5rem)",
                        scrollbarWidth: "none",
                        scrollbarColor: "transparent transparent",
                    }}
                >
                    <Table variant="striped" size="sm" colorScheme={props.color || "teal"}>
                        <Tbody>
                            {props.history.slice(0).reverse().map((item: any) => {
                                if (item.team === props.color) {
                                    return (
                                        <Tr key={`${Date.now()}${item.action}${item.time}${String(Math.floor(10000000 + Math.random() * 90000000))}`}>
                                            <Td width={"50%"}>{item.action}</Td>
                                            <Td width={"50%"}>{item.time}</Td>
                                        </Tr>
                                    )
                                }
                            })}
                        </Tbody>
                    </Table>
                </div>
            </Box>
        </Flex>
    );
}
