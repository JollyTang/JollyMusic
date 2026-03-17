import type { Playlist, Track } from './api';

const SHARE_PREFIX = 'LM-';

interface ShareData {
  n: string;           // name
  t: [string, number][];  // tracks: [bvid, cid][]
}

export function generateShareCode(playlist: Playlist): string {
  const data: ShareData = {
    n: playlist.name,
    t: playlist.tracks.map((t) => [t.bvid, t.cid]),
  };

  const json = JSON.stringify(data);
  const encoded = encodeToBase64(json);
  return SHARE_PREFIX + encoded;
}

export interface ParsedShare {
  name: string;
  tracks: { bvid: string; cid: number }[];
}

export function parseShareCode(code: string): ParsedShare | null {
  try {
    let raw = code.trim();
    if (raw.startsWith(SHARE_PREFIX)) {
      raw = raw.slice(SHARE_PREFIX.length);
    }

    const json = decodeFromBase64(raw);
    const data: ShareData = JSON.parse(json);

    if (!data.n || !Array.isArray(data.t) || data.t.length === 0) {
      return null;
    }

    return {
      name: data.n,
      tracks: data.t.map(([bvid, cid]) => ({ bvid, cid })),
    };
  } catch {
    return null;
  }
}

function encodeToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeFromBase64(b64: string): string {
  let str = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
