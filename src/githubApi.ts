/**
 * Utilities for fetching raw source code files directly from the GitHub API, 
 * bypassing the fragmented/truncated DOM diffs.
 */

export async function fetchCompleteXmlFiles(url: string, filePath: string): Promise<{ baseXml: string, headXml: string }> {
    const parsedUrl = new URL(url);
    const host = parsedUrl.host;
    
    // Path is usually /owner/repo/pull/84
    const pathParts = parsedUrl.pathname.split('/').filter(p => p.length > 0);
    if (pathParts.length < 4 || pathParts[2] !== 'pull') {
        throw new Error("Could not extract owner, repo, and PR number from URL path.");
    }
    
    const owner = pathParts[0];
    const repo = pathParts[1];
    const pullNumber = pathParts[3];
    
    // Determine API base url
    const isPublicGithub = host === 'github.com';
    const apiBase = isPublicGithub ? `https://api.github.com` : `https://${host}/api/v3`;
    
    console.log(`MuleFlow: Querying API for Shas at ${apiBase}`);

    const prRes = await fetch(`${apiBase}/repos/${owner}/${repo}/pulls/${pullNumber}`);
    if (!prRes.ok) throw new Error(`Failed to fetch PR info: ${prRes.statusText}`);
    const prData = await prRes.json();
    
    const baseSha = prData.base.sha;
    const headSha = prData.head.sha;
    
    console.log(`MuleFlow: Fetched PR Shas - Base: ${baseSha}, Head: ${headSha}`);

    async function getRawFile(sha: string): Promise<string> {
        // Hitting the raw endpoint directly via the main host takes advantage of existing browser cookies/sessions!
        const fileUrl = `https://${host}/${owner}/${repo}/raw/${sha}/${filePath}`;
        const res = await fetch(fileUrl, { redirect: 'follow' });
        if (!res.ok && res.status !== 404) {
            throw new Error(`Failed to fetch raw file: ${res.statusText}`);
        }
        if (res.status === 404) {
            return ''; // File did not exist at this sha
        }
        return await res.text();
    }

    const [baseXml, headXml] = await Promise.all([
        getRawFile(baseSha),
        getRawFile(headSha)
    ]);

    return { baseXml, headXml };
}
