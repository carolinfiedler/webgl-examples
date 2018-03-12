
import { mat4, vec3 } from 'gl-matrix';

import * as gloperate from 'webgl-operate';


import { Cube } from './cube';
import { Skybox } from './skybox';
import { SkyTriangle } from './skytriangle';


export class SplitRenderer extends gloperate.AbstractRenderer {

    protected _extensions = false;

    // FBO and Blit
    protected _defaultFBO: gloperate.DefaultFramebuffer;
    protected _colorRenderTexture: gloperate.Texture2;
    protected _depthRenderbuffer: gloperate.Renderbuffer;
    protected _intermediateFBO: gloperate.Framebuffer;
    protected _blit: gloperate.BlitPass;

    // rotation
    protected _camera: gloperate.Camera;
    protected _rotate = true;

    // flying cubes
    protected _cube: Cube;
    protected _cubeProgram: gloperate.Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _aCubeVertex: GLuint;
    protected _cubeMatrix1: mat4;
    protected _cubeMatrix2: mat4;

    // skyBox and skyTriangle use the same cubeMap
    protected _cubeMap: gloperate.TextureCube;
    protected _skyBox: Skybox;
    protected _skyTriangle: SkyTriangle;


    protected onUpdate(): void {

        // update camera angle
        if (this._rotate) {
            const speed = 0.002;
            const angle = (window.performance.now() * speed) % 360;
            const radians = angle * Math.PI / 180.0;
            this._camera.center = vec3.fromValues(Math.sin(radians), 0.0, Math.cos(radians));
        }

        // resize
        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
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
        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
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

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);

        // render split
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, 0, this._frameSize[0] / 2 - 1, this._frameSize[1]);
        this._skyBox.frame();

        gl.scissor(this._frameSize[0] / 2 + 1, 0, this._frameSize[0] / 2 - 1, this._frameSize[1]);
        this._skyTriangle.frame();
        gl.disable(gl.SCISSOR_TEST);

        // unbind FBO
        this._intermediateFBO.unbind();
    }

    protected onSwap(): void {
        this._blit.frame();
        this.invalidate();
    }

    protected loadImages(): void {
        const gl = this.context.gl;

        this._cubeMap = new gloperate.TextureCube(this.context);
        const internalFormatAndType = gloperate.Wizard.queryInternalTextureFormat(this.context, gl.RGB, 'byte');
        this._cubeMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        const px = new Image();
        const nx = new Image();
        const py = new Image();
        const ny = new Image();
        const pz = new Image();
        const nz = new Image();

        px.src = 'data/skybox.px.png';
        nx.src = 'data/skybox.nx.png';
        py.src = 'data/skybox.py.png';
        ny.src = 'data/skybox.ny.png';
        pz.src = 'data/skybox.pz.png';
        nz.src = 'data/skybox.nz.png';

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

    initialize(context: gloperate.Context, callback: gloperate.Invalidate): boolean {
        if (!super.initialize(context, callback)) {
            return false;
        }

        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        this.loadImages();

        // init program
        const vert = new gloperate.Shader(this.context, gl.VERTEX_SHADER, 'cube.vert');
        vert.initialize(require('./cube.vert'));
        const frag = new gloperate.Shader(this.context, gl.FRAGMENT_SHADER, 'cube.frag');
        frag.initialize(require('./cube.frag'));

        this._cubeProgram = new gloperate.Program(this.context);
        this._cubeProgram.initialize([vert, frag]);

        this._aCubeVertex = this._cubeProgram.attribute('a_vertex', 0);
        this._uViewProjection = this._cubeProgram.uniform('u_viewProjection');
        this._uModel = this._cubeProgram.uniform('u_model');

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
        this._camera = new gloperate.Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 1.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        // init FBO & BlitPass
        this._defaultFBO = new gloperate.DefaultFramebuffer(this.context, 'DefaultFBO');
        this._defaultFBO.initialize();
        this._colorRenderTexture = new gloperate.Texture2(this.context, 'ColorRenderTexture');
        this._colorRenderTexture.initialize(480, 270,
            this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        this._depthRenderbuffer = new gloperate.Renderbuffer(this.context, 'DepthRenderbuffer');
        this._depthRenderbuffer.initialize(480, 270, gl.DEPTH_COMPONENT16);
        this._intermediateFBO = new gloperate.Framebuffer(this.context, 'IntermediateFBO');
        this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
            , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);
        this._blit = new gloperate.BlitPass(this.context);
        this._blit.initialize();
        this._blit.framebuffer = this._intermediateFBO;
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        // init skyBox
        this._skyBox = new Skybox();
        this._skyBox.initialize(this.context, this._camera, this._cubeMap);

        // init skyTriangle
        this._skyTriangle = new SkyTriangle();
        this._skyTriangle.initialize(this.context, this._camera, this._cubeMap);

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

