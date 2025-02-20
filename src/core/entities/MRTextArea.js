import { getSelectionRects } from 'troika-three-text';

import * as THREE from 'three';

import { MRTextEntity } from 'mrjs/core/MRTextEntity';

/**
 * @class MRTextArea
 * @classdesc The text element that is used to represent normal paragraph user-entry text field items one would expect in a web-browser. `mr-textarea`
 * @augments MRTextEntity
 */
export class MRTextArea extends MRTextEntity {
    /**
     * @class
     * @description Constructor for the textArea entity component.
     */
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    /**
     * @function
     * @description Callback function of MREntity - handles setting up this textarea once it is connected to run as an entity component.
     */
    connected() {
        this.input = document.createElement('textarea');

        const geometry = new THREE.PlaneGeometry(0.0015, 0.02);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: 2,
        });

        this.cursor = new THREE.Mesh(geometry, material);

        this.textObj.add(this.cursor);
        this.cursor.position.z += 0.001;
        this.cursor.visible = false;

        document.addEventListener('DOMContentLoaded', (event) => {
            this.input.textContent = this.textContent.replace(/(\n)\s+/g, '$1').trim();
        });

        this.input.style.opacity = 0; // Make it invisible
        this.input.style.position = 'absolute'; // Avoid affecting layout
        this.shadowRoot.appendChild(this.input);

        this.addEventListener('click', (event) => {
            this.focus();
        });
    }

    /**
     * @function
     * @description Blurs the inputted text value and cursor information
     */
    blur = () => {
        this.input.blur();
        this.cursor.visible = false;
    };

    /**
     * @function
     * @description Focuses the inputted text value and cursor information as if it is selected. Includes showing the cursor item.
     */
    focus = () => {
        this.input.focus();
        this.input.selectionStart = this.input.value.length;
        this.cursor.visible = true;
        this.cursor.geometry = new THREE.PlaneGeometry(0.002, this.textObj.fontSize);
        this.updateCursorPosition();
    };

    /**
     * @function
     * @description Updates the cursor position based on click and selection location.
     */
    updateCursorPosition = () => {
        const end = this.input.selectionStart > 0 ? this.input.selectionStart : 1;
        const selectBox = getSelectionRects(this.textObj.textRenderInfo, 0, end).pop();
        if (isNaN(selectBox.right)) {
            return;
        }
        this.cursor.position.setX(this.input.selectionStart == 0 ? selectBox.left : selectBox.right);
        this.cursor.position.setY(selectBox.bottom + this.textObj.fontSize / 2);
    };
}

customElements.get('mr-textarea') || customElements.define('mr-textarea', MRTextArea);
