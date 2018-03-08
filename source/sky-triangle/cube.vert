
precision lowp float;

in vec3 in_vertex;

uniform mat4 viewProjection;
uniform mat4 model;

out vec3 v_vertex;

void main()
{
    v_vertex = in_vertex;
    gl_Position = viewProjection * model * vec4(in_vertex, 1.0);
}
