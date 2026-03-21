package com.jollymusic.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class MediaButtonReceiver extends BroadcastReceiver {

    private static MediaButtonCallback callback;

    public interface MediaButtonCallback {
        void onTogglePlay();
        void onNext();
        void onPrevious();
    }

    public static void setCallback(MediaButtonCallback cb) {
        callback = cb;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null || callback == null) return;

        switch (intent.getAction()) {
            case "toggle":
                callback.onTogglePlay();
                break;
            case "next":
                callback.onNext();
                break;
            case "prev":
                callback.onPrevious();
                break;
        }
    }
}
