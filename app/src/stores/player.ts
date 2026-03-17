import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type Track } from '../utils/api';

export type PlayMode = 'sequence' | 'random' | 'loop';

export interface PlayingTrack extends Track {
  audioUrl?: string;
}

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<PlayingTrack | null>(null);
  const queue = ref<PlayingTrack[]>([]);
  const currentIndex = ref(-1);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const totalDuration = ref(0);
  const playMode = ref<PlayMode>('sequence');

  let audioContext: UniApp.InnerAudioContext | null = null;

  function getAudio() {
    if (!audioContext) {
      audioContext = uni.createInnerAudioContext();
      audioContext.onTimeUpdate(() => {
        currentTime.value = audioContext!.currentTime || 0;
        totalDuration.value = audioContext!.duration || 0;
      });
      audioContext.onEnded(() => {
        playNext();
      });
      audioContext.onError((err) => {
        console.error('Audio error:', err);
        isPlaying.value = false;
      });
    }
    return audioContext;
  }

  async function play(track: PlayingTrack) {
    try {
      const streamInfo = await api.getAudioStream(track.bvid, track.cid);
      const proxyUrl = api.getAudioProxyUrl(streamInfo.url);

      const audio = getAudio();
      audio.src = proxyUrl;
      audio.play();

      currentTrack.value = { ...track, audioUrl: proxyUrl };
      isPlaying.value = true;

      const idx = queue.value.findIndex(
        (t) => t.bvid === track.bvid && t.cid === track.cid
      );
      if (idx >= 0) {
        currentIndex.value = idx;
      }
    } catch (err: any) {
      console.error('Play failed:', err);
      uni.showToast({ title: err.message || '播放失败', icon: 'none' });
    }
  }

  function togglePlay() {
    const audio = getAudio();
    if (isPlaying.value) {
      audio.pause();
      isPlaying.value = false;
    } else if (currentTrack.value) {
      audio.play();
      isPlaying.value = true;
    }
  }

  function seekTo(time: number) {
    const audio = getAudio();
    audio.seek(time);
    currentTime.value = time;
  }

  function playNext() {
    if (queue.value.length === 0) return;

    if (playMode.value === 'loop' && currentTrack.value) {
      play(currentTrack.value);
      return;
    }

    let nextIdx: number;
    if (playMode.value === 'random') {
      nextIdx = Math.floor(Math.random() * queue.value.length);
    } else {
      nextIdx = (currentIndex.value + 1) % queue.value.length;
    }

    currentIndex.value = nextIdx;
    play(queue.value[nextIdx]);
  }

  function playPrev() {
    if (queue.value.length === 0) return;

    let prevIdx: number;
    if (playMode.value === 'random') {
      prevIdx = Math.floor(Math.random() * queue.value.length);
    } else {
      prevIdx =
        currentIndex.value <= 0
          ? queue.value.length - 1
          : currentIndex.value - 1;
    }

    currentIndex.value = prevIdx;
    play(queue.value[prevIdx]);
  }

  function setQueue(tracks: PlayingTrack[], startIndex = 0) {
    queue.value = tracks;
    currentIndex.value = startIndex;
    if (tracks.length > 0) {
      play(tracks[startIndex]);
    }
  }

  function addToQueue(track: PlayingTrack) {
    const exists = queue.value.some(
      (t) => t.bvid === track.bvid && t.cid === track.cid
    );
    if (!exists) {
      queue.value.push(track);
    }
  }

  function togglePlayMode() {
    const modes: PlayMode[] = ['sequence', 'random', 'loop'];
    const idx = modes.indexOf(playMode.value);
    playMode.value = modes[(idx + 1) % modes.length];
  }

  const playModeLabel = computed(() => {
    const labels: Record<PlayMode, string> = {
      sequence: '顺序播放',
      random: '随机播放',
      loop: '单曲循环',
    };
    return labels[playMode.value];
  });

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    totalDuration,
    playMode,
    playModeLabel,
    play,
    togglePlay,
    seekTo,
    playNext,
    playPrev,
    setQueue,
    addToQueue,
    togglePlayMode,
    formatTime,
  };
});
