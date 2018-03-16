
import * as gloperate from 'webgl-operate';


export class TestRenderer extends gloperate.Renderer {

    protected _extensions = false;
    protected _program: gloperate.Program;

    protected _ndcOffsetKernel: gloperate.AntiAliasingKernel;
    protected _uNdcOffset: WebGLUniformLocation;
    protected _uFrameNumber: WebGLUniformLocation;
    protected _ndcTriangle: gloperate.NdcFillingTriangle;

    protected _accumulate: gloperate.AccumulatePass;
    protected _blit: gloperate.BlitPass;

    protected _defaultFBO: gloperate.DefaultFramebuffer;
    protected _colorRenderTexture: gloperate.Texture2;
    protected _depthRenderbuffer: gloperate.Renderbuffer;
    protected _intermediateFBO: gloperate.Framebuffer;

    protected _testNavigation: gloperate.debug.TestNavigation;


    protected onUpdate(): boolean {
        this._testNavigation.update();

        const redraw = this._testNavigation.altered;
        this._testNavigation.reset();

        return redraw;
    }

    protected onPrepare(): void {
        if (!this._altered.any) {
            return;
        }

        const gl = this.context.gl;
        const gl2facade = this.context.gl2facade;

        if (this._altered.multiFrameNumber) {
            this._ndcOffsetKernel.width = this._multiFrameNumber;
        }

        if (!this._intermediateFBO.initialized) {
            this._colorRenderTexture.initialize(this._frameSize[0], this._frameSize[1],
                this.context.isWebGL2 ? gl.RGBA8 : gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
            this._depthRenderbuffer.initialize(this._frameSize[0], this._frameSize[1], gl.DEPTH_COMPONENT16);
            this._intermediateFBO.initialize([[gl2facade.COLOR_ATTACHMENT0, this._colorRenderTexture]
                , [gl.DEPTH_ATTACHMENT, this._depthRenderbuffer]]);

        } else if (this._altered.frameSize) {
            this._intermediateFBO.resize(this._frameSize[0], this._frameSize[1]);
        }

        if (this._altered.clearColor) {
            this._intermediateFBO.clearColor(this._clearColor);
        }

        this._accumulate.update();

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
        gl.uniform1i(this._uFrameNumber, frameNumber);

        this._intermediateFBO.clear(gl.COLOR_BUFFER_BIT, true, false);
        this._ndcTriangle.bind();
        this._ndcTriangle.draw();
        this._intermediateFBO.unbind();

        this._accumulate.frame(frameNumber);
    }

    protected onSwap(): void {
        this._blit.framebuffer = this._accumulate.framebuffer ?
            this._accumulate.framebuffer : this._blit.framebuffer = this._intermediateFBO;
        this._blit.frame();
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

        /* Enable required extensions. */

        if (this._extensions === false && this.context.isWebGL1) {
            gloperate.auxiliaries.assert(this.context.supportsStandardDerivatives,
                `expected OES_standard_derivatives support`);
            /* tslint:disable-next-line:no-unused-expression */
            this.context.standardDerivatives;
            this._extensions = true;
        }

        /* Create and configure program and geometry. */

        const vert = new gloperate.Shader(this.context, gl.VERTEX_SHADER, 'testrenderer.vert');
        vert.initialize(require('./testrenderer.vert'));
        const frag = new gloperate.Shader(this.context, gl.FRAGMENT_SHADER, 'testrenderer.frag');
        frag.initialize(require('./testrenderer.frag'));

        this._program = new gloperate.Program(this.context);
        this._program.initialize([vert, frag]);

        this._uNdcOffset = this._program.uniform('u_ndcOffset');
        this._uFrameNumber = this._program.uniform('u_frameNumber');

        this._ndcTriangle = new gloperate.NdcFillingTriangle(this.context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._ndcTriangle.initialize(aVertex);

        this._ndcOffsetKernel = new gloperate.AntiAliasingKernel(this._multiFrameNumber);

        /* Create framebuffers, textures, and render buffers. */

        this._defaultFBO = new gloperate.DefaultFramebuffer(this.context, 'DefaultFBO');
        this._defaultFBO.initialize();

        this._colorRenderTexture = new gloperate.Texture2(this.context, 'ColorRenderTexture');
        this._depthRenderbuffer = new gloperate.Renderbuffer(this.context, 'DepthRenderbuffer');

        this._intermediateFBO = new gloperate.Framebuffer(this.context, 'IntermediateFBO');

        /* Create and configure accumulation pass. */

        this._accumulate = new gloperate.AccumulatePass(this.context);
        this._accumulate.initialize(this._ndcTriangle);
        this._accumulate.precision = this._framePrecision;
        this._accumulate.texture = this._colorRenderTexture;
        // this._accumulate.depthStencilAttachment = this._depthRenderbuffer;

        /* Create and configure blit pass. */

        this._blit = new gloperate.BlitPass(this.context);
        this._blit.initialize(this._ndcTriangle);
        this._blit.readBuffer = gl2facade.COLOR_ATTACHMENT0;
        this._blit.drawBuffer = gl.BACK;
        this._blit.target = this._defaultFBO;

        /* Create and configure test navigation. */

        this._testNavigation = new gloperate.debug.TestNavigation(() => this.invalidate(), mouseEventProvider);

        return true;
    }

    uninitialize(): void {
        super.uninitialize();

        this._uNdcOffset = -1;
        this._uFrameNumber = -1;
        this._program.uninitialize();

        this._ndcTriangle.uninitialize();

        this._intermediateFBO.uninitialize();
        this._defaultFBO.uninitialize();
        this._colorRenderTexture.uninitialize();
        this._depthRenderbuffer.uninitialize();

        this._blit.uninitialize();
    }

}

