
precision lowp float;

uniform samplerCube background;

in vec3 v_uv;

out vec4 out_color;

void main()
{
    out_color = texture(background, normalize(v_uv));
}
