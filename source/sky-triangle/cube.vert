
precision lowp float;

in vec3 in_vertex;

uniform mat4 viewProjection;
uniform mat4 model;

out vec3 v_vertex;

void main()
{
	gl_Position = viewProjection * model * vec4(in_vertex, 1.0);
    v_vertex = in_vertex;
}
