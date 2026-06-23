// 3D Scene Interaction, Raycasting, Grid Snapping, & Block Placing Logic
import * as THREE from 'three';
import { catalog, createMaterial } from './library.js';
import * as audio from './audio.js';

export class DioramaBuilder {
	constructor(scene, camera, domElement, onSelectionChanged, onToolChanged) {
		this.scene = scene;
		this.camera = camera;
		this.domElement = domElement;
		
		// Callbacks
		this.onSelectionChanged = onSelectionChanged;
		this.onToolChanged = onToolChanged;

		// Settings & States
		this.activeItem = null; // Catalog item to place
		this.activeColor = '#67a390';
		this.activeMatType = 'matte';
		this.currentRotation = 0; // Rotations in radians (0, PI/2, PI, 3PI/2)
		this.gridSize = 0.5; // Snap grid size
		this.gridEnabled = true;

		// Groups & Helpers
		this.dioramaGroup = new THREE.Group();
		this.scene.add(this.dioramaGroup);

		this.previewGroup = new THREE.Group();
		this.scene.add(this.previewGroup);

		this.selectedMesh = null;
		this.boxHelper = new THREE.BoxHelper(new THREE.Mesh(), '#67a390');
		this.boxHelper.visible = false;
		this.scene.add(this.boxHelper);

		// Invisible plane at y=0 for raycast fallback
		this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		// Bind events
		this.setupEvents();
	}

	// --- Mode Toggles ---

	setPlaceMode(itemId) {
		this.deselectBlock();
		this.activeItem = catalog.find(item => item.id === itemId);
		
		if (this.activeItem) {
			this.activeColor = this.activeItem.defaultColor;
			this.activeMatType = this.activeItem.materialType;
			this.currentRotation = 0;
			this.createPreviewMesh();
			this.onToolChanged(`Place: ${this.activeItem.name}`);
		} else {
			this.setSelectMode();
		}
	}

	setSelectMode() {
		this.activeItem = null;
		this.clearPreview();
		this.onToolChanged('Select / Inspect');
	}

	// --- Preview Mesh Handlers ---

	clearPreview() {
		while(this.previewGroup.children.length > 0) {
			const obj = this.previewGroup.children[0];
			this.previewGroup.remove(obj);
		}
		this.previewGroup.visible = false;
	}

	createPreviewMesh() {
		this.clearPreview();
		if (!this.activeItem) return;

		// Build procedural mesh
		const previewMesh = this.activeItem.createMesh(this.activeColor, this.activeMatType);
		
		// Apply glass ghost material to preview mesh recursively
		previewMesh.traverse(child => {
			if (child.isMesh) {
				child.material = new THREE.MeshBasicMaterial({
					color: this.activeColor,
					transparent: true,
					opacity: 0.5,
					wireframe: false
				});
			}
		});

		this.previewGroup.add(previewMesh);
		this.previewGroup.rotation.y = this.currentRotation;
		this.previewGroup.visible = true;
	}

	updatePreviewStyle(color, matType) {
		this.activeColor = color;
		this.activeMatType = matType;
		if (this.activeItem) {
			this.createPreviewMesh();
		}
	}

	// --- Raycasting & Math ---

	getMouseWorldPosition(e) {
		const rect = this.domElement.getBoundingClientRect();
		this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);
		
		// Find intersections with diorama components
		const targets = [];
		this.dioramaGroup.traverse(child => {
			if (child.isMesh) targets.push(child);
		});

		const intersects = this.raycaster.intersectObjects(targets, true);
		
