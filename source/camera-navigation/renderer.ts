
import { mat4, vec3 } from 'gl-matrix';

import * as gloperate from 'webgl-operate';


import { Cube } from './cube';
import { Skybox } from './skybox';
import { TrackballNavigation } from './trackballnavigation';


export class CameraNavigationRenderer extends gloperate.Renderer {

    protected _extensions = false;

    // FBO and Blit
    protected _defaultFBO: gloperate.DefaultFramebuffer;
    protected _colorRenderTexture: gloperate.Texture2;
    protected _depthRenderbuffer: gloperate.Renderbuffer;
    protected _intermediateFBO: gloperate.Framebuffer;
    protected _blit: gloperate.BlitPass;

    // Camera and navigation
    protected _camera: gloperate.Camera;
    protected _navigation: TrackballNavigation;

    // Flying cubes
    protected _cube: Cube;
    protected _cubeProgram: gloperate.Program;
    protected _uViewProjection: WebGLUniformLocation;
    protected _uModel: WebGLUniformLocation;
    protected _aCubeVertex: GLuint;
    protected _cubeMatrix0: mat4;
    protected _cubeMatrix1: mat4;
    protected _cubeMatrix2: mat4;
    protected _cubeMatrix3: mat4;
    protected _cubeMatrix4: mat4;

    // SkyBox
    protected _cubeMap: gloperate.TextureCube;
    protected _skyBox: Skybox;
    protected _cubeMapChanged: boolean;

    protected onUpdate(): boolean {
        // Resize
        if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
            this._camera.viewport = [this._frameSize[0], this._frameSize[1]];
        }
        if (this._altered.canvasSize) {
            this._camera.aspect = this._canvasSize[0] / this._canvasSize[1];
        }

        // Update clear color
        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        // Update camera navigation (process events)
        this._navigation.update();

        // Reset state
        const altered = this._altered.any || this._camera.altered || this._cubeMapChanged;
        this._altered.reset();
        this._camera.altered = false;
        this._cubeMapChanged = false;

        // If anything has changed, render a new frame
        return altered;
    }

    protected onPrepare(): void {
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        // Bind FBO
        this._intermediateFBO.bind();
        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, false, false);

        // Set viewport
        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        // Prepare rendering cubes
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        this._cube.bind();
        this._cubeProgram.bind();
        gl.uniformMatrix4fv(this._uViewProjection, gl.GL_FALSE, this._camera.viewProjection);

        // Render cubes
        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix0);
        this._cube.draw();

        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix1);
        this._cube.draw();

        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix2);
        this._cube.draw();

        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix3);
        this._cube.draw();

        gl.uniformMatrix4fv(this._uModel, gl.GL_FALSE, this._cubeMatrix4);
        this._cube.draw();

        // Done rendering cubes
        this._cubeProgram.unbind();
        this._cube.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);

        // Render skybox
        this._skyBox.frame();

        // Unbind FBO
        this._intermediateFBO.unbind();
    }

    protected onSwap(): void {
        // Blit into framebuffer
        this._blit.frame();
        this.invalidate();
    }

    protected loadImages(): void {
        const gl = this.context.gl;

        this._cubeMap = new gloperate.TextureCube(this.context);
        const internalFormatAndType = gloperate.Wizard.queryInternalTextureFormat(this.context, gl.RGB, 'byte');
        this._cubeMap.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);
        this._cubeMapChanged = false;

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
                this._cubeMapChanged = true;
                this.invalidate();
            }
        };

        px.addEventListener('load', callback);
        nx.addEventListener('load', callback);
        py.addEventListener('load', callback);
        ny.addEventListener('load', callback);
        pz.addEventListener('load', callback);
        nz.addEventListener('load', callback);
    }

    initialize(context: gloperate.Context, callback: gloperate.Invalidate,
        mouseEventProvider: gloperate.MouseEventProvider,
        // keyEventProvider: gloperate.KeyEventProvider,
        // touchEventProvider: gloperate.TouchEventProvider
    ): boolean {
        if (!super.initialize(context, callback, mouseEventProvider)) {
            return false;
        }

        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        // Load images
        this.loadImages();

        // Initialize program
        const vert = new gloperate.Shader(this.context, gl.VERTEX_SHADER, 'cube.vert');
        vert.initialize(require('./cube.vert'));
        const frag = new gloperate.Shader(this.context, gl.FRAGMENT_SHADER, 'cube.frag');
        frag.initialize(require('./cube.frag'));
        this._cubeProgram = new gloperate.Program(this.context);
        this._cubeProgram.initialize([vert, frag]);
        this._uViewProjection = this._cubeProgram.uniform('u_viewProjection');
        this._uModel = this._cubeProgram.uniform('u_model');

        // Initialize cube geometry
        this._cube = new Cube(this.context, 'cube');
        this._cube.initialize(this._aCubeVertex);
        this._aCubeVertex = this._cubeProgram.attribute('a_vertex', 0);

        // Initialize transformation matrices for cubes
        const scaleSmall = mat4.fromScaling(mat4.create(), vec3.fromValues(0.2, 0.2, 0.2));
        const scaleLarge = mat4.fromScaling(mat4.create(), vec3.fromValues(0.4, 0.4, 0.4));

        const translate0 = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 0.0));
        this._cubeMatrix0 = mat4.multiply(mat4.create(), translate0, scaleLarge);

        const translate1 = mat4.fromTranslation(mat4.create(), vec3.fromValues(-1.0, 0.0, 0.0));
        this._cubeMatrix1 = mat4.multiply(mat4.create(), translate1, scaleSmall);

        const translate2 = mat4.fromTranslation(mat4.create(), vec3.fromValues(1.0, 0.0, 0.0));
        this._cubeMatrix2 = mat4.multiply(mat4.create(), translate2, scaleSmall);

        const translate3 = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, -1.0));
        this._cubeMatrix3 = mat4.multiply(mat4.create(), translate3, scaleSmall);

        const translate4 = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.0, 0.0, 1.0));
        this._cubeMatrix4 = mat4.multiply(mat4.create(), translate4, scaleSmall);

        // Initialize camera
        this._camera = new gloperate.Camera();
        this._camera.center = vec3.fromValues(0.0, 0.0, 0.0);
        this._camera.up = vec3.fromValues(0.0, 1.0, 0.0);
        this._camera.eye = vec3.fromValues(0.0, 0.0, 2.0);
        this._camera.near = 0.1;
        this._camera.far = 8.0;

        // Initialize navigation
        this._navigation = new TrackballNavigation(callback, mouseEventProvider);
        this._navigation.initialize(this._camera);

        // Initialize FBO & BlitPass
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

        // Initialize skyBox
        this._skyBox = new Skybox();
        this._skyBox.initialize(this.context, this._camera, this._cubeMap);

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
    }

}

