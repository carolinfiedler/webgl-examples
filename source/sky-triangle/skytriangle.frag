
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform samplerCube u_background;
uniform vec3 u_eye;

varying vec2 v_uv;
varying vec4 v_ray;

void main(void)
{
    vec3 stu = normalize(v_ray.xyz - u_eye);

#if __VERSION__ == 100
    vec3 color = textureCube(u_background, stu).rgb;
#else
    vec3 color = texture(u_background, stu).rgb;
#endif

    fragColor = vec4(color, 1.0);
}
