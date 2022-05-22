import { Client } from "boardgame.io/react";
import TheGameBoard from "./Board";
import { TheGame } from "./Game"

const App = Client({ game: TheGame, board: TheGameBoard });
export default App;