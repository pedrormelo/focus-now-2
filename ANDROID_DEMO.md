# Android LAN Demo Setup (Ionic + Capacitor + Node backend)

This project can run the Android app on a phone and connect to a Node.js backend running on your laptop over Wi‑Fi using HTTP.

Follow these steps:

1. Put phone and laptop on the same Wi‑Fi.

1. Start the backend

- Ensure MySQL is running and accessible.
- From `backend/`: start the server on port 3000 and keep it running.
- Allow inbound TCP 3000 on your laptop firewall.

1. Point the app at your laptop IP

- Edit `frontend/src/environments/environment.demo.ts` and set:
  - `apiBaseUrl: 'http://<YOUR_LAN_IP>:3000'`
- Build the web assets using the "demo" configuration:

```pwsh
cd frontend
npm run build -- --configuration=demo
```

1. Generate/Update the Android project and copy web assets

```pwsh
# From the frontend folder
npx cap add android   # (only the first time)
npx cap copy android
```

1. Allow cleartext HTTP on Android (required for http:// URLs)

- Create `android/app/src/main/res/xml/network_security_config.xml` with:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <!-- Replace with your laptop IP; you can add multiple <domain> entries -->
    <domain includeSubdomains="false">YOUR_LAN_IP</domain>
  </domain-config>
  <!-- OPTIONAL: allow cleartext for all for demo purposes only -->
  <!-- <base-config cleartextTrafficPermitted="true" /> -->
</network-security-config>
```

- In `android/app/src/main/AndroidManifest.xml`, inside `<application ...>` add:

```xml
android:usesCleartextTraffic="true"
android:networkSecurityConfig="@xml/network_security_config"
```

1. Open Android Studio and run

```pwsh
npx cap open android
```

Select your device and Run. Log in and the app will call the backend at your laptop IP, sending the token in the Authorization header.

Notes
- The demo build uses Bearer token auth (`useCookies: false`) so HTTPS is not required.
- For production, prefer HTTPS + HttpOnly cookies (set `useCookies: true` and use an HTTPS URL).
- If port 3000 is in use on the laptop, stop the other process or set `PORT` and update `apiBaseUrl` accordingly.
