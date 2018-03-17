
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else 
    layout(location = 0) out vec4 fragColor;
#endif


varying vec3 v_vertex;


void main(void)
{
    fragColor = vec4(v_vertex, 1.0);
}
