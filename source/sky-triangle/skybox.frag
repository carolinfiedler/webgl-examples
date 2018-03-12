
precision lowp float;

@import ../shaders/facade.frag;


#if __VERSION__ == 100
    #define fragColor gl_FragColor
    // #extension GL_OES_standard_derivatives : enable
#else 
    layout(location = 0) out vec4 fragColor;
#endif


uniform samplerCube u_background;

varying vec3 v_uv;


void main(void)
{                    // why necessary?
    vec3 uv = v_uv * vec3(-1.0, 1.0, 1.0);

#if __VERSION__ == 100
    vec3 color = textureCube(u_background, normalize(uv)).rgb;
#else
    vec3 color = texture(u_background, normalize(uv)).rgb;
#endif

    fragColor = vec4(color, 1.0);

    /* visualize texel density
    vec3 w3 = abs(fwidth(uv));
    float density = sqrt(w3.x * w3.x + w3.y * w3.y + w3.z * w3.z);
    density *= 100.0;
    fragColor = vec4(mix(color, vec3(1,0,0), density), 1.0);
    */
}
