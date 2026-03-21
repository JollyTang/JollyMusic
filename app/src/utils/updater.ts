const GITHUB_OWNER = 'JollyTang';
const GITHUB_REPO = 'JollyMusic';
const VERSION_KEY = 'ota_current_version';

function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

function getCurrentVersion(): string {
  return uni.getStorageSync(VERSION_KEY) || '0.0.0';
}

function setCurrentVersion(version: string) {
  uni.setStorageSync(VERSION_KEY, version);
}

interface GithubRelease {
  tag_name: string;
  assets: { name: string; browser_download_url: string }[];
}

async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.request({
        url: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        header: { Accept: 'application/vnd.github.v3+json' },
        success: (r) => resolve(r),
        fail: (e) => reject(e),
      });
    });
    if (res.statusCode === 200 && res.data?.tag_name) {
      return res.data as GithubRelease;
    }
    return null;
  } catch {
    return null;
  }
}

function findH5Asset(release: GithubRelease): string | null {
  const asset = release.assets.find(a => a.name.endsWith('.zip') && a.name.includes('h5'));
  return asset?.browser_download_url || null;
}

function parseVersion(tag: string): string {
  return tag.replace(/^(web-|v)/, '');
}

export async function checkForUpdate(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    await CapacitorUpdater.notifyAppReady();

    const release = await fetchLatestRelease();
    if (!release) return;

    const remoteVersion = parseVersion(release.tag_name);
    const localVersion = getCurrentVersion();

    if (remoteVersion === localVersion) return;

    const downloadUrl = findH5Asset(release);
    if (!downloadUrl) return;

    console.log(`[OTA] Downloading update: ${localVersion} -> ${remoteVersion}`);

    const bundle = await CapacitorUpdater.download({
      url: downloadUrl,
      version: remoteVersion,
    });

    await CapacitorUpdater.set(bundle);
    setCurrentVersion(remoteVersion);

    console.log(`[OTA] Update applied: ${remoteVersion}, will take effect on next launch`);
  } catch (err) {
    console.error('[OTA] Update check failed:', err);
  }
}
