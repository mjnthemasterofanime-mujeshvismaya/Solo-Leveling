const fs = require('fs');
const path = require('path');

// 1. Configure styles.xml and values-v35/styles.xml for non-overlapping dark system bars
const resDir = path.join('android', 'app', 'src', 'main', 'res');
const stylesPath = path.join(resDir, 'values', 'styles.xml');
let xml = fs.readFileSync(stylesPath, 'utf8');

const barItems = [
  '        <item name="android:statusBarColor">#050A13</item>',
  '        <item name="android:navigationBarColor">#050A13</item>',
  '        <item name="android:windowLightStatusBar">false</item>',
  '        <item name="android:windowLightNavigationBar">false</item>',
  '        <item name="android:fitsSystemWindows">true</item>',
].join('\n');

const updatedBase = xml.replace(
  /(<style name="AppTheme\.NoActionBar"[^>]*>)/,
  `$1\n${barItems}`
);
fs.writeFileSync(stylesPath, updatedBase);

const v35Dir = path.join(resDir, 'values-v35');
fs.mkdirSync(v35Dir, { recursive: true });
const updatedV35 = updatedBase.replace(
  /(<style name="AppTheme\.NoActionBar"[^>]*>)/,
  `$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>`
);
fs.writeFileSync(path.join(v35Dir, 'styles.xml'), updatedV35);

// 2. Patch MainActivity.java to enforce WindowInsets padding and 1080x2105 portrait bounds
const mainActivityPath = path.join(
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'thesystem',
  'player',
  'MainActivity.java'
);

const mainActivityJava = `package com.thesystem.player;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    final View content = findViewById(android.R.id.content);
    if (content != null) {
      content.setBackgroundColor(Color.parseColor("#050A13"));
      ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
        Insets bars = windowInsets.getInsets(
          WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
        );
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
        if (v instanceof ViewGroup && ((ViewGroup) v).getChildCount() > 0) {
          View child = ((ViewGroup) v).getChildAt(0);
          int usableWidth = getResources().getDisplayMetrics().widthPixels - bars.left - bars.right;
          int usableHeight = getResources().getDisplayMetrics().heightPixels - bars.top - bars.bottom;
          int targetHeight = Math.round(usableWidth * (2105f / 1080f));
          ViewGroup.LayoutParams lp = child.getLayoutParams();
          if (usableWidth > 0 && usableHeight > targetHeight && targetHeight > 0) {
            lp.height = targetHeight;
            if (lp instanceof FrameLayout.LayoutParams) {
              ((FrameLayout.LayoutParams) lp).gravity = Gravity.CENTER;
            }
          } else {
            lp.height = ViewGroup.LayoutParams.MATCH_PARENT;
          }
          child.setLayoutParams(lp);
        }
        return WindowInsetsCompat.CONSUMED;
      });
    }
  }
}
`;

fs.mkdirSync(path.dirname(mainActivityPath), { recursive: true });
fs.writeFileSync(mainActivityPath, mainActivityJava);
