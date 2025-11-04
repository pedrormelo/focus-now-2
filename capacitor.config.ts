const config = {
    appId: 'com.focusnow.app',
    appName: 'FocusNow',
    // Point Capacitor's webDir to the frontend build output
    webDir: 'frontend/www',
    server: {
        androidScheme: 'https'
    }
} as const;

export default config;