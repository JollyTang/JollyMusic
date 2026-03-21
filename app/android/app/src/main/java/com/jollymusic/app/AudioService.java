package com.jollymusic.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AudioService extends Service {

    private static final String CHANNEL_ID = "listen_music_playback";
    private static final int NOTIFICATION_ID = 1;

    public static final String ACTION_UPDATE_META = "com.jollymusic.UPDATE_META";
    public static final String ACTION_UPDATE_STATE = "com.jollymusic.UPDATE_STATE";

    private MediaSessionCompat mediaSession;
    private String currentTitle = "ListenMusic";
    private String currentArtist = "";
    private boolean currentIsPlaying = false;
    private long currentDuration = 0;
    private long currentPosition = 0;
    private Bitmap currentAlbumArt = null;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private static MediaControlCallback controlCallback;

    public interface MediaControlCallback {
        void onPlay();
        void onPause();
        void onNext();
        void onPrevious();
        void onSeekTo(long pos);
    }

    public static void setControlCallback(MediaControlCallback cb) {
        controlCallback = cb;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        initMediaSession();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            switch (intent.getAction()) {
                case ACTION_UPDATE_META:
                    currentTitle = intent.getStringExtra("title");
                    currentArtist = intent.getStringExtra("artist");
                    currentDuration = intent.getLongExtra("duration", 0);
                    String coverUrl = intent.getStringExtra("coverUrl");
                    if (currentTitle == null) currentTitle = "ListenMusic";
                    if (currentArtist == null) currentArtist = "";
                    updateMediaSessionMetadata();
                    updateNotification();
                    if (coverUrl != null && !coverUrl.isEmpty()) {
                        loadAlbumArt(coverUrl);
                    }
                    break;
                case ACTION_UPDATE_STATE:
                    currentIsPlaying = intent.getBooleanExtra("isPlaying", false);
                    currentPosition = intent.getLongExtra("position", 0);
                    updatePlaybackState();
                    updateNotification();
                    break;
            }
        } else {
            updateNotification();
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "ListenMusic");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
            | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                if (controlCallback != null) controlCallback.onPlay();
            }

            @Override
            public void onPause() {
                if (controlCallback != null) controlCallback.onPause();
            }

            @Override
            public void onSkipToNext() {
                if (controlCallback != null) controlCallback.onNext();
            }

            @Override
            public void onSkipToPrevious() {
                if (controlCallback != null) controlCallback.onPrevious();
            }

            @Override
            public void onSeekTo(long pos) {
                if (controlCallback != null) controlCallback.onSeekTo(pos);
            }
        });
        mediaSession.setActive(true);
        updatePlaybackState();
    }

    private void updateMediaSessionMetadata() {
        if (mediaSession == null) return;
        MediaMetadataCompat.Builder builder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration);
        if (currentAlbumArt != null) {
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentAlbumArt);
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, currentAlbumArt);
        }
        mediaSession.setMetadata(builder.build());
    }

    private void loadAlbumArt(String imageUrl) {
        executor.execute(() -> {
            try {
                URL url = new URL(imageUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.setRequestProperty("Referer", "https://www.bilibili.com");
                InputStream in = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(in);
                in.close();
                conn.disconnect();

                if (bitmap != null) {
                    int maxSize = 512;
                    if (bitmap.getWidth() > maxSize || bitmap.getHeight() > maxSize) {
                        float scale = Math.min((float) maxSize / bitmap.getWidth(), (float) maxSize / bitmap.getHeight());
                        bitmap = Bitmap.createScaledBitmap(bitmap,
                            (int) (bitmap.getWidth() * scale),
                            (int) (bitmap.getHeight() * scale), true);
                    }

                    final Bitmap art = bitmap;
                    mainHandler.post(() -> {
                        currentAlbumArt = art;
                        updateMediaSessionMetadata();
                        updateNotification();
                    });
                }
            } catch (Exception e) {
                Log.w("AudioService", "Failed to load album art: " + e.getMessage());
            }
        });
    }

    private void updatePlaybackState() {
        if (mediaSession == null) return;
        long actions = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_SEEK_TO
            | PlaybackStateCompat.ACTION_PLAY_PAUSE;

        int state = currentIsPlaying
            ? PlaybackStateCompat.STATE_PLAYING
            : PlaybackStateCompat.STATE_PAUSED;

        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, currentPosition, currentIsPlaying ? 1.0f : 0f)
            .build());
    }

    private void updateNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setOngoing(currentIsPlaying)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setLargeIcon(currentAlbumArt)
            .addAction(android.R.drawable.ic_media_previous, "上一曲", buildMediaAction("prev"))
            .addAction(
                currentIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                currentIsPlaying ? "暂停" : "播放",
                buildMediaAction("toggle")
            )
            .addAction(android.R.drawable.ic_media_next, "下一曲", buildMediaAction("next"));

        if (mediaSession != null) {
            builder.setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));
        }

        Notification notification = builder.build();
        startForeground(NOTIFICATION_ID, notification);
    }

    private PendingIntent buildMediaAction(String action) {
        Intent intent = new Intent(this, MediaButtonReceiver.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(
            this, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "音乐播放",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("后台音乐播放通知");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
