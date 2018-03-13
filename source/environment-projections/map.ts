
import * as gloperate from 'webgl-operate';


export class Map {

    protected _context: gloperate.Context;
    protected _camera: gloperate.Camera;

    protected _triangle: gloperate.NdcFillingTriangle;
    protected _texture: gloperate.Texture2;

    protected _program: gloperate.Program;
    protected _uInverseViewProjection: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;

    constructor(protected _type: string) {
    }

    protected loadImage(): void {
        const gl = this._context.gl;

        this._texture = new gloperate.Texture2(this._context);
        const internalFormatAndType = gloperate.Wizard.queryInternalTextureFormat(this._context, gl.RGB, 'byte');
        this._texture.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

        const image = new Image();
        image.src = 'data/' + this._type + '.png';

        const callback = () => {
            this._texture.resize(image.width, image.height);
            this._texture.data(image);
        };

        image.addEventListener('load', callback);
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
        this._uBackground = this._program.uniform('u_background');

        this._triangle = new gloperate.NdcFillingTriangle(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._triangle.initialize(aVertex);

        this.loadImage();
    }

    uninitialize(): void {
        this._uInverseViewProjection = -1;
        this._uBackground = -1;

        this._program.uninitialize();
        this._triangle.uninitialize();
        this._texture.uninitialize();
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
        gl.uniform1i(this._uBackground, 0);

        this._texture.bind(0);
        this._triangle.bind();
        this._triangle.draw();
        this._triangle.unbind();
        this._texture.unbind();

        this._program.unbind();

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

}