		if (intersects.length > 0) {
			// Find the primary root group object directly under dioramaGroup
			let hitObj = intersects[0].object;
			let rootParent = hitObj;
			while (rootParent.parent && rootParent.parent !== this.dioramaGroup) {
				rootParent = rootParent.parent;
			}
			
			const intersectionPoint = intersects[0].point;
			const normal = intersects[0].face.normal.clone();
			normal.transformDirection(hitObj.matrixWorld); // world normal

			return {
				point: intersectionPoint,
				normal: normal,
				object: rootParent
			};
		} else {
			// Fallback: intersect with infinite desk plane
			const intersectionPoint = new THREE.Vector3();
			this.raycaster.ray.intersectPlane(this.floorPlane, intersectionPoint);
			return {
				point: intersectionPoint,
				normal: new THREE.Vector3(0, 1, 0),
				object: null
			};
		}
	}

	snap(val) {
		if (!this.gridEnabled) return val;
		return Math.round(val / this.gridSize) * this.gridSize;
	}

	// Get target place coordinate, stacking correctly on top of furniture/floors
	calcPlacementPosition(mousePos) {
		let x = this.snap(mousePos.point.x);
		let z = this.snap(mousePos.point.z);
		let y = 0.05; // standard floor height offset

		if (mousePos.object) {
			const item = mousePos.object.userData.catalogItem;
			const pos = mousePos.object.position;

			if (mousePos.normal.y > 0.7) {
				// Clicked on a top face -> stack on top
				y = pos.y + item.height;
			} else if (Math.abs(mousePos.normal.x) > 0.7) {
				// Clicked on side face X -> snap adjacent
				x = this.snap(pos.x + (mousePos.normal.x > 0 ? item.width/2 + this.activeItem.width/2 : -item.width/2 - this.activeItem.width/2));
				y = pos.y;
			} else if (Math.abs(mousePos.normal.z) > 0.7) {
				// Clicked on side face Z -> snap adjacent
				z = this.snap(pos.z + (mousePos.normal.z > 0 ? item.depth/2 + this.activeItem.depth/2 : -item.depth/2 - this.activeItem.depth/2));
				y = pos.y;
			}
		}

		// Keep elements centered inside boundaries of table (-4 to +4)
		const halfW = this.activeItem ? this.activeItem.width / 2 : 0;
		const halfD = this.activeItem ? this.activeItem.depth / 2 : 0;
		x = Math.max(-4 + halfW, Math.min(4 - halfW, x));
		z = Math.max(-4 + halfD, Math.min(4 - halfD, z));
		y = Math.max(0.05, y);

		return new THREE.Vector3(x, y, z);
	}

	// --- Block Operations ---

	placeBlock(position) {
		if (!this.activeItem) return;

		// Create real mesh with shadow settings
		const mesh = this.activeItem.createMesh(this.activeColor, this.activeMatType);
		mesh.position.copy(position);
		mesh.rotation.y = this.currentRotation;

		// Set shadows recursively
		mesh.traverse(child => {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});

		// Attach point light if it is a lamp
		let associatedLight = null;
		if (this.activeItem.id === 'glowing_lamp') {
			const light = new THREE.PointLight('#ffeaad', 0, 4); // intensity updated during Day/Night
			light.position.set(0, 0.36, 0); // inside the glass bulb
			light.castShadow = true;
			light.shadow.bias = -0.002;
			light.shadow.mapSize.width = 512;
			light.shadow.mapSize.height = 512;
			mesh.add(light);
			associatedLight = light;
		}

		// Store custom parameters in userData
		mesh.userData = {
			catalogItem: this.activeItem,
			color: this.activeColor,
			matType: this.activeMatType,
			rotation: this.currentRotation,
			light: associatedLight
		};

		this.dioramaGroup.add(mesh);

		// Play sound based on item type
		if (this.activeItem.sound === 'glass') {
			audio.playPlaceGlass();
		} else {
			audio.playPlaceWood();
		}

		// Clear move metadata upon successful drop
		this.moveOriginalData = null;

		// Trigger active lamp light updates
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	selectBlock(blockMesh) {
		this.deselectBlock();
		this.selectedMesh = blockMesh;
		
		// Update selection Box outline
		this.boxHelper.setFromObject(this.selectedMesh);
		this.boxHelper.visible = true;

		// Dispatch selection change to UI
		this.onSelectionChanged(this.selectedMesh.userData);
	}

	deselectBlock() {
		this.selectedMesh = null;
		this.boxHelper.visible = false;
		this.onSelectionChanged(null);
	}

	pickUpSelected() {
		if (!this.selectedMesh) return;
		const data = this.selectedMesh.userData;
		this.moveOriginalData = {
			item: data.catalogItem,
			color: data.color,
			matType: data.matType,
			rotation: data.rotation,
			position: this.selectedMesh.position.clone()
		};
		// Detach from scene
		this.dioramaGroup.remove(this.selectedMesh);
		this.deselectBlock();
		// Enter place mode
		this.activeItem = this.moveOriginalData.item;
		this.activeColor = this.moveOriginalData.color;
		this.activeMatType = this.moveOriginalData.matType;
		this.currentRotation = this.moveOriginalData.rotation;
		this.createPreviewMesh();
		
		audio.playClick();
		this.onToolChanged(`Moving: ${this.activeItem.name}`);
	}

	cancelMove() {
		if (this.moveOriginalData) {
			const d = this.moveOriginalData;
			// Rebuild and place at original position
			const mesh = d.item.createMesh(d.color, d.matType);
			mesh.position.copy(d.position);
			mesh.rotation.y = d.rotation;
			mesh.traverse(child => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
			if (d.item.id === 'glowing_lamp') {
				const light = new THREE.PointLight('#ffeaad', 0, 4);
				light.position.set(0, 0.36, 0);
				light.castShadow = true;
				mesh.add(light);
				mesh.userData.light = light;
			}
			mesh.userData = {
				catalogItem: d.item,
				color: d.color,
				matType: d.matType,
				rotation: d.rotation,
				light: mesh.userData.light
			};
			this.dioramaGroup.add(mesh);
			this.moveOriginalData = null;
			window.dispatchEvent(new CustomEvent('diorama-changed'));
		}
	}

	setSelectedRotation(rad) {
		if (!this.selectedMesh) return;
		this.selectedMesh.rotation.y = rad;
		this.selectedMesh.userData.rotation = rad;
		this.boxHelper.setFromObject(this.selectedMesh);
		audio.playPlaceWood();
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	rotateActiveBlock(clockwise = true) {
		const step = Math.PI / 4; // 45 degrees
		const dir = clockwise ? 1 : -1;
		
		if (this.activeItem) {
			// Rotating preview block
			this.currentRotation = (this.currentRotation + step * dir + Math.PI * 2) % (Math.PI * 2);
			this.previewGroup.rotation.y = this.currentRotation;
			audio.playClick();
		} else if (this.selectedMesh) {
			// Rotating selected block
			const newRot = (this.selectedMesh.rotation.y + step * dir + Math.PI * 2) % (Math.PI * 2);
			this.selectedMesh.rotation.y = newRot;
			this.selectedMesh.userData.rotation = newRot;
			this.boxHelper.setFromObject(this.selectedMesh);
			audio.playPlaceWood();

			// Dispatch event to update the properties panel rotation display
			this.onSelectionChanged(this.selectedMesh.userData);
		}
	}

	deleteSelected() {
		if (!this.selectedMesh) return;
		
		this.dioramaGroup.remove(this.selectedMesh);
		this.deselectBlock();
		audio.playDelete();
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	updateSelectedColor(hexColor) {
		if (!this.selectedMesh) return;
		
		const item = this.selectedMesh.userData.catalogItem;
		this.selectedMesh.userData.color = hexColor;

		// Rebuild the mesh to apply new texture/color dynamically
		const newMesh = item.createMesh(hexColor, this.selectedMesh.userData.matType);
		newMesh.position.copy(this.selectedMesh.position);
		newMesh.rotation.copy(this.selectedMesh.rotation);

		newMesh.traverse(child => {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});

		// Move pointlight if lamp
		if (this.selectedMesh.userData.light) {
			const light = this.selectedMesh.userData.light;
			light.parent.remove(light);
			newMesh.add(light);
			newMesh.userData.light = light;
		}

		newMesh.userData = { ...this.selectedMesh.userData };

		this.dioramaGroup.remove(this.selectedMesh);
		this.dioramaGroup.add(newMesh);
		this.selectBlock(newMesh);
	}

	updateSelectedMatType(matType) {
		if (!this.selectedMesh) return;

		const item = this.selectedMesh.userData.catalogItem;
		this.selectedMesh.userData.matType = matType;

		const newMesh = item.createMesh(this.selectedMesh.userData.color, matType);
		newMesh.position.copy(this.selectedMesh.position);
		newMesh.rotation.copy(this.selectedMesh.rotation);

		newMesh.traverse(child => {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});

		if (this.selectedMesh.userData.light) {
			const light = this.selectedMesh.userData.light;
			light.parent.remove(light);
			newMesh.add(light);
			newMesh.userData.light = light;
		}

		newMesh.userData = { ...this.selectedMesh.userData };

		this.dioramaGroup.remove(this.selectedMesh);
		this.dioramaGroup.add(newMesh);
		this.selectBlock(newMesh);
	}

	// --- Serialization ---

	serializeScene() {
		const data = [];
		this.dioramaGroup.children.forEach(mesh => {
			const item = mesh.userData.catalogItem;
			data.push({
				id: item.id,
				x: mesh.position.x,
				y: mesh.position.y,
				z: mesh.position.z,
				rotation: mesh.rotation.y,
				color: mesh.userData.color,
				matType: mesh.userData.matType
			});
		});
		return JSON.stringify(data);
	}

	deserializeScene(dataJson) {
		try {
			const data = JSON.parse(dataJson);
			this.clearScene();

			data.forEach(block => {
				const item = catalog.find(i => i.id === block.id);
				if (!item) return;

				const mesh = item.createMesh(block.color, block.matType);
				mesh.position.set(block.x, block.y, block.z);
				mesh.rotation.y = block.rotation;

				mesh.traverse(child => {
					if (child.isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				let associatedLight = null;
				if (item.id === 'glowing_lamp') {
					const light = new THREE.PointLight('#ffeaad', 0, 4);
					light.position.set(0, 0.36, 0);
					light.castShadow = true;
					light.shadow.bias = -0.002;
					mesh.add(light);
					associatedLight = light;
				}

				mesh.userData = {
					catalogItem: item,
					color: block.color,
					matType: block.matType,
					rotation: block.rotation,
					light: associatedLight
				};

				this.dioramaGroup.add(mesh);
			});

			this.deselectBlock();
			window.dispatchEvent(new CustomEvent('diorama-changed'));
			return true;
		} catch (e) {
			console.error("Failed to load scene data", e);
			return false;
		}
	}

	clearScene() {
		while(this.dioramaGroup.children.length > 0) {
			const obj = this.dioramaGroup.children[0];
			this.dioramaGroup.remove(obj);
		}
		this.deselectBlock();
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	// --- Event Binding ---

	setupEvents() {
		// Click to place or inspect
		let isMouseDown = false;
		let startX = 0, startY = 0;

		const onPointerDown = (e) => {
			if (e.target !== this.domElement) return;
			isMouseDown = true;
			startX = e.clientX;
			startY = e.clientY;
		};

		const onPointerUp = (e) => {
			if (!isMouseDown) return;
			isMouseDown = false;

			// If mouse dragged (rotated camera), don't click/place
			const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
			if (dist > 5) return;

			const mousePos = this.getMouseWorldPosition(e);

			if (this.activeItem) {
				// PLACE MODE
				const placePos = this.calcPlacementPosition(mousePos);
				this.placeBlock(placePos);
			} else {
				// SELECT MODE
				if (mousePos.object) {
					this.selectBlock(mousePos.object);
				} else {
					this.deselectBlock();
				}
			}
		};

		// Track mouse move for placement preview
		const onPointerMove = (e) => {
			if (!this.activeItem) return;
			
			const mousePos = this.getMouseWorldPosition(e);
			const placePos = this.calcPlacementPosition(mousePos);
			this.previewGroup.position.copy(placePos);
		};

		// Keyboard event handles
		const onKeyDown = (e) => {
			const key = e.key.toLowerCase();
			
			// Ignore typing in input fields (color pickers, property fields)
			if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
				if (key !== 'escape') return;
			}

			if (key === 'r') {
				// Rotate: clockwise (true) by default, counter-clockwise (false) if Shift held
				this.rotateActiveBlock(!e.shiftKey);
			} else if (key === 'q') {
				// Q for counter-clockwise rotation
				this.rotateActiveBlock(false);
			} else if (key === 'm') {
				// M to pick up/move the selected block
				this.pickUpSelected();
			} else if (key === 'delete' || key === 'backspace') {
				this.deleteSelected();
			} else if (key === 'escape') {
				this.cancelMove();
				this.deselectBlock();
				this.setSelectMode();
			}
		};

		this.domElement.addEventListener('pointerdown', onPointerDown);
		this.domElement.addEventListener('pointerup', onPointerUp);
		this.domElement.addEventListener('pointermove', onPointerMove);
		window.addEventListener('keydown', onKeyDown);
	}
}
