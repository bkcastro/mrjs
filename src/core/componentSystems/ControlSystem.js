import * as THREE from 'three';

import { MRSystem } from 'mrjs/core/MRSystem';
import { MRHand, HAND_GROUP } from 'mrjs/dataTypes/MRHand';

import { mrjsUtils } from 'mrjs';

/**
 * @class ControlSystem
 * @classdesc This system supports interaction event information including mouse and controller interfacing.
 * @augments MRSystem
 */
export class ControlSystem extends MRSystem {
    /**
     * @class
     * @description ControlSystem's Default constructor that sets up the app's mouse information along with any relevant physics and cursor information.
     */
    constructor() {
        super(false);
        this.leftHand = new MRHand('left', this.app);
        this.rightHand = new MRHand('right', this.app);
        this.activeHand = this.leftHand;

        document.addEventListener('selectstart', (event) => {
            if (event.detail == null) {
                return;
            }
            if (event.detail?.handedness == 'left') {
                this.activeHand = this.leftHand;
            } else {
                this.activeHand = this.rightHand;
            }

            this.removeCursor();
            this.down = true;
            this.cursor = this.cursorClick;
            this.cursorViz.material.color.setStyle('blue');
        });

        document.addEventListener('selectend', (event) => {
            if (event.detail.handedness == null) {
                return;
            }
            this.removeCursor();
            this.down = false;
            this.cursor = this.cursorHover;
            this.cursorViz.material.color.setStyle('black');
        });

        this.origin = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.ray = new mrjsUtils.Physics.RAPIER.Ray({ x: 0.0, y: 0.0, z: 0.0 }, { x: 0.0, y: 1.0, z: 0.0 });
        this.hit;

        this.restPosition = new THREE.Vector3(1000, 1000, 1000);
        this.hitPosition = new THREE.Vector3();
        this.hitNormal = new THREE.Vector3();
        this.timer;

        const rigidBodyDesc = mrjsUtils.Physics.RAPIER.RigidBodyDesc.kinematicPositionBased();
        const colDesc = mrjsUtils.Physics.RAPIER.ColliderDesc.ball(0.01);

        this.cursorClick = this.app.physicsWorld.createRigidBody(rigidBodyDesc);
        this.cursorHover = this.app.physicsWorld.createRigidBody(rigidBodyDesc);
        this.cursorViz = new THREE.Mesh(new THREE.RingGeometry(0.005, 0.007, 32), new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.7, transparent: true }));

        this.app.scene.add(this.cursorViz);
        this.cursorViz.visible = false;

        this.cursorHover.collider = this.app.physicsWorld.createCollider(colDesc, this.cursorHover);
        this.cursorClick.collider = this.app.physicsWorld.createCollider(colDesc, this.cursorClick);

        this.cursorClick.setTranslation({ ...this.restPosition }, true);
        this.cursorHover.setTranslation({ ...this.restPosition }, true);

        mrjsUtils.Physics.INPUT_COLLIDER_HANDLE_NAMES[this.cursorClick.collider.handle] = 'cursor';
        mrjsUtils.Physics.INPUT_COLLIDER_HANDLE_NAMES[this.cursorHover.collider.handle] = 'cursor-hover';

        this.cursor = this.cursorHover;
        this.down = false;

        this.app.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
        this.app.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
        this.app.renderer.domElement.addEventListener('mousemove', this.mouseOver);

        this.app.renderer.domElement.addEventListener('touchstart', this.onMouseDown);
        this.app.renderer.domElement.addEventListener('touchend', this.onMouseUp);
        this.app.renderer.domElement.addEventListener('touchmove', this.mouseOver);
    }

    /**
     * @function
     * @description The generic system update call. Updates the meshes and states for both the left and right hand visuals.
     * @param {number} deltaTime - given timestep to be used for any feature changes
     * @param {object} frame - given frame information to be used for any feature changes
     */
    update(deltaTime, frame) {
        this.leftHand.setMesh();
        this.rightHand.setMesh();

        this.leftHand.update();
        this.rightHand.update();

        if (mrjsUtils.xr.isPresenting) {
            this.origin.setFromMatrixPosition(this.app.userOrigin.matrixWorld);
            this.direction.setFromMatrixPosition(this.activeHand.pointer.matrixWorld).sub(this.origin).normalize();

            this.ray.origin = { ...this.origin };
            this.ray.dir = { ...this.direction };

            this.hit = this.app.physicsWorld.castRayAndGetNormal(this.ray, 100, true, null, mrjsUtils.Physics.CollisionGroups.UI, null, this.cursor);
            if (this.hit != null) {
                this.hitPosition.copy(this.ray.pointAt(this.hit.toi));
                this.hitNormal.copy(this.hit.normal);
                this.cursor.setTranslation({ ...this.hitPosition }, true);
                this.cursorViz.visible = true;
                this.cursorViz.position.copy(this.hitPosition);

                this.cursorViz.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.hit.normal);
            } else {
                this.removeCursor();
                this.cursorViz.visible = false;
            }
        }
    }

    /************ Interaction Events ************/

    /**
     * @function
     * @description Handles the mouse over event
     * @param {event} event - the mouse over event
     */
    mouseOver = (event) => {
        if (this.down) {
            this.cursor = this.cursorClick;
        } else {
            this.cursor = this.cursorHover;
        }

        this.hit = this.pixelRayCast(event);

        if (this.hit != null) {
            this.hitPosition.copy(this.ray.pointAt(this.hit.toi));
            this.cursor.setTranslation({ ...this.hitPosition }, true);
        }
    };

    /**
     * @function
     * @description Handles the mouse down event
     * @param {event} event - the mouse down event
     */
    onMouseDown = (event) => {
        event.stopPropagation();
        this.removeCursor();
        this.down = true;
        this.cursor = this.cursorClick;

        this.cursor.setTranslation({ ...this.hitPosition }, true);
    };

    /**
     * @function
     * @description Handles the mouse up event
     * @param {event} event - the mouse up event
     */
    onMouseUp = (event) => {
        event.stopPropagation();
        this.removeCursor();
        this.down = false;
        this.cursor = this.cursorHover;

        this.cursor.setTranslation({ ...this.hitPosition }, true);
    };

    /**
     * @function
     * @description Handles the removeCursor callback.
     */
    removeCursor = () => {
        this.cursor.setTranslation({ ...this.restPosition }, true);
    };

    /************ Tools && Helpers ************/

    /**
     * @function
     * @description Raycast into the scene using the information from the event that called it.
     * @param {object} event - the event being handled
     * @returns {object} - collision item for what the ray hit in the 3d scene.
     */
    pixelRayCast(event) {
        let x = 0;
        let y = 0;
        if (event.type.includes('touch')) {
            if (event.touches.length == 0) {
                return;
            }

            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        } else {
            x = event.clientX;
            y = event.clientY;
        }

        if (this.app.user instanceof THREE.OrthographicCamera) {
            this.direction.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, -1); // z = - 1 important!
            this.direction.unproject(this.app.user);
            const direction = new THREE.Vector3(0, 0, -1);
            direction.transformDirection(this.app.user.matrixWorld);

            this.ray.origin = { ...this.direction };
            this.ray.dir = { ...direction };
        } else {
            this.direction.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5);
            this.direction.unproject(this.app.user);
            this.direction.sub(this.app.user.position).normalize();
            this.ray.origin = { ...this.app.user.position };
            this.ray.dir = { ...this.direction };
        }

        return this.app.physicsWorld.castRayAndGetNormal(this.ray, 100, true, null, mrjsUtils.Physics.CollisionGroups.UI, null, this.cursor);
    }
}
