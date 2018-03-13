
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
    vec3 stu = normalize(v_ray.xyz) * vec3(-1.0, 1.0, 1.0);

    const float c_2OverPi  = 0.6366197723675813430755350534901;
    const float c_1Over2Pi = 0.1591549430918953357688837633725;
    const float c_1OverPi  = 0.3183098861837906715377675267450;

    // TODO: c_1OverPi was not defined anywhere (typo?)
    /*float v = isHalf ? (asin(+stu.z) * c_2OverPi) : (acos(-stu.z) * c_1OverPi);
    vec2 uv = vec2(atan(stu.x, stu.y) * c_1Over2Pi, v);*/

    float v = (acos(stu.y) * c_1OverPi);
    vec2 uv = vec2(atan(stu.x, stu.z) * c_1Over2Pi, v);

#if __VERSION__ == 100
    vec3 color = texture2D(u_background, uv).rgb;
#else
    vec3 color = texture(u_background, uv).rgb;
#endif

    fragColor = vec4(color, 1.0);
}
