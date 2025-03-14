import { MusicPlayer } from './components/MusicPlayer';
import { songs } from "./data/songs";
import { MusicProvider } from './contexts/MusicContext';
import './App.css';

function App() {
  return (
    <MusicProvider>
      <MusicPlayer audio={songs} />
    </MusicProvider>
  );
}

export default App;