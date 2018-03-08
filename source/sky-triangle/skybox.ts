
import { assert } from '../auxiliaries';

import {
    Camera, Context, Program, Shader, TextureCube,
} from 'webgl-operate';

import { Cube } from './cube';


export class Skybox {

    protected _skyCube: Cube;
    protected _skyProgram: Program;
    protected _uTransform: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;
    protected _aVertex: GLuint;

    protected _context: Context;


    initialize(context: Context): void {
        const gl = context.gl;
        this._context = context;

        // init program
        this._skyProgram = new Program(context);
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'skybox.vert');
        vert.initialize(require('./skybox.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'skybox.frag');
        frag.initialize(require('./skybox.frag'));
        this._skyProgram.initialize([vert, frag]);
        this._aVertex = this._skyProgram.attribute('in_vertex', 0);
        this._uTransform = this._skyProgram.uniform('transform');
        this._uEye = this._skyProgram.uniform('eye');
        this._uBackground = this._skyProgram.uniform('background');

        // init geometry
        this._skyCube = new Cube(this._context);
        this._skyCube.initialize(this._aVertex);
    }


    render(camera: Camera, cubeMap: TextureCube): void {
        const gl = this._context.gl;

        // render sky
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);

        this._skyProgram.bind();
        gl.uniformMatrix4fv(this._uTransform, gl.GL_FALSE, camera.viewProjection);
        gl.uniform3fv(this._uEye, camera.eye);
        gl.uniform1i(this._uBackground, 0);
        cubeMap.bind(0);
        this._skyCube.bind();
        this._skyCube.draw();
        this._skyCube.unbind();
        cubeMap.unbind();
        this._skyProgram.unbind();

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }


    uninitialize(): void {

        this._skyProgram.uninitialize();
        this._skyCube.uninitialize();
    }
}
