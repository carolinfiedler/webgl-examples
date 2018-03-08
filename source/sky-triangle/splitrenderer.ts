
import { assert } from '../auxiliaries';

import { mat4, vec3 } from 'gl-matrix';

import {
    AbstractRenderer, AntiAliasingKernel, BlitPass, Camera, Context, DefaultFramebuffer, Framebuffer,
    NdcFillingTriangle, Program, Renderbuffer, Shader, Texture2, TextureCube,
} from 'webgl-operate';

import { Cube } from './cube';
import { Skybox } from './skybox';
import { SkyTriangle } from './skytriangle';


// how to import this from webgl-operate/renderer ?
interface Invalidate { (): void; }


export class SplitRenderer extends AbstractRenderer {

    protected _extensions = false;

    // FBO and Blit
    protected _defaultFBO: DefaultFramebuffer;
    protected _colorRenderTexture: Texture2;
    protected _depthRenderbuffer: Renderbuffer;
    protected _intermediateFBO: Framebuffer;
    protected _blit: BlitPass;

    // rotation
    protected _camera: Camera;
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

    // skyBox and skyTriangle use the same cubeMap
    protected _cubeMap: TextureCube;
    protected _skyBox: Skybox;
    protected _skyTriangle: SkyTriangle;


    protected onUpdate(): void {

        // update camera angle
        const speed = 1.0;
        if (this._rotate) {
            this._angle = (this._angle + speed) % 360;
        }
        const radians = this._angle * Math.PI / 180.0;
        this._camera.center = vec3.fromValues(Math.sin(radians), 0.0, Math.cos(radians));

        // resize
        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
        }

        // update clear color
        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        // bind FBO
        this._intermediateFBO.bind();
        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        // render two flying cubes
        this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.DEPTH_TEST);
        this._cubeProgram.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix1);
        this._cube.bind();
        this._cube.draw();
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix2);
        this._cube.draw();
        this._cube.unbind();
        this._cubeProgram.unbind();

        // render split
        this._camera.viewport = [this._frameSize[0] / 2, this._frameSize[1]];

        gl.viewport(0, 0, this._frameSize[0] / 2, this._frameSize[1]);
        this._skyBox.render(this._camera, this._cubeMap);

        gl.viewport(this._frameSize[0] / 2, 0, this._frameSize[0], this._frameSize[1]);
        this._skyTriangle.render(this._camera, this._cubeMap);

        // unbind FBO
        this._intermediateFBO.unbind();
    }

    protected onSwap(): void {
        this._blit.frame();
        this.invalidate();
    }

    protected loadImages(): void {
        const gl = this.context.gl;

        this._cubeMap = new TextureCube(this.context);
        this._cubeMap.initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);

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

        let imagesLoaded = 0;
        const callback = () => {
            imagesLoaded++;
            if (imagesLoaded === 6) {
                this._cubeMap.resize(px.width, px.height);
                this._cubeMap.data([px, nx, py, ny, pz, nz]);
            }
        };

        px.addEventListener('load', callback);
        nx.addEventListener('load', callback);
        py.addEventListener('load', callback);
        ny.addEventListener('load', callback);
        pz.addEventListener('load', callback);
        nz.addEventListener('load', callback);
    }

    initialize(context: Context, callback: Invalidate): boolean {
        if (!super.initialize(context, callback)) {
            return false;
        }

        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        this.loadImages();

        // OpenGL stuff ?
        if (this._extensions === false && this.context.isWebGL1) {
            assert(this.context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this.context.standardDerivatives;
            this._extensions = true;
        }

        // init program
        this._cubeProgram = new Program(this.context);
        const vert = new Shader(this.context, gl.VERTEX_SHADER, 'cube.vert');
        vert.initialize(require('./cube.vert'));
        const frag = new Shader(this.context, gl.FRAGMENT_SHADER, 'cube.frag');
        frag.initialize(require('./cube.frag'));
        this._cubeProgram.initialize([vert, frag]);
        this._aCubeVertex = this._cubeProgram.attribute('in_vertex', 0);
        this._uViewProjection = this._cubeProgram.uniform('viewProjection');
        this._uModel = this._cubeProgram.uniform('model');

        // init flying cubes
        this._cube = new Cube(this.context, 'cube');
        this._cube.initialize(this._aCubeVertex);
        const scale1 = mat4.fromScaling(mat4.create(), vec3.fromValues(0.3, 0.3, 0.3));
        const translate1 = mat4.fromTranslation(mat4.create(), vec3.fromValues(2.0, -0.5, 1.0));
        this._cubeMatrix1 = mat4.multiply(mat4.create(), translate1, scale1);
        const scale2 = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));
        const translate2 = mat4.fromTranslation(mat4.create(), vec3.fromValues(-3.0, 0.5, -2.0));
        this._cubeMatrix2 = mat4.multiply(mat4.create(), translate2, scale2);

        // init camera
        this._camera = new Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 1.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        // init FBO & BlitPass
        this._defaultFBO = new DefaultFramebuffer(this.context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._colorRenderTexture = new Texture2(this.context, 'ColorRenderTexture');
        this._colorRenderTexture.initialize(480, 270,
            this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        this._depthRenderbuffer = new Renderbuffer(this.context, 'DepthRenderbuffer');
        this._depthRenderbuffer.initialize(480, 270, gl.DEPTH_COMPONENT16);
        this._intermediateFBO = new Framebuffer(this.context, 'IntermediateFBO');
        this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
            , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
        this._blit = new BlitPass(this.context);
        this._blit.initialize();
        this._blit.framebuffer = this._intermediateFBO;
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        // init skyBox
        this._skyBox = new Skybox();
        this._skyBox.initialize(this.context);

        // init skyTriangle
        this._skyTriangle = new SkyTriangle();
        this._skyTriangle.initialize(this.context);

        return true;
    }

    uninitialize(): void {
        super.uninitialize();

        this._cube.uninitialize();

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();
        this._blit.uninitialize();

        this._skyBox.uninitialize();
        this._skyTriangle.uninitialize();
    }

}

