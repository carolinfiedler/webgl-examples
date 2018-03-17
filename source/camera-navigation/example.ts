
import * as gloperate from 'webgl-operate';

import { CameraNavigationRenderer } from './renderer';


function onload() {
    const canvas = new gloperate.Canvas('example-canvas');
    canvas.clearColor.fromHex('f8f9fa');

    const context = canvas.context;

    const renderer = new CameraNavigationRenderer();
    canvas.renderer = renderer;

    /*
    canvas.element.addEventListener('click', function () { gloperate.viewer.Fullscreen.toggle(canvas.element); });
    canvas.element.addEventListener('touchstart', function () { gloperate.viewer.Fullscreen.toggle(canvas.element); });
    */

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
