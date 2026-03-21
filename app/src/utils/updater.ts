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
        timeout: 10000,
        success: (r) => resolve(r),
        fail: (e) => reject(e),
      });
    });
    if (res.statusCode === 200 && res.data?.tag_name) {
      return res.data as GithubRelease;
    }
    console.warn('[OTA] GitHub API returned status:', res.statusCode);
    return null;
  } catch (e) {
    console.error('[OTA] Failed to fetch release:', e);
    return null;
  }
}

function findH5Asset(release: GithubRelease): string | null {
  const asset = release.assets.find(a => a.name === 'h5-bundle.zip');
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
    if (!release) {
      console.log('[OTA] No release found or network error');
      return;
    }

    const remoteVersion = parseVersion(release.tag_name);
    const localVersion = getCurrentVersion();

    console.log(`[OTA] Local: ${localVersion}, Remote: ${remoteVersion}`);

    if (remoteVersion === localVersion) {
      console.log('[OTA] Already up to date');
      return;
    }

    const downloadUrl = findH5Asset(release);
    if (!downloadUrl) {
      console.log('[OTA] No h5-bundle.zip found in release assets');
      return;
    }

    console.log(`[OTA] Downloading: ${downloadUrl}`);
    uni.showToast({ title: '发现新版本，更新中...', icon: 'none', duration: 3000 });

    const bundle = await CapacitorUpdater.download({
      url: downloadUrl,
      version: remoteVersion,
    });

    await CapacitorUpdater.set(bundle);
    setCurrentVersion(remoteVersion);

    uni.showToast({ title: '更新完成，重启生效', icon: 'success', duration: 2000 });
    console.log(`[OTA] Update applied: ${remoteVersion}`);
  } catch (err: any) {
    console.error('[OTA] Update failed:', err);
    uni.showToast({ title: '更新检查失败: ' + (err?.message || '网络错误'), icon: 'none', duration: 3000 });
  }
}
