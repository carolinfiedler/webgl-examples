
precision lowp float;

@import ../shaders/facade.vert;

uniform mat4 inverseViewProjection;

in vec2 in_vertex;

out vec2 v_uv;
out vec4 v_ray;

void main()
{
    gl_Position = vec4(in_vertex, 1.0, 1.0);

    v_uv = in_vertex.xy;
    
    v_ray = inverseViewProjection * vec4(in_vertex, 1.0, 1.0);
}
