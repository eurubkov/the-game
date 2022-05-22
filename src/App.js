import { Client } from "boardgame.io/react";
import { TheGame } from "./Game"

const App = Client({ game: TheGame });
export default App;