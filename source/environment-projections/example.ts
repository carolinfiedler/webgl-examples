
import * as gloperate from 'webgl-operate';

import { Cubemap } from './cubemap';
import { SplitRenderer } from './splitrenderer';


function onload() {
    const canvas = new gloperate.Canvas('example-canvas');
    canvas.clearColor.fromHex('f8f9fa');

    const context = canvas.context;

    const renderer = new SplitRenderer();
    canvas.renderer = renderer;

    // export variables
    (window as any)['canvas'] = canvas;
    (window as any)['context'] = context;
    (window as any)['renderer'] = renderer;
}

if (window.document.readyState === 'complete') {
    onload();
} else {
    window.onload = onload;
}
