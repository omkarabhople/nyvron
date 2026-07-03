1. **iOS-Style Dock Navigation (Micro-Animations):**
   - Modify `updateDockIndicator` in `app.js` to dynamically add a temporary class indicating the direction of slide, and update `styles.css` to add a spring animation (`width` and `transform` or use `transition: all .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)` for `dock-indicator`). Also, ensure SVG icons inside `.tb-item` scale down to 0.9 on `:active` and up slightly on hover.

2. **Smooth Theme Transitions (Visual Sweep):**
   - In `app.js`, when changing theme (in `applyManualTheme`, `applyAutoTheme`, and `.cr-theme-select` event listener), implement Document View Transitions API: `document.startViewTransition(() => { /* theme change code */ })`. Since the native browser API is sufficient and creates a cross-fade/sweep effect seamlessly, this satisfies the polish.

3. **AI Chat Bubbles & Empty State (Aesthetic Polish):**
   - In `styles.css`, style `.msg.ai .msg-bubble` and `.msg.user .msg-bubble` to have `animation: bubbleFadeIn 0.3s ease-out forwards`. Add glow behind `.nyvron-bloom` in `ai-empty-state` using `filter: drop-shadow(0 0 10px rgba(46, 204, 113, 0.6))`. Style the chat input bar with `.ai-input-bar` adding `backdrop-filter: blur(10px); background: rgba(..., 0.5)`. Add pulsing animation for typing state.

4. **Interactive Reading Timeline Track (Calendar tab):**
   - Update `app.js` calendar events rendering (`renderCalendarEvents`). Currently, it just lists text. Wrap each item in a glassmorphic vertical track card style, with glowing line to the left. Modify `styles.css` to add `.cal-event-card` with frosted styling.

5. **Floating Panels (Pen & Font Settings):**
   - Add glassmorphic styling to `cr-pen-settings` and `cr-font-settings` (and others) using `backdrop-filter: saturate(180%) blur(20px); background: rgba(28,28,30,0.65)`. Add CSS animation for `transform: scale(0.9) translateY(10px)` to scale(1) `translateY(0)` with opacity fade. Currently, they use inline styles or `.cr-floating-panel`.

6. **iOS Control Center-style Volume/Slider Bars:**
   - Update CSS for `input[type="range"]` specifically `#cr-zoom-slider` (and others). Override default appearance, give it a thick background. Add `:active` state to increase height/scale.

7. **Full-Screen Morphing App Open (Opening Books):**
   - In `app.js` `openBookReader`, apply view transitions `document.startViewTransition`. For specific book elements, we might need manual bounding rect animations or just use `startViewTransition` with `view-transition-name` on the clicked card and the reader overlay to automatically morph them.

8. **iOS-Style Drag-to-Dismiss Sheets (Chapters & Summary Sidebars):**
   - For `#cr-sidebar`, `#cr-mcq-sidebar`, implement touch drag to dismiss. Add event listeners (`touchstart`, `touchmove`, `touchend`) to calculate swipe off screen in `app.js`. Apply spring transitions on release if not dismissed.

9. **Interactive 3D Parallax Tilt (Book Covers):**
   - In `app.js`, add event listeners to `.book-cover-card` (`mousemove`, `mouseleave`) to calculate mouse position relative to card center and apply `transform: perspective(1000px) rotateX(...) rotateY(...)` dynamically.

10. **Siri-Style Multi-Color Audio Waves (Voice Ambient Capture):**
    - In `app.js` `initSmartCapture()`, replace the button's static icon color toggle with an animated SVG or Canvas wave. Or inject CSS keyframes for a glowing multi-colored aura `box-shadow` that pulses dynamically while `isRecording` is true.

11. **Spring-Loaded Card Flips & Swipes (Flashcard deck review):**
    - Update `fc-carousel-card` double-tap to trigger 3D flip. Replace `onclick` in `app.js` with `ondblclick` or track double tap.
    - Implement swipe left/right gesture tracking on `fc-carousel-card` for correct/incorrect, animating position and rotation based on drag distance, and throwing it away on release.
