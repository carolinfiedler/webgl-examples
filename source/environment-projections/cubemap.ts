
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

    protected loadImages(): void {
        const gl = this._context.gl;

        this._texture = new gloperate.TextureCube(this._context);
        const internalFormatAndType = gloperate.Wizard.queryInternalTextureFormat(this._context, gl.RGB, 'byte');
        this._texture.initialize(1, 1, internalFormatAndType[0], gl.RGB, internalFormatAndType[1]);

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
                this._texture.resize(px.width, px.height);
                this._texture.data([px, nx, py, ny, pz, nz]);
            }
        };

        px.addEventListener('load', callback);
        nx.addEventListener('load', callback);
        py.addEventListener('load', callback);
        ny.addEventListener('load', callback);
        pz.addEventListener('load', callback);
        nz.addEventListener('load', callback);
    }

    initialize(context: gloperate.Context, camera: gloperate.Camera): void {
        this._context = context;
        this._camera = camera;

        const gl = this._context.gl;

        const vert = new gloperate.Shader(this._context, gl.VERTEX_SHADER, 'map.vert');
        vert.initialize(require('./map.vert'));
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

        this.loadImages();
    }

    uninitialize(): void {
        this._uInverseViewProjection = -1;
        this._uEye = -1;
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
