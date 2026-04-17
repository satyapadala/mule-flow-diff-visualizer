export function extractXmlFromDiff(buttonElement: HTMLElement): { baseXml: string, headXml: string } {
    const fileContainer = buttonElement.closest('[id^="diff-"], .js-file, [data-details-container-group="file"]');
    if (!fileContainer) {
        throw new Error('Could not find the encompassing file container.');
    }

    const table = fileContainer.querySelector('table');
    if (!table) {
        throw new Error('Could not find the diff table.');
    }

    const rows = table.querySelectorAll('tr');
    const baseLines: string[] = [];
    const headLines: string[] = [];

    // GitHub's unified vs split view logic:
    // It's robust to just check line numbers and corresponding texts.
    // If we have data-diff-side="left", right, we use that.
    
    rows.forEach(row => {
        // Skip hunk headers (@@ ...)
        if (row.querySelector('.hunk-kebab-icon, .blob-num-hunk, .diff-hunk-cell, .blob-code-hunk')) {
            return;
        }

        // Split view
        const leftCell = row.querySelector('.left-side-diff-cell');
        const rightCell = row.querySelector('.right-side-diff-cell');
        
        // Unified view
        const addition = row.querySelector('.blob-code-addition, .addition');
        const deletion = row.querySelector('.blob-code-deletion, .deletion');
        const context = row.querySelector('.blob-code-context, .context');

        if (leftCell || rightCell) {
            // Split view parsing
            if (leftCell) {
                const text = parseCellContent(leftCell as HTMLElement);
                // The deleted class signifies it's present in base but NOT head.
                // An empty cell means there's no left side (an addition) 
                // But typically if `leftCell` exists it means there's content. Wait, GitHub gives `leftCell` the deletion class or neutral class.
                // Let's rely on what actual text is inside. Wait, text alone doesn't differentiate empty cell from empty line!
                
                // If it's a purely new line, the left cell is often empty and lacks inner diff text.
                if (text !== null) {
                    baseLines.push(text);
                }
            }
            if (rightCell) {
                const text = parseCellContent(rightCell as HTMLElement);
                if (text !== null) {
                    headLines.push(text);
                }
            }
            return;
        }

        // Unified view parsing
        if (addition) {
            headLines.push(parseCellContent(addition as HTMLElement) || '');
        } else if (deletion) {
            baseLines.push(parseCellContent(deletion as HTMLElement) || '');
        } else if (context) {
            const txt = parseCellContent(context as HTMLElement) || '';
            baseLines.push(txt);
            headLines.push(txt);
        } else {
            // Some other generic format... Let's check if it has multiple tds with diff-text
            const diffTexts = row.querySelectorAll('.diff-text-inner, .blob-code-inner');
            if (diffTexts.length === 1) {
               // Fallback: Check if there's a + or - sign, or data-line-number
               // This is tricky.
            } else if (diffTexts.length === 2) {
               baseLines.push(diffTexts[0].textContent || '');
               headLines.push(diffTexts[1].textContent || '');
            }
        }
    });

    return {
        baseXml: baseLines.join('\n'),
        headXml: headLines.join('\n')
    };
}

function parseCellContent(cell: HTMLElement): string | null {
    if (cell.classList.contains('empty-cell')) return null;

    const inner = cell.querySelector('.diff-text-inner, .blob-code-inner');
    if (!inner) {
        // No inner container usually means it's a structural empty cell in split view.
        return null;
    }
    
    // inner.textContent naturally ignores the <span class="diff-text-marker">+ or -</span>
    // because that marker sibling is outside the inner div.
    return inner.textContent || '';
}
