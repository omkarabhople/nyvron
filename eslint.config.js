export default [
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      globals: {
        // Standard Browser Globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        caches: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        SpeechSynthesisUtterance: "readonly",
        BroadcastChannel: "readonly",
        Blob: "readonly",
        URL: "readonly",
        Audio: "readonly",
        Image: "readonly",
        FileReader: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        sessionStorage: "readonly",
        btoa: "readonly",
        atob: "readonly",
        indexedDB: "readonly",
        Notification: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        IntersectionObserver: "readonly",
        DeviceMotionEvent: "readonly",
        MediaRecorder: "readonly",
        Node: "readonly",
        AbortSignal: "readonly"
      }
    },
    rules: {
      "no-redeclare": "error",
      "no-undef": "warn",
      "no-duplicate-case": "error",
      "no-empty": "off",
      "no-unused-vars": "off"
    }
  }
];
