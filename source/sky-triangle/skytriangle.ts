
import { assert } from '../auxiliaries';

import {
    AbstractRenderer, BlitPass, Camera, DefaultFramebuffer, Framebuffer, NdcFillingTriangle, Program, Renderbuffer,
    Shader, Texture2, TextureCube,
} from 'webgl-operate';

import { vec3 } from 'gl-matrix';


export class SkyTriangle extends AbstractRenderer {

    protected _extensions = false;

    protected _camera: Camera;

    // sky triangle
    protected _skyTriangle: NdcFillingTriangle;
    protected _skyTexture: TextureCube;
    protected _imagesLoaded = 0;
    protected _skyImages: [HTMLImageElement, HTMLImageElement, HTMLImageElement,
        HTMLImageElement, HTMLImageElement, HTMLImageElement];
    protected _skyProgram: Program;
    protected _uInverseVP: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;
    protected _aVertex: GLuint;

    // rotation
    protected _angle = 0.0;
    protected _rotate = true;


    protected updateSkyTriangle(): void {
        const gl = this.context.gl;

        if (this._skyProgram === undefined) {
            this._skyProgram = new Program(this.context);
        }

        if (!this._skyProgram.initialized) {

            const vert = new Shader(this.context, gl.VERTEX_SHADER, 'skytriangle.vert');
            vert.initialize(require('./skytriangle.vert'));
            const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'skytriangle.frag');
            frag.initialize(require('./skytriangle.frag'));

            this._skyProgram.initialize([vert, frag]);
            this._aVertex = this._skyProgram.attribute('in_vertex', 0);

            this._uInverseVP = this._skyProgram.uniform('inverseViewProjection');
            this._uEye = this._skyProgram.uniform('eye');
            this._uBackground = this._skyProgram.uniform('background');
        }

        if (this._skyTexture === undefined) {
            this._skyTexture = new TextureCube(this.context);
            this._skyTexture.initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);

            const px = new Image();
            const nx = new Image();
            const py = new Image();
            const ny = new Image();
            const pz = new Image();
            const nz = new Image();

            this._skyImages = [px, nx, py, ny, pz, nz];

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

        if (this._imagesLoaded === 6) {
            this._skyTexture.resize(this._skyImages[0].width, this._skyImages[0].height);
            this._skyTexture.data(this._skyImages);
        }

        if (this._skyTriangle === undefined) {
            this._skyTriangle = new NdcFillingTriangle(this.context, 'sky_tri');
        }

        if (!this._skyTriangle.initialized) {
            this._skyTriangle.initialize(this._aVertex);
        }
    }


    protected onUpdate(): void {
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        if (this._extensions === false && this.context.isWebGL1) {
            assert(this.context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this.context.standardDerivatives;
            this._extensions = true;
        }

        this.updateSkyTriangle();

        if (this._camera === undefined) {
            this._camera = new Camera();
            this._camera.center = vec3.fromValues(0.0, 0.0, 1.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.eye = vec3.fromValues(0.0, 0.0, 0.0);
            this._camera.near = 0.1;
            this._camera.far = 15.0;
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        // gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];

        // update angle
        const speed = 1.0;
        if (this._rotate) {
            this._angle = (this._angle + speed) % 360;
        }
        const radians = this._angle * Math.PI / 180.0;
        this._camera.center = vec3.fromValues(Math.sin(radians), 0.0, Math.cos(radians));

        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);

        this._skyProgram.bind();
        gl.uniformMatrix4fv(this._uInverseVP, gl.GL_FALSE, this._camera.viewProjectionInverse);
        gl.uniform3fv(this._uEye, this._camera.eye);
        this._skyTexture.bind(0);
        gl.uniform1i(this._uBackground, 0);

        this._skyTriangle.bind();
        this._skyTriangle.draw();
        this._skyTriangle.unbind();

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.enable(gl.CULL_FACE);
    }

    protected onSwap(): void {
        // this._blit.frame();
        this.invalidate();
    }

    protected onDispose(): void {

        if (this._skyProgram && this._skyProgram.initialized) {
            this._skyProgram.uninitialize();
        }

        if (this._skyTriangle && this._skyTriangle.initialized) {
            this._skyTriangle.uninitialize();
        }
    }

}

