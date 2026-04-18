/**
 * Sourcegraph integration utilities.
 *
 * Detects whether the current page is a Sourcegraph file view for an XML file,
 * extracts repository/path metadata from the URL, and fetches raw file content
 * via the Sourcegraph raw endpoint.
 *
 * Supported URL patterns:
 *   sourcegraph.com/<repo>/-/blob/<path>
 *   sg.<company>.com/<repo>/-/blob/<path>
 *   sourcegraph.<company>.com/<repo>/-/blob/<path>
 */

export interface SourcegraphFileInfo {
    host: string;
    /** Full repo identifier, e.g. "github.com/acme/my-repo" */
    repo: string;
    /** Revision (branch/tag/commit) – empty string for HEAD */
    revision: string;
    /** File path within the repo */
    filePath: string;
}

/**
 * Returns file metadata if the current page is a Sourcegraph blob view
 * for an XML file, or `null` otherwise.
 */
export function detectSourcegraphXmlFile(): SourcegraphFileInfo | null {
    const host = window.location.hostname;

    // Quick domain check: must contain "sourcegraph" or start with "sg."
    const isSG =
        host.includes('sourcegraph') ||
        host.startsWith('sg.') ||
        host.startsWith('sourcegraph.');
    if (!isSG) return null;

    // URL shape: /<repo-path>/-/blob/<revision>/<file-path>
    // or:        /<repo-path>@<revision>/-/blob/<file-path>
    const pathname = window.location.pathname;

    // Must be a blob view
    const blobIdx = pathname.indexOf('/-/blob/');
    if (blobIdx === -1) return null;

    const repoSegment = pathname.substring(1, blobIdx); // everything before /-/blob/
    const afterBlob = pathname.substring(blobIdx + '/-/blob/'.length);

    if (!afterBlob) return null;

    // Check if it's an XML file
    if (!afterBlob.toLowerCase().endsWith('.xml')) return null;

    // Parse optional @revision from the repo segment
    let repo = repoSegment;
    let revision = '';
    const atIdx = repoSegment.lastIndexOf('@');
    if (atIdx !== -1) {
        repo = repoSegment.substring(0, atIdx);
        revision = repoSegment.substring(atIdx + 1);
    }

    const filePath = afterBlob;

    return { host, repo, revision, filePath };
}

/**
 * Fetch the raw XML content of a file from a Sourcegraph instance.
 */
export async function fetchSourcegraphRawFile(info: SourcegraphFileInfo): Promise<string> {
    // Sourcegraph raw endpoint: /<repo>@<rev>/-/raw/<path>
    // If no revision, omit @rev (serves default branch).
    const revPart = info.revision ? `@${info.revision}` : '';
    const rawUrl = `https://${info.host}/${info.repo}${revPart}/-/raw/${info.filePath}`;

    console.log(`MuleFlow: Fetching raw XML from Sourcegraph: ${rawUrl}`);

    const res = await fetch(rawUrl, { redirect: 'follow', credentials: 'include' });
    if (!res.ok) {
        throw new Error(`Sourcegraph raw fetch failed (${res.status}): ${res.statusText}`);
    }
    return res.text();
}
