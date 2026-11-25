#!/bin/bash
# Records the Play background-location walkthrough on the emulator. Output: out/ (video + step screenshots).
set -x
cd "$(dirname "$0")"; OUT=$GITHUB_WORKSPACE/out; mkdir -p $OUT; APK=$1
node mock.js > $OUT/mock.log 2>&1 &
sleep 1
adb install -r -g "$APK" >/dev/null 2>&1 || adb install -r "$APK"
# -g grants runtime permissions; take location + notifications back so the video shows the real prompts.
for p in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION ACCESS_BACKGROUND_LOCATION POST_NOTIFICATIONS; do adb shell pm revoke com.oenod.app android.permission.$p 2>/dev/null; done
adb shell settings put secure location_mode 3
adb emu geo fix -113.5300 53.5200   # about 3 km from the shop
N=0; shot(){ N=$((N+1)); adb exec-out screencap -p > $OUT/s$(printf %02d $N)-$1.png; }
dump(){ rm -f u.xml; adb shell uiautomator dump /sdcard/u.xml 2>&1 | tail -1; adb pull /sdcard/u.xml u.xml >/dev/null 2>&1; cp u.xml $OUT/last.xml 2>/dev/null; }
tap(){ for i in 1 2 3 4 5 6; do dump; P=$(python3 ui.py u.xml "$1" $2) && { adb shell input tap $P; return 0; }; sleep 2; done; echo "NOT FOUND: $1"; return 1; }
has(){ dump; python3 ui.py u.xml "$1" >/dev/null; }

adb shell monkey -p com.oenod.app -c android.intent.category.LAUNCHER 1
sleep 20; shot start
# Clear start-up noise: a slow-emulator "isn't responding" box and the notifications prompt
for i in 1 2 3 4 5 6 7 8; do
  if has "Wait"; then tap "Wait"; elif has "Allow"; then tap "Allow"; elif has "Not now"; then tap "Not now"; else break; fi; sleep 4
done
sleep 15
adb shell "printf 'GET /api/session HTTP/1.0\r\n\r\n' | nc 10.0.2.2 8747 | tail -c 120" || true
for i in 1 2 3; do if has "Wait"; then tap "Wait"; elif has "Allow"; then tap "Allow"; fi; sleep 3; done
shot home
dump; cp u.xml $OUT/home.xml; adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumed" | head -3
curl -s 'localhost:8747/__mode?m=shift'

# Part 1: Me > Arrival alerts > switch on > disclosure > Allow all the time
adb shell screenrecord --bit-rate 8000000 /sdcard/a.mp4 & sleep 2
tap "Me"; sleep 3; shot me
for i in 1 2 3 4; do has "Arrival alerts" && break; adb shell input swipe 540 1700 540 900 400; sleep 1; done
tap "Arrival alerts"; sleep 4; shot arrival
tap x android.widget.Switch; sleep 2          # off
tap x android.widget.Switch; sleep 3; shot fg  # on: asks for location
tap "While using the app"; sleep 3; shot disclosure
sleep 3; tap "Continue"; sleep 4; shot settings
tap "Allow all the time"; sleep 3; shot allowed
adb shell input keyevent BACK; sleep 3
has "Allow" && { shot notif; tap "Allow"; sleep 2; }
sleep 3; shot on
adb shell pkill -INT screenrecord; sleep 3; adb pull /sdcard/a.mp4 $OUT/a.mp4

# Part 2: app closed (home screen), phone arrives at the shop, alert appears, tap clocks in
adb shell input keyevent HOME; sleep 2
for i in $(seq 1 60); do
  adb emu geo fix -113.4909 53.5444; sleep 4
  adb shell dumpsys notification --noredact | grep -q "Tap to clock in" && break
done
shot arrived
adb shell screenrecord --bit-rate 8000000 /sdcard/b.mp4 & sleep 2
adb shell cmd statusbar expand-notifications; sleep 4; shot shade
tap "Tap to clock in."; sleep 10; shot clocked
adb shell pkill -INT screenrecord; sleep 3; adb pull /sdcard/b.mp4 $OUT/b.mp4
adb logcat -d | grep -iE "ReactNativeJS|oenod|geofenc|okhttp|cleartext|ExpoLocation|TaskService" | tail -300 > $OUT/logcat.txt
tail -40 $OUT/mock.log; ls -la $OUT
