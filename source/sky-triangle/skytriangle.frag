
precision lowp float;

@import ../shaders/facade.frag;

#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform samplerCube u_background;
uniform vec3 u_eye;

in vec2 v_uv;
in vec4 v_ray;

void main()
{
    vec3 stu = normalize(v_ray.xyz - u_eye);
    fragColor = vec4(texture(u_background, stu).rgb, 1.0);
}
