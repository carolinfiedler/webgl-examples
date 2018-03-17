
import { mat4, vec2, vec3 } from 'gl-matrix';

import { Camera, EventHandler, gl_matrix_extensions, Invalidate, MouseEventProvider, Navigation } from 'webgl-operate';

enum TrackballModes { Zoom, Rotate, ZoomStep }


export class TrackballNavigation extends Navigation {

    protected _eventHandler: EventHandler;

    // Current interaction mode
    protected _mode: TrackballModes | undefined;

    // Zoom radius
    protected _radius = 3.0;

    // Current rotation matrix
    protected _rotation: mat4 = mat4.create();

    // Last recorded mouse position
    protected _lastPos: vec2;

    constructor(invalidate: Invalidate, mouseEventProvider: MouseEventProvider) {
        super();

        // Create event handler that listens to mouse events
        this._eventHandler = new EventHandler(invalidate, mouseEventProvider);

        // Listen to mouse events
        this._eventHandler.pushMouseDownHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseDown(latests, previous));
        this._eventHandler.pushMouseUpHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseUp(latests, previous));
        this._eventHandler.pushMouseMoveHandler((latests: Array<MouseEvent>, previous: Array<MouseEvent>) =>
            this.onMouseMove(latests, previous));
        this._eventHandler.pushMouseWheelHandler((latests: Array<WheelEvent>, previous: Array<WheelEvent>) =>
            this.onWheel(latests, previous));
    }

    protected mode(event: MouseEvent | TouchEvent | KeyboardEvent): TrackballModes | undefined {
        if ((event.type === 'mousedown' || event.type === 'mousemove') && ((event as MouseEvent).buttons & 1)) {
            // Mouse button 1: rotate
            return TrackballModes.Rotate;
        } else if ((event.type === 'mousedown' || event.type === 'mousemove')
            // Mouse button 2: zoom
            && ((event as MouseEvent).buttons & 2)) {
            return TrackballModes.Zoom;
        } else if (event.type === 'wheel') {
            // Mouse wheel: zoom
            return TrackballModes.ZoomStep;
        }

        // Unknown interaction
        return undefined;
    }

    protected onMouseDown(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            this._mode = this.mode(event);

            switch (this._mode) {
                case TrackballModes.Zoom:
                    this.startZoom(event);
                    break;

                case TrackballModes.Rotate:
                    this.startRotate(event);
                    break;

                default:
                    break;
            }
        }
    }

    protected onMouseUp(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            if (undefined === this._mode) {
                return;
            }

            event.preventDefault();
        }
    }

    protected onMouseMove(latests: Array<MouseEvent>, previous: Array<MouseEvent>) {
        for (const event of latests) {
            const modeWasUndefined = (this._mode === undefined);
            this._mode = this.mode(event);

            switch (this._mode) {
                case TrackballModes.Zoom:
                    modeWasUndefined ? this.startZoom(event) : this.updateZoom(event);
                    break;

                case TrackballModes.Rotate:
                    modeWasUndefined ? this.startRotate(event) : this.updateRotate(event);
                    break;

                default:
                    break;
            }
        }
    }

    protected onWheel(latests: Array<WheelEvent>, previous: Array<WheelEvent>) {
        for (const event of latests) {
            this._mode = this.mode(event);

            switch (this._mode) {
                case TrackballModes.ZoomStep:
                    this.applyZoomStep(event);
                    break;

                default:
                    break;
            }
        }
    }

    protected startZoom(event: MouseEvent): void {
        // Stop default action for the event
        /** @todo does not work, because this is only a copy? */
        event.preventDefault();

        // Update mouse position
        const pos = vec2.fromValues(event.clientX, event.clientY);
        this._lastPos = pos;
    }

    protected updateZoom(event: MouseEvent): void {
        // Stop default action for the event
        /** @todo does not work, because this is only a copy? */
        event.preventDefault();

        // Get mouse position
        const pos = vec2.fromValues(event.clientX, event.clientY);

        // Update zoom
        const deltaY = pos[1] - this._lastPos[1];
        this._radius = gl_matrix_extensions.clamp(this._radius + deltaY * 0.01, 1.0, 10.0);

        // Update last mouse position
        this._lastPos = pos;

        // Calculate new camera transformation
        this.updateCamera();
    }

    protected applyZoomStep(event: WheelEvent): void {
        // Stop default action for the event
        /** @todo does not work, because this is only a copy? */
        event.preventDefault();

        // Update zoom
        const delta = event.deltaY > 0 ? 1 : -1;
        this._radius = gl_matrix_extensions.clamp(this._radius + delta * 0.3, 1.0, 10.0);

        // Calculate new camera transformation
        this.updateCamera();
    }

    protected startRotate(event: MouseEvent): void {
        // Stop default action for the event
        /** @todo does not work, because this is only a copy? */
        event.preventDefault();

        // Update mouse position
        const pos = vec2.fromValues(event.clientX, event.clientY);
        this._lastPos = pos;
    }

    protected updateRotate(event: MouseEvent): void {
        // Stop default action for the event
        /** @todo does not work, because this is only a copy? */
        event.preventDefault();

        // Get mouse position
        const pos = vec2.fromValues(event.clientX, event.clientY);

        // Get rotation deltas
        const scaling = 0.005;
        const dTheta = (this._lastPos[0] - pos[0]) * scaling;
        const dPhi = (this._lastPos[1] - pos[1]) * scaling;

        // Update last mouse position
        this._lastPos = pos;

        // Calculate delta rotation around Y-axis
        const rotY = mat4.create();
        mat4.fromYRotation(rotY, dTheta);

        // Calculate delta rotation around Z-axis
        const rotZ = mat4.create();
        mat4.fromZRotation(rotZ, dPhi);

        // Update rotation matrix
        mat4.multiply(this._rotation, this._rotation, rotY);
        mat4.multiply(this._rotation, this._rotation, rotZ);

        // Calculate new camera transformation
        this.updateCamera();
    }

    protected updateCamera(): void {
        // Get transformation matrix
        const mat = mat4.create();
        mat4.copy(mat, this._rotation);

        // Calculate new up-vector
        const up = vec3.transformMat4(gl_matrix_extensions.v3(), vec3.fromValues(0.0, 1.0, 0.0), mat);

        // Calculate new camera position
        mat4.translate(mat, mat, vec3.fromValues(-this._radius, 0.0, 0.0));
        const eye = vec3.transformMat4(gl_matrix_extensions.v3(), gl_matrix_extensions.v3(), mat);

        // Update camera
        this._camera.center = gl_matrix_extensions.v3();
        this._camera.eye = eye;
        this._camera.up = up;
    }

    initialize(camera: Camera) {
        // Set camera
        this._camera = camera;

        // Calculate initial camera transformation
        this.updateCamera();
    }

    update() {
        // Process events
        this._eventHandler.update();
    }
}
