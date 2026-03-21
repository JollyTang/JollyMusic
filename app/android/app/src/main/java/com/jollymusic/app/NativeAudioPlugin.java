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

import java.io.IOException;
import java.util.HashMap;

@CapacitorPlugin(name = "NativeAudio")
public class NativeAudioPlugin extends Plugin {

    private static final String TAG = "NativeAudio";
    private MediaPlayer mediaPlayer;
    private Handler handler;
    private Runnable timeUpdateRunnable;
    private boolean isPrepared = false;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;

    @Override
    public void load() {
        handler = new Handler(Looper.getMainLooper());
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

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

                    JSObject ret = new JSObject();
                    ret.put("duration", mp.getDuration() / 1000.0);
                    notifyListeners("prepared", ret);
                });

                mediaPlayer.setOnCompletionListener(mp -> {
                    stopTimeUpdates();
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

    @Override
    protected void handleOnDestroy() {
        releasePlayer();
        stopForegroundService();
    }
}
