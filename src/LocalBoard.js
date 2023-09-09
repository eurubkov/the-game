import TheGameBoard from "./Board";

const mockMatchData = [
    { id: '0', name: 'Player 1' },
    { id: '1', name: 'Player 2' }
];

const LocalBoard = (props) => {
    return (
        <TheGameBoard {...props} matchData={mockMatchData}/>
    );
}

export default LocalBoard;