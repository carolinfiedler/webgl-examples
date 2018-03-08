
precision lowp float;

@import ../shaders/facade.frag;

#if __VERSION__ == 100
    attribute vec3 a_vertex;
#else 
    layout(location = 0) in vec3 a_vertex;
#endif

uniform mat4  u_transform;
uniform vec3  u_eye;

out vec3 v_uv;

void main()
{
    v_uv = a_vertex;

    vec4 vertex = u_transform * vec4(a_vertex + u_eye, 1.0);
    gl_Position = vertex.xyww;    
}
