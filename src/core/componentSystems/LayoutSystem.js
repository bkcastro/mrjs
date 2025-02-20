import * as THREE from 'three';

import { MRSystem } from 'mrjs/core/MRSystem';
import { MREntity } from 'mrjs/core/MREntity';
import { MRDivEntity } from 'mrjs/core/MRDivEntity';
import { MRPanel } from 'mrjs/core/entities/MRPanel';

/**
 * @class LayoutSystem
 * @classdesc System that allows for setup and handling of changing layout.
 * @augments MRSystem
 */
export class LayoutSystem extends MRSystem {
    /**
     * @class
     * @description Constructor for the layout system. Uses the default System setup.
     */
    constructor() {
        super(false);
        this.tempPosition = new THREE.Vector3();
    }

    /**
     * @function
     * @description Called when a new entity is added to this system
     * @param {MREntity} entity - the entity being added.
     */
    onNewEntity(entity) {
        if (entity instanceof MRPanel) {
            return;
        }
        if (entity instanceof MRDivEntity) {
            this.registry.add(entity);
            this.setLayoutPosition(entity);
        }
    }

    /**
     * @function
     * @description Getter to checks if we need to run this system's update call. Overridden implementation returns true if there are any items in this
     * systems registry that need to be run AND the default systemUpdateCheck is true
     * (see [MRSystem.needsSystemUpdate](https://docs.mrjs.io/javascript-api/#mrsystem.needssystemupdate) for default).
     * @returns {boolean} true if the system is in a state where this system is needed to update, false otherwise
     */
    get needsSystemUpdate() {
        return this.registry.size > 0 && super.needsSystemUpdate;
    }

    /**
     * @function
     * @description Since this class overrides the default `get` for the `needsSystemUpdate` call, the `set` pair is needed for javascript to be happy.
     * Relies on the parent's implementation. (see [MRSystem.needsSystemUpdate](https://docs.mrjs.io/javascript-api/#mrsystem.needssystemupdate) for default).
     */
    set needsSystemUpdate(bool) {
        super.needsSystemUpdate = bool;
    }

    /**
     * @function
     * @description The generic system update call. Handles updating all 3D items to match whatever layout position is expected.
     * @param {number} deltaTime - given timestep to be used for any feature changes
     * @param {object} frame - given frame information to be used for any feature changes
     */
    update(deltaTime, frame) {
        for (const entity of this.registry) {
            this.setLayoutPosition(entity);
        }
    }

    /**
     * @function
     * @description Helper function for the update call. Sets the entity's appropriate 3D layout position based on window and entity expectations.
     * @param {MREntity} entity - the entity being updated.
     */
    setLayoutPosition(entity) {
        const rect = entity.getBoundingClientRect();
        const panel = entity.closest('mr-panel');
        const appRect = this.app.getBoundingClientRect();

        const innerWidth = mrjsUtils.xr.isPresenting ? window.innerWidth : global.appWidth;
        const innerHeight = mrjsUtils.xr.isPresenting ? window.innerHeight : global.appHeight;

        // Calculate the center of the viewport
        const centerX = innerWidth / 2;
        const centerY = innerHeight / 2;

        let windowWidth = mrjsUtils.xr.isPresenting ? panel.width : global.viewPortWidth;
        let windowHeight = mrjsUtils.xr.isPresenting ? panel.height : global.viewPortHeight;

        // Adjust the element's position to be relative to the center of the viewport
        const centeredX = rect.left - appRect.left - centerX;
        const centeredY = rect.top - centerY;

        let threeX = (centeredX / innerWidth) * windowWidth;
        let threeY = (centeredY / innerHeight) * windowHeight;

        threeX += entity.width / 2;
        threeY += entity.height / 2;

        this.tempPosition.setX(threeX);
        this.tempPosition.setY(-threeY);

        entity.object3D.position.setX(this.tempPosition.x);
        entity.object3D.position.setY(this.tempPosition.y);
    }
}
