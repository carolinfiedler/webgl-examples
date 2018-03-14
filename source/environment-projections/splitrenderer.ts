
import { mat4, vec3 } from 'gl-matrix';

import * as gloperate from 'webgl-operate';

import { Cubemap } from './cubemap';
import { Polarmap } from './polarmap';

import { Map } from './map';

enum ProjectionType {
    Cube = 0,
    Equirectangular,
    Polar,
    Sphere,
}

enum Cubedirection {
    px = 0,
    nx,
    py,
    ny,
    pz,
    nz,
}

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

    // sprites for axis and projection type labeling
    protected _sprite: gloperate.NdcFillingRectangle;
    protected _spriteProgram: gloperate.Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _uSpriteTexture: WebGLUniformLocation;
    protected _aSpriteVertex: GLuint;

    // sprites for axis labeling
    protected _spriteAxisTextures: gloperate.Texture2[];
    protected _spriteAxisMatrixPx: mat4;
    protected _spriteAxisMatrixNx: mat4;
    protected _spriteAxisMatrixPy: mat4;
    protected _spriteAxisMatrixNy: mat4;
    protected _spriteAxisMatrixPz: mat4;
    protected _spriteAxisMatrixNz: mat4;

    // sprites for projection type labeling
    protected _spriteLabelTextures: gloperate.Texture2[];
    protected _spriteLabelMatrixLeft: mat4;
    protected _spriteLabelMatrixMiddleLeft: mat4;
    protected _spriteLabelMatrixMiddleRight: mat4;
    protected _spriteLabelMatrixRight: mat4;

    // projections
    protected _cubemap: Cubemap;
    protected _equirectangularmap: Map;
    protected _spheremap: Map;
    protected _polarmap: Polarmap;

    protected onUpdate(): void {

        // update camera angle
        if (this._rotate) {
            const speed = 0.02;
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

            const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.3 / this._camera.aspect, 0.05, 1.0));
            this._spriteLabelMatrixLeft = mat4.multiply(mat4.create(),
                mat4.fromTranslation(mat4.create(), vec3.fromValues(-0.8, -0.9, 0.0)), scale);

            this._spriteLabelMatrixMiddleLeft = mat4.multiply(mat4.create(),
                mat4.fromTranslation(mat4.create(), vec3.fromValues(-0.3, -0.9, 0.0)), scale);

            this._spriteLabelMatrixMiddleRight = mat4.multiply(mat4.create(),
                mat4.fromTranslation(mat4.create(), vec3.fromValues(0.2, -0.9, 0.0)), scale);

            this._spriteLabelMatrixRight = mat4.multiply(mat4.create(),
                mat4.fromTranslation(mat4.create(), vec3.fromValues(0.7, -0.9, 0.0)), scale);
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

        // render sprites for axis labeling
        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._spriteProgram.bind();

        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);
        gl.uniform1i(this._uSpriteTexture, 0);

        this._sprite.bind();

        this._spriteAxisTextures[Cubedirection.px].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteAxisMatrixPx);
        this._sprite.draw();

        this._spriteAxisTextures[Cubedirection.nx].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteAxisMatrixNx);
        this._sprite.draw();

        this._spriteAxisTextures[Cubedirection.py].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteAxisMatrixPy);
        this._sprite.draw();

        this._spriteAxisTextures[Cubedirection.ny].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteAxisMatrixNy);
        this._sprite.draw();

        this._spriteAxisTextures[Cubedirection.pz].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteAxisMatrixPz);
        this._sprite.draw();

        this._spriteAxisTextures[Cubedirection.nz].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteAxisMatrixNz);
        this._sprite.draw();

        // render projection type labels
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, mat4.create());

        this._spriteLabelTextures[0].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteLabelMatrixLeft);
        this._sprite.draw();

        this._spriteLabelTextures[1].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteLabelMatrixMiddleLeft);
        this._sprite.draw();

        this._spriteLabelTextures[2].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteLabelMatrixMiddleRight);
        this._sprite.draw();

        this._spriteLabelTextures[3].bind(gl.TEXTURE0);
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._spriteLabelMatrixRight);
        this._sprite.draw();

        this._spriteAxisTextures[0].unbind();
        this._sprite.unbind();

        this._spriteProgram.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);

        // render split
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(this._frameSize[0] * ProjectionType.Cube / 4 + 1, 0,
            this._frameSize[0] / 4 - 1, this._frameSize[1]);
        this._cubemap.frame();

        gl.scissor(this._frameSize[0] * ProjectionType.Equirectangular / 4 + 1, 0,
            this._frameSize[0] / 4 - 1, this._frameSize[1]);
        this._equirectangularmap.frame();

        gl.scissor(this._frameSize[0] * ProjectionType.Polar / 4 + 1, 0,
            this._frameSize[0] / 4 - 1, this._frameSize[1]);
        this._polarmap.frame();

        gl.scissor(this._frameSize[0] * ProjectionType.Sphere / 4 + 1, 0,
            this._frameSize[0] / 4 - 1, this._frameSize[1]);
        this._spheremap.frame();

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

        const axisImages: HTMLImageElement[] =
            [new Image(), new Image(), new Image(), new Image(), new Image(), new Image()];

        axisImages[Cubedirection.px].src = 'data/axis_px.png';
        axisImages[Cubedirection.nx].src = 'data/axis_nx.png';
        axisImages[Cubedirection.py].src = 'data/axis_py.png';
        axisImages[Cubedirection.ny].src = 'data/axis_ny.png';
        axisImages[Cubedirection.pz].src = 'data/axis_pz.png';
        axisImages[Cubedirection.nz].src = 'data/axis_nz.png';

        const callbackAxisSprites = () => {
            for (const i in this._spriteAxisTextures) {
                this._spriteAxisTextures[i].resize(axisImages[i].width, axisImages[i].height);
                this._spriteAxisTextures[i].data(axisImages[i]);
            }
        };

        this._spriteAxisTextures = new Array(6);
        for (let i = 0; i < 6; ++i) {
            this._spriteAxisTextures[i] = new gloperate.Texture2(this.context);
            this._spriteAxisTextures[i].initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
            axisImages[i].addEventListener('load', callbackAxisSprites);
        }

        const labelImages: HTMLImageElement[] =
            [new Image(), new Image(), new Image(), new Image()];

        labelImages[ProjectionType.Cube].src = 'data/label_cube.png';
        labelImages[ProjectionType.Equirectangular].src = 'data/label_equirectangular.png';
        labelImages[ProjectionType.Polar].src = 'data/label_polar.png';
        labelImages[ProjectionType.Sphere].src = 'data/label_sphere.png';

        const callbackLabelSprites = () => {
            for (const i in this._spriteLabelTextures) {
                this._spriteLabelTextures[i].resize(labelImages[i].width, labelImages[i].height);
                this._spriteLabelTextures[i].data(labelImages[i]);
            }
        };

        this._spriteLabelTextures = new Array(4);
        for (let i = 0; i < 4; ++i) {
            this._spriteLabelTextures[i] = new gloperate.Texture2(this.context);
            this._spriteLabelTextures[i].initialize(1, 1, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE);
            labelImages[i].addEventListener('load', callbackLabelSprites);
        }
    }

    initialize(context: gloperate.Context, callback: gloperate.Invalidate): boolean {
        if (!super.initialize(context, callback)) {
            return false;
        }

        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        this.loadImages();

        // init sprite program
        const vert = new gloperate.Shader(this.context, gl.VERTEX_SHADER, 'sprite.vert');
        vert.initialize(require('./sprite.vert'));
        const frag = new gloperate.Shader(this.context, gl.FRAGMENT_SHADER, 'sprite.frag');
        frag.initialize(require('./sprite.frag'));

        this._spriteProgram = new gloperate.Program(this.context);
        this._spriteProgram.initialize([vert, frag]);

        this._aSpriteVertex = this._spriteProgram.attribute('a_vertex', 0);
        this._uViewProjection = this._spriteProgram.uniform('u_viewProjection');
        this._uModel = this._spriteProgram.uniform('u_model');
        this._uSpriteTexture = this._spriteProgram.uniform('u_spriteTexture');

        // init sprites for axis and projection type labeling
        this._sprite = new gloperate.NdcFillingRectangle(this.context, 'sprite');
        this._sprite.initialize(this._aSpriteVertex);
        const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(0.1, 0.05, 1.0));

        // matrices for axis labeling
        const rotatePx = mat4.fromRotation(mat4.create(), 1.5 * Math.PI, vec3.fromValues(0, 1, 0));
        const translatePx = mat4.fromTranslation(mat4.create(), vec3.fromValues(1.0, 0.0, 0.0));
        this._spriteAxisMatrixPx = mat4.multiply(mat4.create(), rotatePx, scale);
        this._spriteAxisMatrixPx = mat4.multiply(mat4.create(), translatePx, this._spriteAxisMatrixPx);

        const rotateNx = mat4.fromRotation(mat4.create(), 0.5 * Math.PI, vec3.fromValues(0, 1, 0));
        const translateNx = mat4.fromTranslation(mat4.create(), vec3.fromValues(-1.0, 0.0, 0.0));
        this._spriteAxisMatrixNx = mat4.multiply(mat4.create(), rotateNx, scale);
        this._spriteAxisMatrixNx = mat4.multiply(mat4.create(), translateNx, this._spriteAxisMatrixNx);

        const rotatePy = mat4.fromRotation(mat4.create(), 0.5 * Math.PI, vec3.fromValues(1, 0, 0));
        const translatePy = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 1.0, 0.0));
        this._spriteAxisMatrixPy = mat4.multiply(mat4.create(), rotatePy, scale);
        this._spriteAxisMatrixPy = mat4.multiply(mat4.create(), translatePy, this._spriteAxisMatrixPy);

        const rotateNy = mat4.fromRotation(mat4.create(), 1.5 * Math.PI, vec3.fromValues(1, 0, 0));
        const translateNy = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, -1.0, 0.0));
        this._spriteAxisMatrixNy = mat4.multiply(mat4.create(), rotateNy, scale);
        this._spriteAxisMatrixNy = mat4.multiply(mat4.create(), translateNy, this._spriteAxisMatrixNy);

        const rotatePz = mat4.fromRotation(mat4.create(), Math.PI, vec3.fromValues(0, 1, 0));
        const translatePz = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 1.0));
        this._spriteAxisMatrixPz = mat4.multiply(mat4.create(), rotatePz, scale);
        this._spriteAxisMatrixPz = mat4.multiply(mat4.create(), translatePz, this._spriteAxisMatrixPz);

        const rotateNz = mat4.fromRotation(mat4.create(), 0, vec3.fromValues(0, 1, 0));
        const translateNz = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, -1.0));
        this._spriteAxisMatrixNz = mat4.multiply(mat4.create(), rotateNz, scale);
        this._spriteAxisMatrixNz = mat4.multiply(mat4.create(), translateNz, this._spriteAxisMatrixNz);

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

        // init projection mappings
        this._cubemap = new Cubemap();
        this._cubemap.initialize(this.context, this._camera);

        this._equirectangularmap = new Map('equirectangular');
        this._equirectangularmap.initialize(this.context, this._camera);

        this._spheremap = new Map('sphere');
        this._spheremap.initialize(this.context, this._camera);

        this._polarmap = new Polarmap();
        this._polarmap.initialize(this.context, this._camera);

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

        for (const tex of this._spriteAxisTextures) {
            tex.uninitialize();
        }

        this._cubemap.uninitialize();
        this._equirectangularmap.uninitialize();
        this._polarmap.uninitialize();
        this._spheremap.uninitialize();
    }

}

