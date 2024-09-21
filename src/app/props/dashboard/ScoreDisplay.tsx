import { TEAMS } from "@/app/common/teams";
import { Box, Flex, List, ListItem } from "@chakra-ui/react";
import React, { useRef, useState } from "react";


export function ScoreDisplay(props: any) {

  const [dropDownOpen, setDropDownOpen] = useState(false);
  const scoreDisplayRef = useRef(null);

  return (
    <Flex width={"100%"} alignItems={"center"} justifyContent={"center"}>
      <Box ref={scoreDisplayRef} shadow={"lg"} rounded={"md"} style={{
        fontSize: "2rem",
        textAlign: "center",
        lineHeight: "2.5rem",
        backgroundColor: props.color == "red" ? "#F56565" : props.color == "blue" ? "#11B5E4" : "white",
        color: "black",
        width: "85%",
      }}
      >
        {props.editable ?
          (<Box mt={"1rem"} p={"0"}>
            <Box mt={"1rem"} onClick={() => { setDropDownOpen(!dropDownOpen) }} style={{ cursor: "pointer" }}>
              {props.team.cname}
              <br />
              {props.team.ename}
            </Box>
            {dropDownOpen && <TeamDropDownList setTeam={props.setTeam} color={props.color} currentTeam={props.team.ename} setOpen={setDropDownOpen} parent={scoreDisplayRef} />}
            <Box my={"3rem"} style={{ fontSize: "4rem" }}>
              {props.score}
            </Box>
          </Box>) :
          (<>
            <Box mt={"1rem"}>
              {props.team.cname}
              <br />
              {props.team.ename}
            </Box>
            <Box my={"3rem"} style={{ fontSize: "4rem" }}>
              {props.score}
            </Box>
          </>)}
      </Box>
    </Flex>
  )
}


function TeamDropDownList(props: any) {
  return (
    <Box
      maxH="xs"
      bg="white"
      width={props.parent.current?.clientWidth}
      zIndex={999}
      height="auto"
      maxHeight="10rem"
      overflow="auto"
      borderRadius="lg"
      position="absolute"
      boxShadow="0px 1px 30px rgba(0, 0, 0, 0.1)"
      style={{
        scrollbarWidth: "none",
        scrollbarColor: "transparent transparent"
      }}
    >
      <List>
        {Object.keys(TEAMS).map((region: string) => (
          <React.Fragment key={region}>
            <ListItem
              backgroundColor="gray.300"
              color="#396070"
              fontWeight="bold"
              fontSize="1rem"
            >
              {region}
            </ListItem>
            {TEAMS[region as keyof typeof TEAMS].map((team) => (
              <ListItem
                key={team.ename}
                paddingY={2}
                marginX={2}
                color="#ACB9C4"
                cursor="pointer"
                fontWeight="500"
                fontSize="1.5rem"
                lineHeight="1.5rem"
                textTransform="capitalize"
                onClick={() => {
                  props.setTeam(team, props.color);
                  props.setOpen(false);
                }}
                style={{ transition: "all .125s ease" }}
                _hover={{ bg: "gray.50", color: "#396070" }}
                sx={
                  team?.ename === props.currentTeam
                    ? { backgroundColor: "gray.100", color: "#396070" }
                    : {}
                }
              >
                {team?.ename}
              </ListItem>
            ))}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}