
import * as gloperate from 'webgl-operate';


export class Paraboloidmap {

    protected _context: gloperate.Context;
    protected _camera: gloperate.Camera;

    protected _triangle: gloperate.NdcFillingTriangle;
    protected _textureTop: gloperate.Texture2;
    protected _textureBottom: gloperate.Texture2;

    protected _program: gloperate.Program;
    protected _uInverseViewProjection: WebGLUniformLocation;
    protected _uBackgroundTop: WebGLUniformLocation;
    protected _uBackgroundBottom: WebGLUniformLocation;

    constructor(protected _type: string) {
    }

    protected loadImage(): void {
        const gl = this._context.gl;

        this._textureTop = new gloperate.Texture2(this._context);
        const internalFormatAndTypeTop = gloperate.Wizard.queryInternalTextureFormat(this._context, gl.RGB, 'byte');
        this._textureTop.initialize(1, 1, internalFormatAndTypeTop[0], gl.RGB, internalFormatAndTypeTop[1]);

        this._textureBottom = new gloperate.Texture2(this._context);
        const internalFormatAndTypeBottom = gloperate.Wizard.queryInternalTextureFormat(this._context, gl.RGB, 'byte');
        this._textureBottom.initialize(1, 1, internalFormatAndTypeBottom[0], gl.RGB, internalFormatAndTypeBottom[1]);

        const top = new Image();
        top.src = 'data/paraboloid.png';

        const bottom = new Image();
        bottom.src = 'data/paraboloid_bottom.png';

        const callbackTop = () => {
            this._textureTop.resize(top.width, top.height);
            this._textureTop.data(top);
        };

        const callbackBottom = () => {
            this._textureBottom.resize(bottom.width, bottom.height);
            this._textureBottom.data(bottom);
        };

        top.addEventListener('load', callbackTop);
        bottom.addEventListener('load', callbackBottom);
    }

    initialize(context: gloperate.Context, camera: gloperate.Camera): void {

        this._context = context;
        this._camera = camera;

        const gl = this._context.gl;

        const vert = new gloperate.Shader(this._context, gl.VERTEX_SHADER, 'map.vert');
        vert.initialize(require('./map.vert'));
        const frag = new gloperate.Shader(this._context, gl.FRAGMENT_SHADER, this._type + 'map.frag');
        frag.initialize(require('./' + this._type + 'map.frag'));

        this._program = new gloperate.Program(this._context);
        this._program.initialize([vert, frag]);

        this._uInverseViewProjection = this._program.uniform('u_inverseViewProjection');
        this._uBackgroundTop = this._program.uniform('u_backgroundTop');
        this._uBackgroundBottom = this._program.uniform('u_backgroundBottom');

        this._triangle = new gloperate.NdcFillingTriangle(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._triangle.initialize(aVertex);

        this.loadImage();
    }

    uninitialize(): void {
        this._uInverseViewProjection = -1;
        this._uBackgroundTop = -1;
        this._uBackgroundBottom = -1;

        this._program.uninitialize();
        this._triangle.uninitialize();
        this._textureTop.uninitialize();
        this._textureBottom.uninitialize();
    }

    frame(): void {
        const gl = this._context.gl;

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);

        this._program.bind();
        gl.uniformMatrix4fv(this._uInverseViewProjection, gl.GL_FALSE, this._camera.viewProjectionInverse);
        gl.uniform1i(this._uBackgroundTop, 0);
        gl.uniform1i(this._uBackgroundBottom, 1);

        this._textureTop.bind(gl.TEXTURE0);
        this._textureBottom.bind(gl.TEXTURE0 + 1);
        this._triangle.bind();
        this._triangle.draw();
        this._triangle.unbind();
        this._textureBottom.unbind(gl.TEXTURE0 + 1);
        this._textureTop.unbind(gl.TEXTURE0);

        this._program.unbind();

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

}
