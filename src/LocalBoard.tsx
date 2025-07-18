import * as React from "react";
import { useEffect, useState } from "react";
import TheGameBoard from "./Board";

// Default match data with player names
const defaultMatchData = [
    { id: '0', name: 'You' },
    { id: '1', name: 'Bot 1' },
    { id: '2', name: 'Bot 2' },
    { id: '3', name: 'Bot 3' },
    { id: '4', name: 'Bot 4' }
];

const LocalBoard = (props) => {
    const [matchData, setMatchData] = useState(defaultMatchData);
    
    useEffect(() => {
        // Check if we're in a multiplayer game with bots
        if (props.ctx && props.ctx.numPlayers) {
            const numPlayers = props.ctx.numPlayers;
            const customMatchData = [...defaultMatchData];
            
            // If we have a playerID and it's not "observer", mark the current player as "You"
            if (props.playerID !== undefined && props.playerID !== null && props.playerID !== "observer") {
                customMatchData[parseInt(props.playerID)].name = 'You';
            } else if (props.playerID === "observer") {
                // In observer mode (bot test), rename all players to "Bot X"
                for (let i = 0; i < numPlayers; i++) {
                    customMatchData[i].name = `Bot ${i + 1}`;
                }
            }
            
            // Update match data based on the number of players
            setMatchData(customMatchData.slice(0, numPlayers));
        }
    }, [props.ctx, props.playerID]);
    
    return (
        <TheGameBoard {...props} matchData={matchData}/>
    );
}

export default LocalBoard;
