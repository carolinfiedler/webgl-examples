
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
    protected _sprite: gloperate.NdcFillingRectangle;
    protected _spriteProgram: gloperate.Program;
    protected _spriteTextures: gloperate.Texture2[];
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uSpriteTexture: WebGLUniformLocation;
    protected _aSpriteVertex: GLuint;
    protected _spriteMatrixPx: mat4;
    protected _spriteMatrixNx: mat4;
    protected _spriteMatrixPy: mat4;
    protected _spriteMatrixNy: mat4;
    protected _spriteMatrixPz: mat4;
    protected _spriteMatrixNz: mat4;

    // skyBox and skyTriangle use the same cubeMap
    protected _cubeMap: gloperate.TextureCube;
    protected _skyBox: Skybox;
    protected _skyTriangle: SkyTriangle;


    protected onUpdate(): void {

        // update camera angle
        if (this._rotate) {
            const speed = 0.01;
            const angle = (window.performance.now() * speed) % 360;
            const radians = angle * Math.PI / 180.0;
            this._camera.center = vec3.fromValues(Math.sin(radians), 0.0, Math.cos(radians));
        }

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

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._spriteProgram.bind();

        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform1i(this._uSpriteTexture, 0);

        this._sprite.bind();

        this._spriteTextures[0].bind(0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteMatrixPx);
        this._sprite.draw();

        this._spriteTextures[1].bind(0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteMatrixNx);
        this._sprite.draw();

        this._spriteTextures[2].bind(0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteMatrixPy);
        this._sprite.draw();

        this._spriteTextures[3].bind(0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteMatrixNy);
        this._sprite.draw();

        this._spriteTextures[4].bind(0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteMatrixPz);
        this._sprite.draw();

        this._spriteTextures[5].bind(0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteMatrixNz);
        this._sprite.draw();

        this._spriteTextures[0].unbind();
        this._sprite.unbind();

        this._spriteProgram.unbind();

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

        const images: HTMLImageElement[] =
            [new Image(), new Image(), new Image(), new Image(), new Image(), new Image()];

        images[0].src = 'data/axis_px.png';
        images[1].src = 'data/axis_nx.png';
        images[2].src = 'data/axis_py.png';
        images[3].src = 'data/axis_ny.png';
        images[4].src = 'data/axis_pz.png';
        images[5].src = 'data/axis_nz.png';

        const callbackSprites = () => {
            for (const i in this._spriteTextures) {
                this._spriteTextures[i].resize(images[i].width, images[i].height);
                this._spriteTextures[i].data(images[i]);
            }
        };

        this._spriteTextures = new Array(6);
        for (let i = 0; i < 6; ++i) {
            this._spriteTextures[i] = new gloperate.Texture2(this.context);
            this._spriteTextures[i].initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
            images[i].addEventListener('load', callbackSprites);
        }
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

        this._spriteProgram = new gloperate.Program(this.context);
        this._spriteProgram.initialize([vert, frag]);

        this._aSpriteVertex = this._spriteProgram.attribute('a_vertex', 0);
        this._uViewProjection = this._spriteProgram.uniform('u_viewProjection');
        this._uModel = this._spriteProgram.uniform('u_model');
        this._uSpriteTexture = this._spriteProgram.uniform('u_spriteTexture');

        // init flying cubes
        this._sprite = new gloperate.NdcFillingRectangle(this.context, 'sprite');
        this._sprite.initialize(this._aSpriteVertex);
        const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.1, 0.05, 1.0));

        const rotatePx = mat4.fromRotation(mat4.create(), 1.5 * Math.PI, vec3.fromValues(0, 1, 0));
        const translatePx = mat4.fromTranslation(mat4.create(), vec3.fromValues(1.0, 0.0, 0.0));
        this._spriteMatrixPx = mat4.multiply(mat4.create(), rotatePx, scale);
        this._spriteMatrixPx = mat4.multiply(mat4.create(), translatePx, this._spriteMatrixPx);

        const rotateNx = mat4.fromRotation(mat4.create(), 0.5 * Math.PI, vec3.fromValues(0, 1, 0));
        const translateNx = mat4.fromTranslation(mat4.create(), vec3.fromValues(-1.0, 0.0, 0.0));
        this._spriteMatrixNx = mat4.multiply(mat4.create(), rotateNx, scale);
        this._spriteMatrixNx = mat4.multiply(mat4.create(), translateNx, this._spriteMatrixNx);

        const rotatePy = mat4.fromRotation(mat4.create(), 0.5 * Math.PI, vec3.fromValues(1, 0, 0));
        const translatePy = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 1.0, 0.0));
        this._spriteMatrixPy = mat4.multiply(mat4.create(), rotatePy, scale);
        this._spriteMatrixPy = mat4.multiply(mat4.create(), translatePy, this._spriteMatrixPy);

        const rotateNy = mat4.fromRotation(mat4.create(), 1.5 * Math.PI, vec3.fromValues(1, 0, 0));
        const translateNy = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, -1.0, 0.0));
        this._spriteMatrixNy = mat4.multiply(mat4.create(), rotateNy, scale);
        this._spriteMatrixNy = mat4.multiply(mat4.create(), translateNy, this._spriteMatrixNy);

        const rotatePz = mat4.fromRotation(mat4.create(), Math.PI, vec3.fromValues(0, 1, 0));
        const translatePz = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 1.0));
        this._spriteMatrixPz = mat4.multiply(mat4.create(), rotatePz, scale);
        this._spriteMatrixPz = mat4.multiply(mat4.create(), translatePz, this._spriteMatrixPz);

        const rotateNz = mat4.fromRotation(mat4.create(), 0, vec3.fromValues(0, 1, 0));
        const translateNz = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, -1.0));
        this._spriteMatrixNz = mat4.multiply(mat4.create(), rotateNz, scale);
        this._spriteMatrixNz = mat4.multiply(mat4.create(), translateNz, this._spriteMatrixNz);

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

        this._sprite.uninitialize();

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();
        this._blit.uninitialize();

        for (const tex of this._spriteTextures) {
            tex.uninitialize();
        }

        this._skyBox.uninitialize();
        this._skyTriangle.uninitialize();
    }

}

