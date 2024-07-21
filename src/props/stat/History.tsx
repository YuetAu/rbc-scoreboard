import { Button, Table, TableContainer, Tbody, Td, Thead, Tr, useToast } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

export default function HistoryTab(props: any) {

    

    return (
        <>
            <Table>
                <Thead>
                    <Td>
                        <Button colorScheme="red" onClick={props.clearSave}>Clear</Button>
                    </Td>
                    {Object.keys(props.history).map((key: any) => {
                        return (
                            <Td key={key}>
                                {key}
                            </Td>
                        )
                    })}
                </Thead>
                <Tbody>
                    <Tr>
                        <Td>
                            Average time of first seedling of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].firstSeedlingTime}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average time first shot in Area 2 of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].first2BallTime}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average number of seedlings placed of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgSeedling}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average time between placing seedlings of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgSeedlingTime}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average number of balls shooted of Area 2 of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgArea2Ball}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average time between shooting balls of Area 2 of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgArea2BallTime}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average number of balls placed in silos of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgArea3Ball}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average time between placing balls in silos of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgArea3BallTime}
                                </Td>
                            )
                        })}
                    </Tr>
                    <Tr>
                        <Td>
                            Average remaining time after the last ball is placed in the silo of all games
                        </Td>
                        {Object.keys(props.history).map((key: any) => {
                            return (
                                <Td key={key}>
                                    {props.history[key].avgArea3RemainTime}
                                </Td>
                            )
                        })}
                    </Tr>
                </Tbody>

            </Table>
        </>
    )
}