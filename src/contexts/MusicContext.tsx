import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { songs } from '../data/songs';

export interface Song {
  name?: string;
  title?: string;
  artist?: string;
  author?: string;
  url: string;
  cover?: string;
  pic?: string;
  lrc?: string;
  theme?: string;
}

type NormalizedSong = {
  name: string;
  artist: string;
  url: string;
  cover: string;
  lrc?: string;
  theme?: string;
}

const normalizeSong = (song: Song): NormalizedSong => ({
  name: song.name || song.title || 'Unknown',
  artist: song.artist || song.author || 'Unknown',
  url: song.url,
  cover: song.cover || song.pic || '',
  lrc: song.lrc,
  theme: song.theme
});

interface MusicState {
  playlist: Song[];
  currentIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: 'list' | 'random' | 'single';
  randomOrder: number[];
  showPlaylist: boolean;
  currentView: 'cover' | 'lyrics';
  error: string | null;
  loading: boolean;
  songDurations: { [key: string]: number };
}

type MusicAction =
  | { type: 'SET_PLAYLIST'; payload: Song[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PLAY_MODE'; payload: 'list' | 'random' | 'single' }
  | { type: 'SET_RANDOM_ORDER'; payload: number[] }
  | { type: 'TOGGLE_PLAYLIST' }
  | { type: 'SET_CURRENT_VIEW'; payload: 'cover' | 'lyrics' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SONG_DURATION'; payload: { url: string; duration: number } };

const initialState: MusicState = {
  playlist: songs.map(normalizeSong) as NormalizedSong[],
  currentIndex: 0,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  playMode: 'list',
  randomOrder: [],
  showPlaylist: false,
  currentView: 'cover',
  error: null,
  loading: false,
  songDurations: {}
};

const musicReducer = (state: MusicState, action: MusicAction): MusicState => {
  switch (action.type) {
    case 'SET_PLAYLIST':
      return { ...state, playlist: action.payload };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'SET_PLAYING':
      return { ...state, playing: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_PLAY_MODE':
      return { ...state, playMode: action.payload };
    case 'SET_RANDOM_ORDER':
      return { ...state, randomOrder: action.payload };
    case 'TOGGLE_PLAYLIST':
      return { ...state, showPlaylist: !state.showPlaylist };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SONG_DURATION':
      return {
        ...state,
        songDurations: {
          ...state.songDurations,
          [action.payload.url]: action.payload.duration
        }
      };
    default:
      return state;
  }
};

interface MusicContextType {
  state: MusicState;
  dispatch: React.Dispatch<MusicAction>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(musicReducer, initialState);

  return (
    <MusicContext.Provider value={{ state, dispatch }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusicContext must be used within a MusicProvider');
  }
  return context;
};

