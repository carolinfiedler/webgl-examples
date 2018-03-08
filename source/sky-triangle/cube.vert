
precision lowp float;

@import ../shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec3 a_vertex;
#else 
    layout(location = 0) in vec3 a_vertex;
#endif

uniform mat4 u_viewProjection;
uniform mat4 u_model;

varying vec3 v_vertex;


void main()
{
    v_vertex = a_vertex;
    gl_Position = u_viewProjection * u_model * vec4(a_vertex, 1.0);
}
