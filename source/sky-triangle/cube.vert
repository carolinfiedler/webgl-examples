
precision lowp float;

//@import ../shaders/facade.vert;


#if __VERSION__ == 100
    attribute vec3 a_vertex;
#else 
    layout(location = 0) in vec3 a_vertex;
#endif

uniform mat4 u_viewProjection;
uniform mat4 u_model;

varying vec2 v_uv;


void main()
{                       //why necessary?
    v_uv = a_vertex.xy * vec2(1.0, -1.0) * 0.5 + 0.5;
    gl_Position = u_viewProjection * u_model * vec4(a_vertex, 1.0);
}
