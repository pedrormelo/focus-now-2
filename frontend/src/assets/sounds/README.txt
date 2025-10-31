Place your MP3 tracks here.

Naming convention:
- Use the exact catalog IDs from the app and convert them to slugs: lowercase, non-alphanumeric -> '-', trim leading/trailing dashes.
- Example IDs to filenames:
  Sons da Floresta -> sons-da-floresta.mp3
  Sons de Chuva -> sons-de-chuva.mp3
  Quiet Resource - Evelyn -> quiet-resource-evelyn.mp3
  Saudade - Gabriel Albuquerque -> saudade-gabriel-albuquerque.mp3
  Mix de Frases #1 -> mix-de-frases-1.mp3
  Mix de Frases #2 -> mix-de-frases-2.mp3

Recommended encoding:
- Format: MP3 or AAC (mp3 preferred for broad support)
- Channels: Stereo or Mono
- Bitrate: 96-160 kbps (balance size and quality)
- Normalize loudness across tracks to avoid jumps.

Android notes:
- When building the APK, Angular will copy assets/ into the app. File paths resolve as `assets/sounds/<slug>.mp3`.
- Autoplay requires a user interaction on first run; after the first tap, background playback works.

Licensing:
- Ensure you have rights to distribute any audio added here.
