
import { assert } from '../auxiliaries';

import {
    Camera, Context, NdcFillingTriangle, Program, Shader, TextureCube,
} from 'webgl-operate';


export class SkyTriangle {

    protected _skyTriangle: NdcFillingTriangle;
    protected _skyProgram: Program;
    protected _uInverseVP: WebGLUniformLocation;
    protected _uEye: WebGLUniformLocation;
    protected _uBackground: WebGLUniformLocation;
    protected _aVertex: GLuint;

    protected _context: Context;


    initialize(context: Context): void {
        const gl = context.gl;
        this._context = context;

        // init program
        this._skyProgram = new Program(this._context);
        const vert = new Shader(this._context, gl.VERTEX_SHADER, 'skytriangle.vert');
        vert.initialize(require('./skytriangle.vert'));
        const frag = new Shader(this._context, gl.FRAGMENT_SHADER, 'skytriangle.frag');
        frag.initialize(require('./skytriangle.frag'));
        this._skyProgram.initialize([vert, frag]);
        this._aVertex = this._skyProgram.attribute('in_vertex', 0);
        this._uInverseVP = this._skyProgram.uniform('inverseViewProjection');
        this._uEye = this._skyProgram.uniform('eye');
        this._uBackground = this._skyProgram.uniform('background');

        // init geometry
        this._skyTriangle = new NdcFillingTriangle(this._context);
        this._skyTriangle.initialize(this._aVertex);

    }


    render(camera: Camera, cubeMap: TextureCube): void {
        const gl = this._context.gl;

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.depthFunc(gl.LEQUAL);

        this._skyProgram.bind();
        gl.uniformMatrix4fv(this._uInverseVP, gl.GL_FALSE, camera.viewProjectionInverse);
        gl.uniform3fv(this._uEye, camera.eye);
        gl.uniform1i(this._uBackground, 0);
        cubeMap.bind(0);
        this._skyTriangle.bind();
        this._skyTriangle.draw();
        this._skyTriangle.unbind();
        cubeMap.unbind();
        this._skyProgram.unbind();

        gl.depthFunc(gl.LESS);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
    }


    uninitialize(): void {

        this._skyProgram.uninitialize();
        this._skyTriangle.uninitialize();
    }
}
