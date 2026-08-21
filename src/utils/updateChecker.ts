import packageJson from '../../package.json';

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
}

export const CURRENT_VERSION = packageJson.version; // e.g. "0.1.0"
export const REPO_OWNER = 'itshimelz';
export const REPO_NAME = 'DiaryNote';
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

/**
 * Compare two semver version strings (e.g. "0.1.1" vs "0.1.0")
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/, '').trim();
  const cleanV2 = v2.replace(/^v/, '').trim();

  const parts1 = cleanV1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = cleanV2.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

const DISMISSED_STORAGE_KEY = 'diarynote_dismissed_update_version';

export async function checkForAppUpdates(): Promise<{
  updateAvailable: boolean;
  latestRelease?: ReleaseInfo;
  isFirstTimeAlert?: boolean;
}> {
  try {
    const timestamp = Date.now();
    let data: any = null;

    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest?t=${timestamp}`,
      {
        cache: 'no-cache',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.ok) {
      data = await response.json();
    } else {
      // Fallback: fetch release list if /latest is rate-limited or cached
      const listResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?t=${timestamp}`,
        {
          cache: 'no-cache',
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      if (listResponse.ok) {
        const releases = await listResponse.json();
        if (Array.isArray(releases) && releases.length > 0) {
          data = releases.find((r: any) => !r.draft && !r.prerelease) || releases[0];
        }
      }
    }

    if (!data) {
      return { updateAvailable: false };
    }

    const tagName = data.tag_name || '';
    const latestVersion = tagName.replace(/^v/, '');

    if (compareSemver(latestVersion, CURRENT_VERSION) > 0) {
      const dismissedVersion = localStorage.getItem(DISMISSED_STORAGE_KEY);
      const isFirstTimeAlert = dismissedVersion !== latestVersion;

      const latestRelease: ReleaseInfo = {
        version: latestVersion,
        tagName,
        name: data.name || tagName,
        body: data.body || '',
        htmlUrl: data.html_url || `${REPO_URL}/releases/latest`,
        publishedAt: data.published_at || '',
      };

      return {
        updateAvailable: true,
        latestRelease,
        isFirstTimeAlert,
      };
    }

    return { updateAvailable: false };
  } catch {
    return { updateAvailable: false };
  }
}

export function dismissUpdateAlert(version: string) {
  localStorage.setItem(DISMISSED_STORAGE_KEY, version);
}
