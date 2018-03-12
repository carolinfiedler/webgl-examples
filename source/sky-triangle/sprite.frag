
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else 
    layout(location = 0) out vec4 fragColor;
#endif

uniform sampler2D u_spriteTexture;
varying vec2 v_uv;

void main(void)
{
    float alpha;
    #if __VERSION__ == 100
        alpha = texture2D(u_spriteTexture, v_uv).r;
    #else 
        alpha = texture(u_spriteTexture, v_uv).r;
    #endif

    fragColor = alpha < 0.5 ? vec4(vec3(1.0), 1.0) : vec4(vec3(0.0), 1.0);

    if(alpha < 0.01)
        discard;
}
