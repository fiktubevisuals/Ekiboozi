# Google IMA SDK (AdSense for Video) Integration Guide

This guide outlines the architecture, code structure, and step-by-step instructions for monetizing Ekiboozi video content using the **Google Interactive Media Ads (IMA) HTML5 SDK** for **Pre-roll** and **Mid-roll** video ads.

---

## 1. Overview & Architecture

Unlike standard display AdSense (which serves banner images around the page), **AdSense for Video (AFV)** and **Google Ad Manager (GAM)** use the **Google IMA SDK** to deliver linear video commercials directly inside the video player before, during, or after video playback.

```
+-------------------------------------------------------------------+
|                        VideoPlayerModal                           |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   |   HTML5 <video> Element (Content Stream)                  |   |
|   +-----------------------------------------------------------+   |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   |   <div id="ima-ad-container"> (Google IMA SDK Layer)      |   |
|   |   - AdDisplayContainer                                    |   |
|   |   - AdsLoader & AdsManager                                |   |
|   +-----------------------------------------------------------+   |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   |   <ImaAdOverlay /> (Custom UX Layer)                      |   |
|   |   - "Ad · 1 of 1" Badge      - "Visit Advertiser" Link    |   |
|   |   - Ad Countdown ("0:12")    - "Skip Ad in 5s" Button     |   |
|   |   - Mid-roll Yellow Dots on Timeline Scrubber             |   |
|   +-----------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

---

## 2. File Structure in Ekiboozi

| File | Purpose |
|------|---------|
| `index.html` | Loads the Google IMA HTML5 SDK asynchronously: `https://imasdk.googleapis.com/js/sdkloader/ima3.js` |
| `src/types/ima.d.ts` | Complete TypeScript type definitions for `google.ima.*` namespaces, classes, and event types |
| `src/utils/imaConstants.ts` | Official Google test VAST ad tags, dynamic VAST URL macro builder (`[PAGEURL]`, `[CORRELATOR]`), and mid-roll cue point calculators |
| `src/hooks/useImaAds.ts` | React custom hook managing IMA container initialization, ad requests, play/pause handoffs, event listeners, and safe fallback simulation |
| `src/components/ImaAdOverlay.tsx` | Visual overlay component containing the native IMA SDK mount container, skip countdowns, advertiser links, and testing tools |
| `src/components/VideoPlayerModal.tsx` | Main video player view integrating the hook, syncing time updates for mid-rolls, and rendering cue point markers on the scrubber |

---

## 3. How Pre-Roll and Mid-Roll Work

### Pre-Roll Ads
- Triggered immediately when a viewer starts watching a video.
- The IMA SDK pauses the content video (`CONTENT_PAUSE_REQUESTED`) and streams the video commercial.
- When the ad finishes or the viewer clicks **"Skip Ad"**, the IMA SDK fires `CONTENT_RESUME_REQUESTED`, resuming the main video.

### Mid-Roll Ads & Cue Points
- Mid-roll cue points are automatically calculated based on the video duration via `calculateMidrollCuepoints(durationSeconds)`:
  - **Short videos (< 30s):** No mid-roll ads (avoids disrupting short clips).
  - **Medium videos (30s – 3m):** 1 mid-roll break placed at **50%** of the video.
  - **Longer videos (> 3m):** Mid-roll breaks placed at **30%** and **70%**.
- Yellow cue markers appear directly on the video scrubber timeline so viewers and creators know where ad breaks will occur.
- During playback, `checkMidroll(currentTime)` detects when the playhead reaches a cue point and triggers the ad break.

---

## 4. Testing Your Implementation

Ekiboozi includes an interactive **Google IMA Ad Tester** panel built into the video player (visible in development mode):

1. Open any video in **Ekiboozi**.
2. Expand the **"Google IMA Ad Tester"** dropdown in the top-right corner of the video stage.
3. Test sample VAST tags provided by Google:
   - **Skippable Linear (Standard 30s, Skip after 5s)**
   - **Standard Pre-Roll (Non-Skippable 15s)**
   - **VMAP (Pre-Roll + Mid-Roll @ 15s)**
   - **Ad Pod (Two 15s Ads Back-to-Back)**
   - **Simulated Fallback Mode** (works even with ad-blockers enabled)

---

## 5. Transitioning to Live Production Ads

When your site is approved for **AdSense for Video (AFV)** or **Google Ad Manager (GAM)**:

### Step 1: Obtain Your Live VAST Ad Tag
From your Google AdSense or Google Ad Manager dashboard:
- Navigate to **Inventory** > **Ad Units** (or **AdSense for Video** tag generator).
- Generate a **VAST 3.0 / 4.0** or **VMAP** ad tag URL.
- Example production tag format:
  ```
  https://pubads.g.doubleclick.net/gampad/ads?iu=/YOUR_NETWORK_CODE/ekiboozi_video&sz=640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=[CORRELATOR]&description_url=[DESCRIPTION_URL]
  ```

### Step 2: Configure Environment Variable
In `.env` / `.env.example`, add:
```env
VITE_IMA_AD_TAG_URL=https://pubads.g.doubleclick.net/gampad/ads?iu=/...
```

### Step 3: Update Default Tag URL
In `src/utils/imaConstants.ts` or `src/hooks/useImaAds.ts`, update `adTagUrl` default value:
```ts
const defaultAdTag = import.meta.env.VITE_IMA_AD_TAG_URL || SAMPLE_IMA_AD_TAGS[0].url;
```

---

## 6. AdSense Video Policy Compliance Checklist

To ensure approval and prevent policy strikes:

- [x] **User Gesture Initiation:** Ad initialization (`adDisplayContainer.initialize()`) is executed strictly upon user interaction (clicking play).
- [x] **Autoplay Mute Handling:** If autoplay is initiated without user interaction, sound is muted according to browser policies.
- [x] **Fail-Safe Fallback:** If an ad fails to load or the network drops (`AD_ERROR`), the video player automatically resumes content playback without breaking the user experience.
- [x] **No Hidden Overlay Violations:** Content playback is cleanly paused during ad rendering, preventing concurrent audio playback.
- [x] **Legal Transparency:** Privacy policy and cookie consent explicitly state the use of third-party advertising cookies.
