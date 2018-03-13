
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_background;

varying vec4 v_ray;

void main(void)
{                                     // why necessary?
    vec3 stu = normalize(v_ray.xyz) * vec3(-1.0, 1.0, -1.0);

    float z = 1.0 - stu.z;
    float m = sqrt(stu.x * stu.x + stu.y * stu.y + z * z);
    vec2 uv = 0.5 + 0.5 * vec2(+stu.x, -stu.y) / m;

#if __VERSION__ == 100
    vec3 color = texture2D(u_background, uv).rgb;
#else
    vec3 color = texture(u_background, uv).rgb;
#endif

    fragColor = vec4(color, 1.0);
}
