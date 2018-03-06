
import { Canvas, Context } from 'webgl-operate';

import { SkyTriangle } from './skytriangle';


function onload() {
    const canvas = new Canvas('example-canvas');
    const context = canvas.context;
    const renderer = new SkyTriangle();
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
