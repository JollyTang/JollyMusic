import { defineStore } from 'pinia';
import { ref } from 'vue';

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 20;

export const useSearchStore = defineStore('search', () => {
  const history = ref<string[]>([]);

  function loadHistory() {
    try {
      const raw = uni.getStorageSync(HISTORY_KEY);
      if (raw) {
        history.value = JSON.parse(raw);
      }
    } catch {
      history.value = [];
    }
  }

  function addHistory(bvid: string) {
    const filtered = history.value.filter((h) => h !== bvid);
    filtered.unshift(bvid);
    history.value = filtered.slice(0, MAX_HISTORY);
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(history.value));
  }

  function removeHistory(bvid: string) {
    history.value = history.value.filter((h) => h !== bvid);
    uni.setStorageSync(HISTORY_KEY, JSON.stringify(history.value));
  }

  function clearHistory() {
    history.value = [];
    uni.removeStorageSync(HISTORY_KEY);
  }

  loadHistory();

  return { history, addHistory, removeHistory, clearHistory };
});
