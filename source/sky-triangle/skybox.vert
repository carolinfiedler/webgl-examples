
precision lowp float;

in vec3 in_vertex;

uniform mat4 transform;
uniform float far;
uniform vec3 eye;

out vec3 v_uv;

void main()
{
	vec4 vertex = transform * vec4(in_vertex + eye, 1.0);
    gl_Position = vertex.xyww;
    v_uv = in_vertex;
}
