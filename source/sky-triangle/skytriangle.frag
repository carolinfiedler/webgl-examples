
precision lowp float;

@import ../shaders/facade.frag;


uniform samplerCube cubemap;
uniform vec3 eye;

in vec2 v_uv;
in vec4 v_ray;

out vec4 out_color;

void main()
{
	vec3 stu = normalize(v_ray.xyz - eye);

	out_color = vec4(texture(cubemap, stu).rgb, 1.0);
}
