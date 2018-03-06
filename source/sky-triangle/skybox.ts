
import { assert } from '../auxiliaries';

import {
    AbstractRenderer, Camera, DefaultFramebuffer, NdcFillingTriangle, Program,
    Shader, Texture2, TextureCube,
} from 'webgl-operate';

import { vec3 } from 'gl-matrix';

import { Cube } from './cube';


export class Skybox extends AbstractRenderer {

    protected _extensions = false;

    // shared
    protected _camera: Camera;

    protected _cube: Cube;

    protected _defaultFBO: DefaultFramebuffer;

    protected _texture: Texture2;
    protected _skyboxTexture: TextureCube;
    protected _imagesLoaded = 0;
    protected _cubeImages: [HTMLImageElement, HTMLImageElement, HTMLImageElement,
        HTMLImageElement, HTMLImageElement, HTMLImageElement];

    // skybox
    protected _program: Program;
    protected _uTransform: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;
    protected _aVertex: GLuint;

    // rotation
    protected _angle = 0.0;
    protected _rotate = true;

    protected onUpdate(): void {
        const gl = this.context.gl;

        if (this._extensions === false && this.context.isWebGL1) {
            assert(this.context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this.context.standardDerivatives;
            this._extensions = true;
        }

        if (this._camera === undefined) {
            this._camera = new Camera();
        }

        if (this._program === undefined) {
            this._program = new Program(this.context);
        }

        if (!this._program.initialized) {

            const vert = new Shader(this.context, gl.VERTEX_SHADER, 'skybox.vert');
            vert.initialize(require('./skybox.vert'));
            const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'skybox.frag');
            frag.initialize(require('./skybox.frag'));

            this._program.initialize([vert, frag]);
            this._aVertex = this._program.attribute('in_vertex', 0);

            this._uTransform = this._program.uniform('transform');
            this._uEye = this._program.uniform('eye');
            this._uBackground = this._program.uniform('background');
        }

        if (this._cube === undefined) {
            this._cube = new Cube(this.context, 'sky_box');
        }

        if (!this._cube.initialized) {
            this._cube.initialize(this._aVertex);
        }

        if (this._texture === undefined) {
            this._texture = new Texture2(this.context);
            // Fill the texture with a 1x1 blue pixel.
            this._texture.initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
            this._texture.data(new Uint8Array([255, 0, 255]));


            const image = new Image();
            image.src = 'img/soap.png';
            image.addEventListener('load', () => {
                // Now that the image has loaded make copy it to the texture.
                this._texture.resize(image.width, image.height);
                this._texture.data(image);
                this.invalidate();
            });
        }

        if (this._skyboxTexture === undefined) {
            this._skyboxTexture = new TextureCube(this.context);
            this._skyboxTexture.initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);

            const px = new Image();
            const nx = new Image();
            const py = new Image();
            const ny = new Image();
            const pz = new Image();
            const nz = new Image();

            px.src = 'img/skybox.px.png';
            nx.src = 'img/skybox.nx.png';
            py.src = 'img/skybox.py.png';
            ny.src = 'img/skybox.ny.png';
            pz.src = 'img/skybox.pz.png';
            nz.src = 'img/skybox.nz.png';

            const callback = () => { this._imagesLoaded++; };
            px.addEventListener('load', callback);
            nx.addEventListener('load', callback);
            py.addEventListener('load', callback);
            ny.addEventListener('load', callback);
            pz.addEventListener('load', callback);
            nz.addEventListener('load', callback);
        }

        // after all 6 are loaded
        if (this._imagesLoaded === 6) {
            this._skyboxTexture.resize(this._cubeImages[0].width, this._cubeImages[0].height);
            this._skyboxTexture.data(this._cubeImages);
        }

        if (this._defaultFBO === undefined) {
            this._defaultFBO = new DefaultFramebuffer(this.context, 'DefaultFBO');
            this._defaultFBO.initialize();

            // this._colorRenderTexture = new Texture2(this.context, 'ColorRenderTexture');
            // this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
            //     this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        }

        if (this._altered.frameSize) {
            // this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
        }

        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._program.bind();

        // update angle
        const speed = 1.0;
        if (this._rotate) {
            this._angle = (this._angle + speed) % 360;
        }
        const radiants = this._angle * Math.PI / 180.0;
        this._camera.center = vec3.fromValues(Math.sin(radiants), 0.0, Math.cos(radiants));

        gl.uniformMatrix4fv(this._uTransform, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform3fv(this._uEye, this._camera.eye);

        // this._texture.bind(0);
        this._skyboxTexture.bind(0);
        gl.uniform1i(this._uBackground, 0);

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
        this._cube.bind();
        this._cube.draw();
        this._cube.unbind();
        this._defaultFBO.unbind();
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected onDispose(): void {

        if (this._program && this._program.initialized) {
            this._program.uninitialize();
        }

        if (this._cube && this._cube.initialized) {
            this._cube.uninitialize();
        }

        if (this._defaultFBO.initialized) {
            this._defaultFBO.uninitialize();
        }
    }

}

