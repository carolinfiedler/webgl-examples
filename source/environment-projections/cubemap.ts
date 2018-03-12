
import * as gloperate from 'webgl-operate';


export class Cubemap {

    protected _context: gloperate.Context;
    protected _camera: gloperate.Camera;

    protected _triangle: gloperate.NdcFillingTriangle;
    protected _texture: gloperate.TextureCube;

    protected _program: gloperate.Program;
    protected _uInverseViewProjection: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;


    initialize(context: gloperate.Context, camera: gloperate.Camera, texture: gloperate.TextureCube): void {
        this._context = context;
        this._camera = camera;
        this._texture = texture;

        const gl = this._context.gl;

        const vert = new gloperate.Shader(this._context, gl.VERTEX_SHADER, 'cubemap.vert');
        vert.initialize(require('./cubemap.vert'));
        const frag = new gloperate.Shader(this._context, gl.FRAGMENT_SHADER, 'cubemap.frag');
        frag.initialize(require('./cubemap.frag'));

        this._program = new gloperate.Program(this._context);
        this._program.initialize([vert, frag]);

        this._uInverseViewProjection = this._program.uniform('u_inverseViewProjection');
        this._uEye = this._program.uniform('u_eye');
        this._uBackground = this._program.uniform('u_background');

        this._triangle = new gloperate.NdcFillingTriangle(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._triangle.initialize(aVertex);
    }

    uninitialize(): void {
        this._uInverseViewProjection = -1;
        this._uEye = -1;
        this._uBackground = -1;

        this._program.uninitialize();
        this._triangle.uninitialize();
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
        gl.uniform3fv(this._uEye, this._camera.eye);
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
