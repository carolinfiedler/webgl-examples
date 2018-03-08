
precision lowp float;

in vec3 v_vertex;

out vec4 out_color;

void main()
{
    out_color = vec4(v_vertex, 1.0);
}
