
#extension OES_standard_derivatives : enable
 
precision lowp float;

uniform samplerCube background;

in vec3 v_uv;

out vec4 out_color;

void main()
{
    vec3 uv = (v_uv);
    /*
    vec3 w3 = abs(fwidth(uv));
    float density = sqrt(w3.x * w3.x + w3.y * w3.y + w3.z * w3.z);
    density *= 100.0;
    vec3 color = texture(background, uv).rgb;
    out_color = vec4(mix(vec3(0,0,0), vec3(1,0,0), density), 1.0);
    */
    out_color = texture(background, normalize(v_uv));
}
