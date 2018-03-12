
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
#else 
    layout(location = 0) out vec4 fragColor;
#endif


uniform samplerCube u_background;

varying vec3 v_uv;


void main(void)
{
    vec3 uv = (v_uv);
    /*
    vec3 w3 = abs(fwidth(uv));
    float density = sqrt(w3.x * w3.x + w3.y * w3.y + w3.z * w3.z);
    density *= 100.0;
    vec3 color = texture(background, uv).rgb;
    out_color = vec4(mix(vec3(0,0,0), vec3(1,0,0), density), 1.0);
    */

#if __VERSION__ == 100
    vec3 color = textureCube(u_background, normalize(v_uv)).rgb;
#else
    vec3 color = texture(u_background, normalize(v_uv)).rgb;
#endif

    fragColor = vec4(color, 1.0);
}
