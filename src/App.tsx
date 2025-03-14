import { MusicPlayer } from './components/MusicPlayer';
import { songs } from "./data/songs";
import { MusicProvider } from './contexts/MusicContext';
import './App.css';

function App() {
  const normalizedSongs = songs.map(song => ({
    name: song.title || song.name || 'Unknown',
    artist: song.artist || song.author || 'Unknown',
    url: song.url,
    cover: song.cover || song.pic || '',
    lrc: song.lrc,
    theme: song.theme
  }));

  return (
    <MusicProvider>
      <MusicPlayer audio={normalizedSongs} autoplay={true} />
    </MusicProvider>
  );
}

export default App;