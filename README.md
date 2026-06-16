<div align="center">

# ⚽ FootyBall

**A little football that lives in your menu bar and bounces around your screen.**
**Give it a click — it kicks right back.**

![macOS](https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)

[![Download](https://img.shields.io/badge/Download-latest_release-2ea44f?style=for-the-badge&logo=github)](https://github.com/borzov/FootyBall/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

</div>

---

FootyBall drops a real, physics-driven football onto your desktop. Flick it with
your cursor and watch it bounce off the floor, the walls, and back into the air —
gravity, spin, and all. When you're done, it tucks away quietly in your menu bar
(or system tray) and stays out of the way. Clicks pass straight through to whatever
you're working on; only the ball reacts.

<div align="center">

<video src="https://github.com/borzov/FootyBall/raw/master/docs/footyball-demo.mp4" controls muted loop width="700"></video>

</div>

No accounts. No clutter. No distractions you didn't ask for. Just a ball, your
screen, and a quick moment of fun between tasks.

> 🏆 **Made to cheer on the FIFA World Cup 2026** — a tiny tribute to the beautiful
> game, sitting right on your desktop while the world plays.

## ⬇️ Download & Install

Grab the latest build from the **[Releases page](https://github.com/borzov/FootyBall/releases/latest)** and pick your platform.

### 🍎 macOS

1. Download the `.dmg` and drag **FootyBall** to Applications.
2. The app isn't notarized yet, so macOS may say it "can't be opened" or offer to
   move it to the Trash. To run it anyway:
   - **Right-click** the app → **Open** → **Open**, or
   - run in Terminal:
     ```bash
     xattr -dr com.apple.quarantine /Applications/FootyBall.app
     ```

### 🪟 Windows

1. Download the `*-setup.exe` (or the `.msi`) and run it.
2. SmartScreen may warn ("Windows protected your PC") because the build isn't
   signed yet — click **More info → Run anyway**.

### 🐧 Linux

- **AppImage:** `chmod +x FootyBall_*.AppImage` then run it.
- **Debian/Ubuntu:** install the `.deb`.
- **Fedora/RHEL:** install the `.rpm`.

## 🎮 How to play

- **Click the ball** to kick it up. Off-center clicks send it flying sideways.
- It **bounces off every edge** and settles on the floor when it runs out of steam.
- Click the **⚽ icon** in your menu bar / tray for **Show / Hide**, **Launch at
  login**, and **Quit**.

## 📝 Notes

FootyBall is built and tested on macOS. The Windows and Linux builds are produced
automatically for every release — if something looks off on your platform, open an
issue, feedback is welcome.

## License

MIT © 2026 Max Borzov — see [LICENSE](LICENSE).
