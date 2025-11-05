const config = {
    appId: 'com.focusnow.app',
    appName: 'FocusNow',
    // Point Capacitor's webDir to the frontend build output
    webDir: 'frontend/www',
    server: {
        // Use http scheme to avoid mixed-content issues when calling http APIs on Android
        androidScheme: 'http'
    }
} as const;

export default config;