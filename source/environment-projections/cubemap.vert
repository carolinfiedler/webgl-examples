
precision lowp float;

@import ../shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec2 a_vertex;
#else 
    layout(location = 0) in vec2 a_vertex;
#endif


uniform mat4 u_inverseViewProjection;

varying vec2 v_uv;
varying vec4 v_ray;


void main(void)
{
    v_uv = a_vertex.xy;
    v_ray = u_inverseViewProjection * vec4(a_vertex, 1.0, 1.0);

    gl_Position = vec4(a_vertex, 1.0, 1.0);
}
