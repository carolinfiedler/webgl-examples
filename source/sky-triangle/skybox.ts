
import { assert } from '../auxiliaries';

import {
    Camera, Context, Program, Shader, TextureCube,
} from 'webgl-operate';

import { Cube } from './cube';


export class Skybox {

    protected _context: Context;

    protected _cube: Cube;

    protected _program: Program;
    protected _uTransform: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;


    initialize(context: Context): void {
        const gl = context.gl;
        this._context = context;

        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'skybox.vert');
        vert.initialize(require('./skybox.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'skybox.frag');
        frag.initialize(require('./skybox.frag'));

        this._program = new Program(context);
        this._program.initialize([vert, frag]);

        this._uTransform = this._program.uniform('u_transform');
        this._uEye = this._program.uniform('u_eye');
        this._uBackground = this._program.uniform('u_background');

        this._cube = new Cube(this._context);
        const aVertex = this._program.attribute('a_vertex', 0);
        this._cube.initialize(aVertex);
    }

    uninitialize(): void {
        this._uTransform = -1;
        this._uEye = -1;
        this._uBackground = -1;

        this._program.uninitialize();
        this._cube.uninitialize();
    }

    render(camera: Camera, cubeMap: TextureCube): void {
        const gl = this._context.gl;

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);

        this._program.bind();
        gl.uniformMatrix4fv(this._uTransform, gl.GL_FALSE, camera.viewProjection);
        gl.uniform3fv(this._uEye, camera.eye);
        gl.uniform1i(this._uBackground, 0);

        cubeMap.bind(0);
        this._cube.bind();
        this._cube.draw();
        this._cube.unbind();
        cubeMap.unbind();

        this._program.unbind();

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }

}
