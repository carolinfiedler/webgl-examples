
/**
 * This is probably not the best solution but it declares an gloperate object of type an to soothe the typescript
 * compiler. Then the actual declarations are imported into a temporary namespace and then exported as gloperate.
 */
declare var gloperate: any;
import * as gloperate_peer from 'webgl-operate';
export import gloperate = gloperate_peer;


import { assert } from '../auxiliaries';


export class SkyTriangle extends gloperate.AbstractRenderer {

    protected _extensions = false;
    protected _program: gloperate.Program;

    protected _ndcOffsetKernel: gloperate.AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _ndcTriangle: gloperate.NdcFillingTriangle;
    protected _aVertex: GLuint;

    protected _blit: gloperate.BlitPass;

    protected _defaultFBO: gloperate.DefaultFramebuffer;
    protected _colorRenderTexture: gloperate.Texture2;
    protected _depthRenderbuffer: gloperate.Renderbuffer;
    protected _intermediateFBO: gloperate.Framebuffer;


    protected onUpdate(): void {
        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        if (this._extensions === false && this.context.isWebGL1) {
            assert(this.context.supportsStandardDerivatives, `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this.context.standardDerivatives;
            this._extensions = true;
        }


        if (this._program === undefined) {
            this._program = new gloperate.Program(this.context);
        }

        if (!this._program.initialized) {

            const vert = new gloperate.Shader(this.context, gl.VERTEX_SHADER, 'skytriangle.vert');
            vert.initialize(require('./skytriangle.vert'));
            const frag = new gloperate.Shader(this.context, gl.FRAGMENT_SHADER, 'skytriangle.frag');
            frag.initialize(require('./skytriangle.frag'));

            this._program.initialize([vert, frag]);
            this._aVertex = this._program.attribute('a_vertex', 0);

            this._uNdcOffset = this._program.uniform('u_ndcOffset');
        }


        if (this._ndcTriangle === undefined) {
            this._ndcTriangle = new gloperate.NdcFillingTriangle(this.context);
        }

        if (!this._ndcTriangle.initialized) {
            this._ndcTriangle.initialize(this._aVertex);
        }

        if (this._ndcOffsetKernel === undefined) {
            this._ndcOffsetKernel = new gloperate.AntiAliasingKernel(this._multiFrameNumber);
        }

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel.width = this._multiFrameNumber;
        }


        if (this._intermediateFBO === undefined) {
            this._defaultFBO = new gloperate.DefaultFramebuffer(this.context, 'DefaultFBO');
            this._defaultFBO.initialize();

            this._colorRenderTexture = new gloperate.Texture2(this.context, 'ColorRenderTexture');
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

            this._depthRenderbuffer = new gloperate.Renderbuffer(this.context, 'DepthRenderbuffer');
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);

            this._intermediateFBO = new gloperate.Framebuffer(this.context, 'IntermediateFBO');
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
            this._blit = new gloperate.BlitPass(this.context);
        }
        if (!this._blit.initialized) {
            this._blit.initialize(this._ndcTriangle);
            this._blit.framebuffer = this._intermediateFBO;
            this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
            this._blit.drawBuffer = gl.BACK;
            this._blit.target = this._defaultFBO;
        }

        this._altered.reset();
    }

    protected onFrame(frameNumber: number): void {
        const gl = this.context.gl;

        gl.viewport(0, 0, this._frameSize[0], this._frameSize[1]);

        this._program.bind();

        const ndcOffset = this._ndcOffsetKernel.get(frameNumber);
        ndcOffset[0] = 2.0 * ndcOffset[0] / this._frameSize[0];
        ndcOffset[1] = 2.0 * ndcOffset[1] / this._frameSize[1];
        gl.uniform2fv(this._uNdcOffset, ndcOffset);

        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._intermediateFBO.unbind();
    }

    protected onSwap(): void {
        this._blit.frame();
    }

    protected onDispose(): void {

        if (this._program && this._program.initialized) {
            this._uNdcOffset = -1;
            this._program.uninitialize();
        }

        if (this._ndcTriangle && this._ndcTriangle.initialized) {
            this._ndcTriangle.uninitialize();
        }

        if (this._intermediateFBO.initialized) {
            this._intermediateFBO.uninitialize();
            this._defaultFBO.uninitialize();
            this._colorRenderTexture.uninitialize();
            this._depthRenderbuffer.uninitialize();
        }

        if (this._blit && this._blit.initialized) {
            this._blit.uninitialize();
        }
    }

}

