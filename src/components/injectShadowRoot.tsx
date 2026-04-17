import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { FlowGraph } from './FlowGraph';

// Import CSS as raw string thanks to Vite's ?inline query!
import reactFlowCss from 'reactflow/dist/style.css?inline';

// Map of file paths to their React roots so we can update instead of unmount/remount
const attachedRoots = new Map<string, Root>();

export function injectShadowRootAndRender(
  parentElement: HTMLElement, 
  filePath: string,
  rawNodes: any[], 
  rawEdges: any[]
) {
    let container = document.getElementById(`muleflow-canvas-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`);
    
    if (!container) {
        // Create full bleed container that sits just below the file header
        container = document.createElement('div');
        container.id = `muleflow-canvas-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
        container.style.cssText = 'width:100%;height:500px;margin-top:10px;margin-bottom:10px;';
        
        // This is where GitHub usually places the source code diff:
        // We will insert our container before the file content wrapper table.
        // Or append to file header.
        
        // Find the diff container that holds the table
        const tableContainer = parentElement.querySelector('.border.position-relative.rounded-bottom-2');
        if (tableContainer) {
             parentElement.insertBefore(container, tableContainer);
        } else {
             parentElement.appendChild(container);
        }

        // Attach Shadow DOM
        const shadow = container.attachShadow({ mode: 'open' });
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = reactFlowCss;
        shadow.appendChild(styleSheet);
        
        // Custom reset css just for shadow dom 
        const resetCss = document.createElement('style');
        resetCss.textContent = `
           * { box-sizing: border-box; }
           .react-flow__node {
               /* ensure we dont inherit bad github styles */
           }
        `;
        shadow.appendChild(resetCss);

        const reactRootContainer = document.createElement('div');
        reactRootContainer.style.width = '100%';
        reactRootContainer.style.height = '100%';
        shadow.appendChild(reactRootContainer);

        const root = createRoot(reactRootContainer);
        attachedRoots.set(container.id, root);
        root.render(<FlowGraph rawNodes={rawNodes} rawEdges={rawEdges} />);
    } else {
        // If it exists, just trigger a re-render with new data!
        const root = attachedRoots.get(container.id);
        if (root) {
             root.render(<FlowGraph rawNodes={rawNodes} rawEdges={rawEdges} />);
        }
    }
}
