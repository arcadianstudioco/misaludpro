import pubspecRaw from '../../flutter_app/pubspec.yaml?raw';
import readmeRaw from '../../flutter_app/README.md?raw';
import mainRaw from '../../flutter_app/lib/main.dart?raw';
import themeRaw from '../../flutter_app/lib/theme/app_theme.dart?raw';
import modelsRaw from '../../flutter_app/lib/models/health_models.dart?raw';
import storageRaw from '../../flutter_app/lib/services/local_storage_service.dart?raw';
import welcomeRaw from '../../flutter_app/lib/screens/welcome_screen.dart?raw';
import homeRaw from '../../flutter_app/lib/screens/home_screen.dart?raw';
import routinesRaw from '../../flutter_app/lib/screens/routines_screen.dart?raw';
import nutritionRaw from '../../flutter_app/lib/screens/nutrition_screen.dart?raw';
import statsRaw from '../../flutter_app/lib/screens/stats_screen.dart?raw';
import healthRaw from '../../flutter_app/lib/screens/health_screen.dart?raw';
import profileRaw from '../../flutter_app/lib/screens/profile_screen.dart?raw';
import androidManifestRaw from '../../flutter_app/android/app/src/main/AndroidManifest.xml?raw';
import iosPlistRaw from '../../flutter_app/ios/Runner/Info.plist?raw';

export interface FlutterProjectFile {
  path: string;
  content: string;
}

interface BinaryZipEntry {
  path: string;
  bytes: Uint8Array;
}

const FLUTTER_IMAGE_MAP: { zipPath: string; url: string }[] = [
  {
    zipPath: 'mi_salud_pro/assets/images/welcome_athlete_hero.jpg',
    url: '/src/assets/images/welcome_athlete_hero_1795375176051.jpg',
  },
  {
    zipPath: 'mi_salud_pro/assets/images/routine_strength_hero.jpg',
    url: '/src/assets/images/routine_strength_hero_1795375174832.jpg',
  },
  {
    zipPath: 'mi_salud_pro/assets/images/routine_cardio_thumb.jpg',
    url: '/src/assets/images/routine_cardio_thumb_1795375176185.jpg',
  },
  {
    zipPath: 'mi_salud_pro/assets/images/routine_mobility_thumb.jpg',
    url: '/src/assets/images/routine_mobility_thumb_1795375175433.jpg',
  },
  {
    zipPath: 'mi_salud_pro/assets/images/routine_kegel_thumb.jpg',
    url: '/src/assets/images/routine_kegel_thumb_1795375176212.jpg',
  },
  {
    zipPath: 'mi_salud_pro/assets/images/nutrition_meal_bowl.jpg',
    url: '/src/assets/images/nutrition_meal_bowl_1795375176431.jpg',
  },
  {
    zipPath: 'mi_salud_pro/assets/images/user_profile_avatar.jpg',
    url: '/src/assets/images/user_profile_avatar_1795375176207.jpg',
  },
];

export const FLUTTER_PROJECT_FILES: FlutterProjectFile[] = [
  { path: 'mi_salud_pro/pubspec.yaml', content: pubspecRaw },
  { path: 'mi_salud_pro/README.md', content: readmeRaw },
  { path: 'mi_salud_pro/lib/main.dart', content: mainRaw },
  { path: 'mi_salud_pro/lib/theme/app_theme.dart', content: themeRaw },
  { path: 'mi_salud_pro/lib/models/health_models.dart', content: modelsRaw },
  { path: 'mi_salud_pro/lib/services/local_storage_service.dart', content: storageRaw },
  { path: 'mi_salud_pro/lib/screens/welcome_screen.dart', content: welcomeRaw },
  { path: 'mi_salud_pro/lib/screens/home_screen.dart', content: homeRaw },
  { path: 'mi_salud_pro/lib/screens/routines_screen.dart', content: routinesRaw },
  { path: 'mi_salud_pro/lib/screens/nutrition_screen.dart', content: nutritionRaw },
  { path: 'mi_salud_pro/lib/screens/stats_screen.dart', content: statsRaw },
  { path: 'mi_salud_pro/lib/screens/health_screen.dart', content: healthRaw },
  { path: 'mi_salud_pro/lib/screens/profile_screen.dart', content: profileRaw },
  { path: 'mi_salud_pro/android/app/src/main/AndroidManifest.xml', content: androidManifestRaw },
  { path: 'mi_salud_pro/ios/Runner/Info.plist', content: iosPlistRaw },
];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipBlob(entries: BinaryZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const dataBytes = entry.bytes;
    const crc = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    localChunks.push(local, dataBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    centralChunks.push(central);
    offset += local.length + dataBytes.length;
  }

  const centralSize = centralChunks.reduce((sum, c) => sum + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localChunks, ...centralChunks, eocd] as BlobPart[], {
    type: 'application/zip',
  });
}

export async function downloadFlutterProjectZip(): Promise<void> {
  const encoder = new TextEncoder();
  const entries: BinaryZipEntry[] = FLUTTER_PROJECT_FILES.map((f) => ({
    path: f.path,
    bytes: encoder.encode(f.content),
  }));

  await Promise.all(
    FLUTTER_IMAGE_MAP.map(async (img) => {
      try {
        const res = await fetch(img.url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          entries.push({ path: img.zipPath, bytes: new Uint8Array(buf) });
        }
      } catch {
        // Ignore if asset fetch fails offline
      }
    })
  );

  const blob = buildZipBlob(entries);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mi_salud_pro_flutter.zip';
  a.click();
  URL.revokeObjectURL(url);
}
