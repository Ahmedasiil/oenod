#!/bin/bash
# Taps every button on Home and in Everything, plus the new market line, on an emulator. Output: out/ (screens + results.tsv).
set -x
cd "$(dirname "$0")"; OUT=$GITHUB_WORKSPACE/out; mkdir -p $OUT/shots; APK=$1
node mock.js > $OUT/mock.log 2>&1 &
sleep 1
adb install -r -g "$APK" >/dev/null 2>&1 || adb install -r "$APK"
PKG=com.oenod.app
exec </dev/null
shot(){ adb exec-out screencap -p > $OUT/shots/$1.png; }
dump(){ rm -f u.xml; adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb pull /sdcard/u.xml u.xml >/dev/null 2>&1; }
find1(){ dump; python3 ui.py u.xml "$1" $2; }
tap(){ for i in 1 2 3; do P=$(find1 "$1" $2) && { adb shell input tap $P; return 0; }; sleep 2; done; return 1; }
has(){ dump; python3 ui.py u.xml "$1" >/dev/null; }
up(){ adb shell input swipe 540 1800 540 900 350; sleep 1; }
down(){ adb shell input swipe 540 700 540 1900 300; sleep 1; }
alive(){ adb shell pidof $PKG >/dev/null && adb shell dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity" | grep -q $PKG; }
crashes(){ adb logcat -d | grep -cE "FATAL EXCEPTION|ReactNativeJS.*(TypeError|ReferenceError|Invariant)"; }
clear_noise(){ export EXACT=1; for i in 1 2 3 4 5 6; do if has "Wait"; then tap "Wait"; elif has "Allow"; then tap "Allow"; elif has "Not now"; then tap "Not now"; else break; fi; sleep 3; done; unset EXACT; }
gohome(){ EXACT=1 tap "Home" || adb shell input tap 125 2240; sleep 4; for k in 1 2 3; do down; done; }
launch(){ adb shell am force-stop $PKG; adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null; sleep 14; clear_noise; gohome; }
echo -e "where\tbutton\tresult\tshot" > $OUT/results.tsv
res(){ echo -e "$1\t$2\t$3\t$4" >> $OUT/results.tsv; }

adb logcat -c
launch; sleep 20
shot 00-home-light
for i in 1 2 3; do sleep 8; shot 00-home-light-$i; done
dump; cp u.xml $OUT/home.xml

if [ -z "$ONLY" ]; then
# The market line's OENOD button opens Markets inside the app
if tap "Open Markets by OENOD"; then sleep 18; shot 01-markets; alive && res home "Market line > Markets" ok 01-markets || res home "Market line > Markets" CRASH 01-markets; adb shell input keyevent BACK; sleep 3; else res home "Market line" "NOT FOUND" -; fi

# Dark phone setting
adb shell cmd uimode night yes; launch; sleep 15; shot 02-home-dark; adb shell cmd uimode night no; launch; sleep 8

# Home buttons
n=10
for b in "Team" "Meet" "Calls" "Payroll" "Invoices" "Schedule" "Time clock"; do
  launch; for k in 1 2 3; do has "$b" && break; up; done
  c0=$(crashes); n=$((n+1))
  if tap "$b"; then sleep 6; shot $n-home-${b// /_}; if alive && [ "$(crashes)" = "$c0" ]; then res home "$b" ok $n-home-${b// /_}; else res home "$b" CRASH $n-home-${b// /_}; fi
  else res home "$b" "NOT FOUND" -; fi
done

fi

# Everything: every tool. Stay on Everything between tools (Back), relaunch only if Back lost it.
# Only tap a tile whose centre is clear of the header and the floating tab bar (YMIN/YMAX).
n=100
toevery(){ launch; for k in 1 2 3; do has "All tools" && break; up; done; tap "All tools"; sleep 4; }
onevery(){ EXACT=1 has "Every part of OENOD, right inside the app. One sign-in."; }
top(){ for k in 1 2 3 4 5 6; do adb shell input swipe 540 600 540 2000 150; done; sleep 1; }
toevery
exec 3< tools.tsv
while IFS=$'\t' read -r -u 3 name kind path; do
  [ -z "$name" ] && continue
  [ -n "$ONLY" ] && ! grep -qxF "$name" only.txt && continue
  onevery || { adb shell input keyevent BACK; sleep 3; onevery || toevery; }
  top
  found=0; for k in $(seq 1 16); do EXACT=1 YMIN=520 YMAX=1880 has "$name" && { found=1; break; }; adb shell input swipe 540 1700 540 1150 400; sleep 1; done
  n=$((n+1)); f=$n-${name//[^A-Za-z0-9]/_}
  if [ $found = 1 ]; then
    c0=$(crashes); EXACT=1 YMIN=520 YMAX=1880 tap "$name"; [ "$kind" = web ] && sleep 12 || sleep 6
    shot $f; dump; cp u.xml $OUT/shots/$f.xml
    if alive && [ "$(crashes)" = "$c0" ]; then res everything "$name" ok $f; else res everything "$name" CRASH $f; launch; toevery; fi
    adb shell input keyevent BACK; sleep 3
  else res everything "$name" "NOT FOUND" -; shot $f-missing; fi
done
exec 3<&-

# Me > Stock market line switch hides the line on Home
launch; tap "Me"; sleep 3; for k in $(seq 1 8); do has "Stock market line" && break; up; done; shot 03-me-switch
if tap "Stock market line" android.widget.Switch; then sleep 2; shot 04-me-switch-off; tap "Home"; sleep 4; shot 05-home-line-off
  has "Open Markets by OENOD" && res me "Switch hides line" FAIL 05-home-line-off || res me "Switch hides line" ok 05-home-line-off
  tap "Me"; sleep 2; for k in $(seq 1 8); do has "Stock market line" && break; up; done; tap "Stock market line" android.widget.Switch; sleep 1
else res me "Stock market line switch" "NOT FOUND" 03-me-switch; fi
adb logcat -d | grep -E "FATAL EXCEPTION|ReactNativeJS" | tail -400 > $OUT/logcat.txt
grep -c "" $OUT/results.tsv; grep -v "	ok	" $OUT/results.tsv
