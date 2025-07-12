import * as React from "react";
import TheGameBoard from "./Board";

const mockMatchData = [
    { id: '0', name: 'Player 1' },
    { id: '1', name: 'Player 2' },
    { id: '2', name: 'Player 3' },
    { id: '3', name: 'Player 4' },
    { id: '4', name: 'Player 5' }
];

const LocalBoard = (props) => {
    return (
        <TheGameBoard {...props} matchData={mockMatchData}/>
    );
}

export default LocalBoard;