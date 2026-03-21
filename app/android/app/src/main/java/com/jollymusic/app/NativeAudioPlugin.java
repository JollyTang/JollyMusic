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

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.Manifest;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.IOException;

@CapacitorPlugin(name = "NativeAudio")
public class NativeAudioPlugin extends Plugin {

    private static final String TAG = "NativeAudio";
    private MediaPlayer mediaPlayer;
    private Handler handler;
    private Runnable timeUpdateRunnable;
    private boolean isPrepared = false;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private String currentTitle = "";
    private String currentArtist = "";

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
                notifyListeners("mediaAction", jsObj("action", "next"));
            }

            @Override
            public void onPrevious() {
                notifyListeners("mediaAction", jsObj("action", "previous"));
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
                notifyListeners("mediaAction", jsObj("action", "next"));
            }

            @Override
            public void onPrevious() {
                notifyListeners("mediaAction", jsObj("action", "previous"));
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
        currentTitle = title;
        currentArtist = artist;

        handler.post(() -> {
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

                    updateServiceMeta(currentTitle, currentArtist, mp.getDuration());
                    updateServiceState(true);

                    JSObject ret = new JSObject();
                    ret.put("duration", mp.getDuration() / 1000.0);
                    notifyListeners("prepared", ret);
                });

                mediaPlayer.setOnCompletionListener(mp -> {
                    stopTimeUpdates();
                    updateServiceState(false);
                    notifyListeners("ended", new JSObject());
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
                call.resolve();
            } catch (IOException e) {
                Log.e(TAG, "play failed", e);
                call.reject("Failed to play: " + e.getMessage());
            }
        });
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

    @PluginMethod
    public void getDuration(PluginCall call) {
        handler.post(() -> {
            JSObject ret = new JSObject();
            if (mediaPlayer != null && isPrepared) {
                ret.put("duration", mediaPlayer.getDuration() / 1000.0);
            } else {
                ret.put("duration", 0);
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getCurrentTime(PluginCall call) {
        handler.post(() -> {
            JSObject ret = new JSObject();
            if (mediaPlayer != null && isPrepared) {
                ret.put("currentTime", mediaPlayer.getCurrentPosition() / 1000.0);
            } else {
                ret.put("currentTime", 0);
            }
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void isPlaying(PluginCall call) {
        handler.post(() -> {
            JSObject ret = new JSObject();
            ret.put("isPlaying", mediaPlayer != null && isPrepared && mediaPlayer.isPlaying());
            call.resolve(ret);
        });
    }

    private void requestAudioFocus() {
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build();

        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs)
            .setOnAudioFocusChangeListener(focusChange -> {
                // Intentionally ignore all focus changes to allow mixing with other apps
            })
            .build();

        audioManager.requestAudioFocus(focusRequest);
    }

    private void updateServiceMeta(String title, String artist, long durationMs) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, AudioService.class);
        intent.setAction(AudioService.ACTION_UPDATE_META);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("duration", durationMs);
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
                    } catch (IllegalStateException e) {
                        // Player was released
                    }
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
            try {
                mediaPlayer.stop();
            } catch (IllegalStateException e) { /* ignore */ }
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
