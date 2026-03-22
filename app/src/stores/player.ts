import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type Track } from '../utils/api';

export type PlayMode = 'sequence' | 'random' | 'loop';

export interface PlayingTrack extends Track {
  audioUrl?: string;
}

function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

interface AudioAdapter {
  play(url: string, meta?: { title?: string; artist?: string; cover?: string }): void;
  pause(): void;
  resume(): void;
  seek(time: number): void;
  stop(): void;
  onTimeUpdate(cb: (currentTime: number, duration: number) => void): void;
  onEnded(cb: () => void): void;
  onError(cb: (err: any) => void): void;
  onMediaAction?(cb: (action: string) => void): void;
}

function createNativeAudioAdapter(): AudioAdapter {
  const cap = (window as any).Capacitor;
  const NativeAudio = cap.Plugins.NativeAudio;

  let timeUpdateCb: ((t: number, d: number) => void) | null = null;
  let endedCb: (() => void) | null = null;
  let errorCb: ((err: any) => void) | null = null;
  let mediaActionCb: ((action: string) => void) | null = null;

  NativeAudio.addListener('timeUpdate', (data: any) => {
    timeUpdateCb?.(data.currentTime, data.duration);
  });
  NativeAudio.addListener('ended', () => {
    endedCb?.();
  });
  NativeAudio.addListener('error', (data: any) => {
    errorCb?.(data);
  });
  NativeAudio.addListener('mediaAction', (data: any) => {
    mediaActionCb?.(data.action);
  });

  return {
    play(url: string, meta?: { title?: string; artist?: string; cover?: string }) {
      NativeAudio.play({ url, title: meta?.title || '', artist: meta?.artist || '', cover: meta?.cover || '' });
    },
    pause() {
      NativeAudio.pause();
    },
    resume() {
      NativeAudio.resume();
    },
    seek(time: number) {
      NativeAudio.seek({ time });
    },
    stop() {
      NativeAudio.stop();
    },
    onTimeUpdate(cb) { timeUpdateCb = cb; },
    onEnded(cb) { endedCb = cb; },
    onError(cb) { errorCb = cb; },
    onMediaAction(cb) { mediaActionCb = cb; },
  };
}

function createWebAudioAdapter(): AudioAdapter {
  const ctx = uni.createInnerAudioContext();
  let timeUpdateCb: ((t: number, d: number) => void) | null = null;
  let endedCb: (() => void) | null = null;

  ctx.onTimeUpdate(() => {
    timeUpdateCb?.(ctx.currentTime || 0, ctx.duration || 0);
  });
  ctx.onEnded(() => {
    endedCb?.();
  });

  return {
    play(url: string, _meta?: { title?: string; artist?: string; cover?: string }) {
      ctx.src = url;
      ctx.play();
    },
    pause() {
      ctx.pause();
    },
    resume() {
      ctx.play();
    },
    seek(time: number) {
      ctx.seek(time);
    },
    stop() {
      ctx.stop();
    },
    onTimeUpdate(cb) { timeUpdateCb = cb; },
    onEnded(cb) { endedCb = cb; },
    onError(cb) { ctx.onError(cb); },
  };
}

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<PlayingTrack | null>(null);
  const queue = ref<PlayingTrack[]>([]);
  const currentIndex = ref(-1);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const totalDuration = ref(0);
  const playMode = ref<PlayMode>('sequence');

  let audio: AudioAdapter | null = null;

  function getAudio(): AudioAdapter {
    if (!audio) {
      audio = isNativePlatform()
        ? createNativeAudioAdapter()
        : createWebAudioAdapter();

      audio.onTimeUpdate((t, d) => {
        currentTime.value = t;
        totalDuration.value = d;
      });
      audio.onEnded(() => {
        playNext();
      });
      audio.onError((err) => {
        console.error('Audio error:', err);
        isPlaying.value = false;
      });

      audio.onMediaAction?.((action) => {
        switch (action) {
          case 'play':
            isPlaying.value = true;
            break;
          case 'pause':
            isPlaying.value = false;
            break;
          case 'next':
            playNext();
            break;
          case 'previous':
            playPrev();
            break;
        }
      });
    }
    return audio;
  }

  async function play(track: PlayingTrack) {
    try {
      const source = track.source || 'bilibili';
      let audioUrl: string;
      let coverUrl: string;

      if (source === 'netease' || source === 'qq') {
        if (track.isVip) {
          uni.showToast({ title: `该歌曲需要${source === 'netease' ? '网易云' : 'QQ音乐'}VIP`, icon: 'none' });
          playNext();
          return;
        }
        const songUrl = source === 'netease'
          ? await api.getNeteaseSongUrl(Number(track.sourceId))
          : await api.getQQSongUrl(track.sourceId!);
        if (!songUrl.url) {
          uni.showToast({ title: 'VIP歌曲或暂无音源', icon: 'none' });
          playNext();
          return;
        }
        audioUrl = songUrl.url;
        coverUrl = track.cover;
      } else {
        const streamInfo = await api.getAudioStream(track.bvid, track.cid);
        audioUrl = api.getAudioProxyUrl(streamInfo.url);
        coverUrl = api.proxyImage(track.cover);
      }

      const a = getAudio();
      a.play(audioUrl, { title: track.title, artist: track.artist, cover: coverUrl });

      currentTrack.value = { ...track, audioUrl };
      isPlaying.value = true;

      const idx = queue.value.findIndex(
        (t) => t.id === track.id || (t.bvid === track.bvid && t.cid === track.cid)
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
    const a = getAudio();
    if (isPlaying.value) {
      a.pause();
      isPlaying.value = false;
    } else if (currentTrack.value) {
      a.resume();
      isPlaying.value = true;
    }
  }

  function seekTo(time: number) {
    const a = getAudio();
    a.seek(time);
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
    queue.value = [...tracks];
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

  function playNext_insert(track: PlayingTrack) {
    const exists = queue.value.findIndex(
      (t) => t.bvid === track.bvid && t.cid === track.cid
    );
    if (exists >= 0) {
      queue.value.splice(exists, 1);
      if (exists <= currentIndex.value) currentIndex.value--;
    }
    const insertAt = currentIndex.value + 1;
    queue.value.splice(insertAt, 0, track);
  }

  function removeFromQueue(index: number) {
    if (index < 0 || index >= queue.value.length) return;

    const wasPlaying = index === currentIndex.value;
    queue.value.splice(index, 1);

    if (queue.value.length === 0) {
      currentIndex.value = -1;
      return;
    }

    if (index < currentIndex.value) {
      currentIndex.value--;
    } else if (wasPlaying) {
      currentIndex.value = Math.min(currentIndex.value, queue.value.length - 1);
    }
  }

  function moveInQueue(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= queue.value.length || toIndex >= queue.value.length) return;

    const item = queue.value.splice(fromIndex, 1)[0];
    queue.value.splice(toIndex, 0, item);

    if (currentIndex.value === fromIndex) {
      currentIndex.value = toIndex;
    } else if (fromIndex < currentIndex.value && toIndex >= currentIndex.value) {
      currentIndex.value--;
    } else if (fromIndex > currentIndex.value && toIndex <= currentIndex.value) {
      currentIndex.value++;
    }
  }

  function clearQueue() {
    queue.value = [];
    currentIndex.value = -1;
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
    playNext_insert,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    togglePlayMode,
    formatTime,
  };
});
