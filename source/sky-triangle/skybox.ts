
import { assert } from '../auxiliaries';

import {
    AbstractRenderer, Camera, DefaultFramebuffer, NdcFillingTriangle, Program,
    Shader, Texture2, TextureCube,
} from 'webgl-operate';

import { mat4, vec3 } from 'gl-matrix';

import { Cube } from './cube';


export class Skybox extends AbstractRenderer {

    protected _extensions = false;

    // shared
    protected _camera: Camera;

    protected _defaultFBO: DefaultFramebuffer;

    // skybox
    protected _skyCube: Cube;
    protected _skyTexture: TextureCube;
    protected _imagesLoaded = 0;
    protected _skyImages: [HTMLImageElement, HTMLImageElement, HTMLImageElement,
        HTMLImageElement, HTMLImageElement, HTMLImageElement];
    protected _skyProgram: Program;
    protected _uTransform: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;
    protected _aVertex: GLuint;

    // rotation
    protected _angle = 0.0;
    protected _rotate = true;

    // flying cubes
    protected _cube: Cube;
    protected _cubeProgram: Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _aCubeVertex: GLuint;
    protected _cubeMatrix1: mat4;
    protected _cubeMatrix2: mat4;


    protected updateSky(): void {
        const gl = this.context.gl;

        if (this._skyProgram === undefined) {
            this._skyProgram = new Program(this.context);
        }

        if (!this._skyProgram.initialized) {

            const vert = new Shader(this.context, gl.VERTEX_SHADER, 'skybox.vert');
            vert.initialize(require('./skybox.vert'));
            const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'skybox.frag');
            frag.initialize(require('./skybox.frag'));

            this._skyProgram.initialize([vert, frag]);
            this._aVertex = this._skyProgram.attribute('in_vertex', 0);

            this._uTransform = this._skyProgram.uniform('transform');
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

        if (this._skyCube === undefined) {
            this._skyCube = new Cube(this.context, 'sky_box');
        }

        if (!this._skyCube.initialized) {
            this._skyCube.initialize(this._aVertex);
        }
    }

    protected updateCube(): void {
        const gl = this.context.gl;

        if (this._cubeProgram === undefined) {
            this._cubeProgram = new Program(this.context);
        }

        if (!this._cubeProgram.initialized) {

            const vert = new Shader(this.context, gl.VERTEX_SHADER, 'cube.vert');
            vert.initialize(require('./cube.vert'));
            const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'cube.frag');
            frag.initialize(require('./cube.frag'));

            this._cubeProgram.initialize([vert, frag]);
            this._aCubeVertex = this._cubeProgram.attribute('in_vertex', 0);

            this._uViewProjection = this._cubeProgram.uniform('viewProjection');
            this._uModel = this._cubeProgram.uniform('model');
        }

        if (this._cube === undefined) {
            this._cube = new Cube(this.context, 'cube');
        }

        if (!this._cube.initialized) {
            this._cube.initialize(this._aCubeVertex);
        }

        if (this._cubeMatrix1 === undefined) {
            const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.3, 0.3, 0.3));
            const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(2.0, -0.5, 1.0));
            this._cubeMatrix1 = mat4.multiply(mat4.create(), translate, scale);
        }

        if (this._cubeMatrix2 === undefined) {
            const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));
            const translate = mat4.fromTranslation(mat4.create(), vec3.fromValues(-3.0, 0.5, -2.0));
            this._cubeMatrix2 = mat4.multiply(mat4.create(), translate, scale);
        }
    }


    protected onUpdate(): void {

        if (this._extensions === false && this.context.isWebGL1) {
            assert(this.context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this.context.standardDerivatives;
            this._extensions = true;
        }

        if (this._camera === undefined) {
            this._camera = new Camera();
            this._camera.center = vec3.fromValues(0.0, 0.0, 1.0);
            this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
            this._camera.eye = vec3.fromValues(0.0, 0.0, 0.0);
            this._camera.near = 0.1;
            this._camera.far = 15.0;
            this._camera.fovy = 100.0;
        }

        if (this._defaultFBO === undefined) {
            this._defaultFBO = new DefaultFramebuffer(this.context, 'DefaultFBO');
            this._defaultFBO.initialize();
        }


        this.updateSky();
        this.updateCube();


        if (this._altered.clearColor) {
            this._defaultFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        // update angle
        const speed = 1.0;
        if (this._rotate) {
            this._angle = (this._angle + speed) % 360;
        }
        const radians = this._angle * Math.PI / 180.0;
        this._camera.center = vec3.fromValues(Math.sin(radians), 0.0, Math.cos(radians));

        this._defaultFBO.bind();
        this._defaultFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        // render sky
        gl.disable(gl.CULL_FACE);
        this._skyProgram.bind();
        gl.uniformMatrix4fv(this._uTransform, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform3fv(this._uEye, this._camera.eye);
        this._skyTexture.bind(0);
        gl.uniform1i(this._uBackground, 0);
        this._skyCube.bind();
        this._skyCube.draw();
        this._skyCube.unbind();
        this._skyProgram.unbind();
        gl.enable(gl.CULL_FACE);

        // render two flying cubes
        this._cubeProgram.bind();
        this._cube.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix1);
        this._cube.draw();
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix2);
        this._cube.draw();
        this._cube.unbind();
        this._cubeProgram.unbind();

        this._defaultFBO.unbind();
    }

    protected onSwap(): void {
        this.invalidate();
    }

    protected onDispose(): void {

        if (this._skyProgram && this._skyProgram.initialized) {
            this._skyProgram.uninitialize();
        }

        if (this._cube && this._cube.initialized) {
            this._cube.uninitialize();
        }

        if (this._defaultFBO.initialized) {
            this._defaultFBO.uninitialize();
        }
    }

}

