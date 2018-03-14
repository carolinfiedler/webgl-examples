
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else
    layout(location = 0) out vec4 fragColor;
#endif


uniform sampler2D u_backgroundTop;
uniform sampler2D u_backgroundBottom;

varying vec4 v_ray;
varying vec2 v_uv;

void main(void)
{                                     // why necessary?
    vec3 stu = normalize(v_ray.xyz) * vec3(-1.0, 1.0, 1.0);

    stu.y = asin(stu.y) * 2.0 / 3.14159265359;
    float m = stu.y > 0.0 ? 1.0 + stu.y : 1.0 - stu.y;
    vec2 uv = 0.5 + 0.5 * vec2(stu.x, stu.z) / m;
    
#if __VERSION__ == 100
    vec3 colorTop = texture2D(u_backgroundTop, uv).rgb;
    vec3 colorBottom = texture2D(u_backgroundBottom, uv).rgb;
#else
    vec3 colorTop = texture(u_backgroundTop, uv).rgb;
    vec3 colorBottom = texture(u_backgroundBottom, uv).rgb;
#endif

    fragColor = stu.y > 0.0 ? vec4(colorTop, 1.0) : vec4(colorBottom, 1.0);
}
