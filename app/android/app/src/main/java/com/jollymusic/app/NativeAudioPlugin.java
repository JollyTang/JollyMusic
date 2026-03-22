package com.jollymusic.app;

import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.Manifest;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeAudio")
public class NativeAudioPlugin extends Plugin {

    private static final String TAG = "NativeAudio";
    private MediaPlayer mediaPlayer;
    private Handler handler;
    private Runnable timeUpdateRunnable;
    private boolean isPrepared = false;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private ArrayList<JSONObject> queue = new ArrayList<>();
    private int queueIndex = -1;
    private String playMode = "sequence";
    private String baseUrl = "";

    @Override
    public void load() {
        handler = new Handler(Looper.getMainLooper());
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        registerMediaCallbacks();
        requestNotificationPermission();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    1001
                );
            }
        }
    }

    private void registerMediaCallbacks() {
        AudioService.setControlCallback(new AudioService.MediaControlCallback() {
            @Override
            public void onPlay() {
                handler.post(() -> {
                    if (mediaPlayer != null && isPrepared && !mediaPlayer.isPlaying()) {
                        mediaPlayer.start();
                        startTimeUpdates();
                        updateServiceState(true);
                        notifyListeners("mediaAction", jsObj("action", "play"));
                    }
                });
            }

            @Override
            public void onPause() {
                handler.post(() -> {
                    if (mediaPlayer != null && isPrepared && mediaPlayer.isPlaying()) {
                        mediaPlayer.pause();
                        stopTimeUpdates();
                        updateServiceState(false);
                        notifyListeners("mediaAction", jsObj("action", "pause"));
                    }
                });
            }

            @Override
            public void onNext() {
                handler.post(() -> playNextInQueue());
            }

            @Override
            public void onPrevious() {
                handler.post(() -> playPrevInQueue());
            }

            @Override
            public void onSeekTo(long pos) {
                handler.post(() -> {
                    if (mediaPlayer != null && isPrepared) {
                        mediaPlayer.seekTo((int) pos);
                    }
                });
            }
        });

        MediaButtonReceiver.setCallback(new MediaButtonReceiver.MediaButtonCallback() {
            @Override
            public void onTogglePlay() {
                handler.post(() -> {
                    if (mediaPlayer != null && isPrepared) {
                        if (mediaPlayer.isPlaying()) {
                            mediaPlayer.pause();
                            stopTimeUpdates();
                            updateServiceState(false);
                            notifyListeners("mediaAction", jsObj("action", "pause"));
                        } else {
                            mediaPlayer.start();
                            startTimeUpdates();
                            updateServiceState(true);
                            notifyListeners("mediaAction", jsObj("action", "play"));
                        }
                    }
                });
            }

            @Override
            public void onNext() {
                handler.post(() -> playNextInQueue());
            }

            @Override
            public void onPrevious() {
                handler.post(() -> playPrevInQueue());
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        String cover = call.getString("cover", "");

        handler.post(() -> {
            playUrl(url, title, artist, cover);
            call.resolve();
        });
    }

    @PluginMethod
    public void setQueue(PluginCall call) {
        try {
            JSArray items = call.getArray("items");
            int index = call.getInt("index", 0);
            String mode = call.getString("playMode", "sequence");
            String base = call.getString("baseUrl", "");

            queue.clear();
            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    queue.add(items.getJSONObject(i));
                }
            }
            queueIndex = index;
            playMode = mode;
            baseUrl = base;

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set queue: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateQueueIndex(PluginCall call) {
        queueIndex = call.getInt("index", queueIndex);
        call.resolve();
    }

    @PluginMethod
    public void setPlayMode(PluginCall call) {
        playMode = call.getString("playMode", "sequence");
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        handler.post(() -> {
            if (mediaPlayer != null && isPrepared && mediaPlayer.isPlaying()) {
                mediaPlayer.pause();
                stopTimeUpdates();
                updateServiceState(false);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void resume(PluginCall call) {
        handler.post(() -> {
            if (mediaPlayer != null && isPrepared && !mediaPlayer.isPlaying()) {
                mediaPlayer.start();
                startTimeUpdates();
                updateServiceState(true);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void seek(PluginCall call) {
        double time = call.getDouble("time", 0.0);
        handler.post(() -> {
            if (mediaPlayer != null && isPrepared) {
                mediaPlayer.seekTo((int) (time * 1000));
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        handler.post(() -> {
            releasePlayer();
            stopForegroundService();
            call.resolve();
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        float volume = call.getFloat("volume", 1.0f);
        handler.post(() -> {
            if (mediaPlayer != null) {
                mediaPlayer.setVolume(volume, volume);
            }
            call.resolve();
        });
    }

    private void playNextInQueue() {
        if (queue.isEmpty()) return;

        int nextIdx;
        if ("loop".equals(playMode)) {
            nextIdx = queueIndex;
        } else if ("random".equals(playMode)) {
            nextIdx = (int) (Math.random() * queue.size());
        } else {
            nextIdx = (queueIndex + 1) % queue.size();
        }

        queueIndex = nextIdx;
        playTrackAtIndex(nextIdx);
    }

    private void playPrevInQueue() {
        if (queue.isEmpty()) return;

        int prevIdx;
        if ("random".equals(playMode)) {
            prevIdx = (int) (Math.random() * queue.size());
        } else {
            prevIdx = queueIndex <= 0 ? queue.size() - 1 : queueIndex - 1;
        }

        queueIndex = prevIdx;
        playTrackAtIndex(prevIdx);
    }

    private void playTrackAtIndex(int index) {
        if (index < 0 || index >= queue.size()) return;

        JSONObject track = queue.get(index);
        String source = track.optString("source", "bilibili");
        String title = track.optString("title", "");
        String artist = track.optString("artist", "");
        String cover = track.optString("cover", "");

        JSObject changed = new JSObject();
        changed.put("index", index);
        changed.put("source", source);
        notifyListeners("trackChanged", changed);

        executor.execute(() -> {
            try {
                String audioUrl = fetchAudioUrl(track, source);
                if (audioUrl != null && !audioUrl.isEmpty()) {
                    handler.post(() -> playUrl(audioUrl, title, artist, cover));
                } else {
                    Log.w(TAG, "No audio URL for track at index " + index + ", skipping");
                    handler.post(() -> {
                        JSObject skip = new JSObject();
                        skip.put("index", index);
                        skip.put("reason", "no_url");
                        notifyListeners("trackSkipped", skip);
                        playNextInQueue();
                    });
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to fetch URL for track " + index, e);
                handler.post(() -> {
                    JSObject skip = new JSObject();
                    skip.put("index", index);
                    skip.put("reason", e.getMessage());
                    notifyListeners("trackSkipped", skip);
                    playNextInQueue();
                });
            }
        });
    }

    private String fetchAudioUrl(JSONObject track, String source) throws Exception {
        if (baseUrl.isEmpty()) return null;

        String apiUrl;
        if ("netease".equals(source)) {
            String sourceId = track.optString("sourceId", "");
            apiUrl = baseUrl + "/music/url/netease/" + sourceId;
        } else if ("qq".equals(source)) {
            String sourceId = track.optString("sourceId", "");
            apiUrl = baseUrl + "/music/url/qq/" + sourceId;
        } else {
            String bvid = track.optString("bvid", "");
            int cid = track.optInt("cid", 0);
            apiUrl = baseUrl + "/video/audio/" + bvid + "/" + cid;
        }

        URL url = new URL(apiUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);
        conn.setRequestProperty("Accept", "application/json");

        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();

            JSONObject json = new JSONObject(sb.toString());
            if (json.optInt("code") != 0) return null;

            JSONObject data = json.optJSONObject("data");
            if (data == null) return null;

            String audioUrl = data.optString("url", "");
            if (audioUrl.isEmpty()) return null;

            if ("bilibili".equals(source)) {
                return baseUrl + "/audio/proxy?url=" + java.net.URLEncoder.encode(audioUrl, "UTF-8");
            }
            return audioUrl;
        } finally {
            conn.disconnect();
        }
    }

    private void playUrl(String url, String title, String artist, String cover) {
        try {
            releasePlayer();

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            );

            mediaPlayer.setDataSource(url);

            mediaPlayer.setOnPreparedListener(mp -> {
                isPrepared = true;
                mp.start();
                requestAudioFocus();
                startForegroundService();
                startTimeUpdates();

                updateServiceMeta(title, artist, mp.getDuration(), cover);
                updateServiceState(true);

                JSObject ret = new JSObject();
                ret.put("duration", mp.getDuration() / 1000.0);
                notifyListeners("prepared", ret);
            });

            mediaPlayer.setOnCompletionListener(mp -> {
                stopTimeUpdates();
                updateServiceState(false);
                notifyListeners("ended", new JSObject());
                playNextInQueue();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                isPrepared = false;
                stopTimeUpdates();
                JSObject err = new JSObject();
                err.put("message", "MediaPlayer error: " + what + "/" + extra);
                notifyListeners("error", err);
                return true;
            });

            mediaPlayer.prepareAsync();
        } catch (IOException e) {
            Log.e(TAG, "playUrl failed", e);
        }
    }

    private void requestAudioFocus() {
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build();

        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs)
            .setOnAudioFocusChangeListener(focusChange -> { })
            .build();

        audioManager.requestAudioFocus(focusRequest);
    }

    private void updateServiceMeta(String title, String artist, long durationMs, String coverUrl) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, AudioService.class);
        intent.setAction(AudioService.ACTION_UPDATE_META);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("duration", durationMs);
        intent.putExtra("coverUrl", coverUrl);
        ctx.startService(intent);
    }

    private void updateServiceState(boolean playing) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, AudioService.class);
        intent.setAction(AudioService.ACTION_UPDATE_STATE);
        intent.putExtra("isPlaying", playing);
        if (mediaPlayer != null && isPrepared) {
            intent.putExtra("position", (long) mediaPlayer.getCurrentPosition());
        }
        ctx.startService(intent);
    }

    private void startTimeUpdates() {
        stopTimeUpdates();
        timeUpdateRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaPlayer != null && isPrepared) {
                    try {
                        JSObject data = new JSObject();
                        data.put("currentTime", mediaPlayer.getCurrentPosition() / 1000.0);
                        data.put("duration", mediaPlayer.getDuration() / 1000.0);
                        notifyListeners("timeUpdate", data);
                    } catch (IllegalStateException e) { }
                }
                handler.postDelayed(this, 500);
            }
        };
        handler.postDelayed(timeUpdateRunnable, 500);
    }

    private void stopTimeUpdates() {
        if (timeUpdateRunnable != null) {
            handler.removeCallbacks(timeUpdateRunnable);
            timeUpdateRunnable = null;
        }
    }

    private void releasePlayer() {
        stopTimeUpdates();
        if (mediaPlayer != null) {
            isPrepared = false;
            try { mediaPlayer.stop(); } catch (IllegalStateException e) { }
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
            focusRequest = null;
        }
    }

    private void startForegroundService() {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, AudioService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }
    }

    private void stopForegroundService() {
        Context ctx = getContext();
        ctx.stopService(new Intent(ctx, AudioService.class));
    }

    private JSObject jsObj(String key, String value) {
        JSObject obj = new JSObject();
        obj.put(key, value);
        return obj;
    }

    @Override
    protected void handleOnDestroy() {
        releasePlayer();
        stopForegroundService();
    }
}
