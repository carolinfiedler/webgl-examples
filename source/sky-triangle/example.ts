
declare var gloperate: any;

import { Canvas } from 'webgl-operate';

import { Skybox } from './skybox';
import { SkyTriangle } from './skytriangle';
import { SplitRenderer } from './splitrenderer';


function onload() {
    const canvas = new Canvas('example-canvas');
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
