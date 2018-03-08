
import { assert } from '../auxiliaries';

import { mat4, vec3 } from 'gl-matrix';

import { Cube } from './cube';

import {
    AbstractRenderer, AntiAliasingKernel, BlitPass, Camera, DefaultFramebuffer, Framebuffer,
    NdcFillingTriangle, Program, Renderbuffer, Shader, Texture2,
} from 'webgl-operate';


export class SplitRenderer extends AbstractRenderer {

    protected _extensions = false;

    protected _camera: Camera;

    protected _blit: BlitPass;

    protected _defaultFBO: DefaultFramebuffer;
    protected _colorRenderTexture: Texture2;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;

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


    leftRenderer: AbstractRenderer;
    rightRenderer: AbstractRenderer;


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
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

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
        }

        if (this._intermediateFBO === undefined) {
            this._defaultFBO = new DefaultFramebuffer(this.context, 'DefaultFBO');
            this._defaultFBO.initialize();

            this._colorRenderTexture = new Texture2(this.context, 'ColorRenderTexture');
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

            this._depthRenderbuffer = new Renderbuffer(this.context, 'DepthRenderbuffer');
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);

            this._intermediateFBO = new Framebuffer(this.context, 'IntermediateFBO');
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
        }

        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
        }

        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        if (this._blit === undefined) {
            this._blit = new BlitPass(this.context);
        }

        if (!this._blit.initialized) {
            this._blit.initialize();
            this._blit.framebuffer = this._intermediateFBO;
            this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
            this._blit.drawBuffer = gl.BACK;
            this._blit.target = this._defaultFBO;
        }

        if (this.leftRenderer) {
            this.leftRenderer.frameSize = [this._frameSize[0] / 2, this._frameSize[1]];
            this.leftRenderer.clearColor = this._clearColor;
            this.leftRenderer.framePrecision = this._framePrecision;
            this.leftRenderer.update(this._multiFrameNumber);
        }

        if (this.rightRenderer) {
            this.rightRenderer.frameSize = [this._frameSize[0] / 2, this._frameSize[1]];
            this.rightRenderer.clearColor = this._clearColor;
            this.rightRenderer.framePrecision = this._framePrecision;
            this.rightRenderer.update(this._multiFrameNumber);
        }

        this.updateCube();

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        this._intermediateFBO.bind();
        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);
        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        // update angle
        const speed = 1.0;
        if (this._rotate) {
            this._angle = (this._angle + speed) % 360;
        }
        const radians = this._angle * Math.PI / 180.0;
        this._camera.center = vec3.fromValues(Math.sin(radians), 0.0, Math.cos(radians));

        // render two flying cubes
        gl.enable(gl.DEPTH_TEST);
        this._cubeProgram.bind();
        this._cube.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix1);
        this._cube.draw();
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix2);
        this._cube.draw();
        this._cube.unbind();
        this._cubeProgram.unbind();

        gl.viewport(0, 0, this._frameSize[0] / 2, this._frameSize[1]);
        this.leftRenderer.frame(frameNumber);

        gl.viewport(this._frameSize[0] / 2, 0, this._frameSize[0], this._frameSize[1]);
        this.rightRenderer.frame(frameNumber);

        this._intermediateFBO.unbind();
    }

    protected onSwap(): void {
        this.invalidate();
        this.leftRenderer.swap();
        this.rightRenderer.swap();
        this._blit.frame();
    }

    protected onDispose(): void {

        if (this._intermediateFBO.initialized) {
            this._intermediateFBO.uninitialize();
            this._defaultFBO.uninitialize();
            this._colorRenderTexture.uninitialize();
            this._depthRenderbuffer.uninitialize();
        }

        if (this._cube && this._cube.initialized) {
            this._cube.uninitialize();
        }

        if (this._blit && this._blit.initialized) {
            this._blit.uninitialize();
        }
    }

}

