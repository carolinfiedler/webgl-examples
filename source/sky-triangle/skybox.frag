
precision lowp float;

// uniform sampler2D background;
uniform samplerCube background;

in vec3 v_uv;

out vec4 out_color;

void main()
{
    // out_color = vec4(v_uv*0.5 +0.5, 1.0);
    out_color = texture(background, normalize(v_uv));
}
