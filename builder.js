// 3D Scene Interaction, Raycasting, Grid Snapping, & Block Placing Logic
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { catalog, createMaterial } from './library.js';
import * as audio from './audio.js';

// Extend Three.js with BVH acceleration
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

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
		this.gridMinX = -4;
		this.gridMaxX = 4;
		this.gridMinZ = -4;
		this.gridMaxZ = 4;
		this.moveOriginalData = null;
		this.draggingHandle = null;

		// Groups & Helpers
		this.dioramaGroup = new THREE.Group();
		this.scene.add(this.dioramaGroup);

		this.previewGroup = new THREE.Group();
		this.scene.add(this.previewGroup);

		this.selectedMesh = null;
		this.boxHelper = new THREE.BoxHelper(new THREE.Mesh(), '#67a390');
		this.boxHelper.visible = false;
		this.scene.add(this.boxHelper);

		// 3D Expand Handles Group
		this.handlesGroup = new THREE.Group();
		this.scene.add(this.handlesGroup);

		// Smart Guides Group
		this.guidesGroup = new THREE.Group();
		this.scene.add(this.guidesGroup);

		// Invisible plane at y=0 for raycast fallback
		this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		// Bind events
		this.createHandles();
		this.setupEvents();
	}

	createHandles() {
		// Clean up existing handles if any
		while(this.handlesGroup.children.length > 0) {
			this.handlesGroup.remove(this.handlesGroup.children[0]);
		}

		const arrowGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
		const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 4);
		const handleMat = new THREE.MeshStandardMaterial({
			color: '#67a390',
			roughness: 0.4,
			metalness: 0.1,
			emissive: '#253d36',
			emissiveIntensity: 0.5
		});

		const dirs = ['east', 'west', 'north', 'south'];
		this.handles = {};

		dirs.forEach(dir => {
			const group = new THREE.Group();
			
			const cone = new THREE.Mesh(arrowGeo, handleMat);
			cone.position.y = 0.2;
			cone.castShadow = true;
			
			const shaft = new THREE.Mesh(shaftGeo, handleMat);
			shaft.position.y = 0.0;
			shaft.castShadow = true;

			group.add(cone, shaft);
			
			// Rotate to point outwards from base center
			if (dir === 'east') {
				group.rotation.z = -Math.PI / 2;
			} else if (dir === 'west') {
				group.rotation.z = Math.PI / 2;
			} else if (dir === 'north') {
				group.rotation.x = -Math.PI / 2;
			} else if (dir === 'south') {
				group.rotation.x = Math.PI / 2;
			}

			group.userData = { isHandle: true, direction: dir };
			this.handles[dir] = group;
			this.handlesGroup.add(group);
		});

		this.updateHandlesPosition();
	}

	updateHandlesPosition() {
		if (!this.handles) return;
		const offset = 0.6; // distance outward from the grid border

		const centerX = (this.gridMinX + this.gridMaxX) / 2;
		const centerZ = (this.gridMinZ + this.gridMaxZ) / 2;

		this.handles['east'].position.set(this.gridMaxX + offset, 0.1, centerZ);
		this.handles['west'].position.set(this.gridMinX - offset, 0.1, centerZ);
		this.handles['north'].position.set(centerX, 0.1, this.gridMinZ - offset);
		this.handles['south'].position.set(centerX, 0.1, this.gridMaxZ + offset);
	}

	setGridLimits(minX, maxX, minZ, maxZ) {
		this.gridMinX = minX;
		this.gridMaxX = maxX;
		this.gridMinZ = minZ;
		this.gridMaxZ = maxZ;
		this.updateHandlesPosition();
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
		this.clearGuides();
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

	clearGuides() {
		if (this.guidesGroup) {
			while(this.guidesGroup.children.length > 0) {
				const obj = this.guidesGroup.children[0];
				this.guidesGroup.remove(obj);
			}
		}
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
			if (child.isMesh) {
				if (child.geometry && !child.geometry.boundsTree) {
					child.geometry.computeBoundsTree();
				}
				targets.push(child);
			}
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
		let y = 0.0; // standard floor height offset

		const placingItem = this.activeItem || (mousePos.object ? mousePos.object.userData.catalogItem : null);

		if (mousePos.object) {
			const item = mousePos.object.userData.catalogItem;
			const pos = mesh => mesh ? mesh.position : mousePos.object.position;
			const targetPos = mousePos.object.position;
			const rot = mousePos.object.rotation.y;

			// Calculate rotated width and depth projections for both clicked and placing items
			const w_clicked = Math.abs(item.width * Math.cos(rot)) + Math.abs(item.depth * Math.sin(rot));
			const d_clicked = Math.abs(item.width * Math.sin(rot)) + Math.abs(item.depth * Math.cos(rot));

			const w_active = this.activeItem ? Math.abs(this.activeItem.width * Math.cos(this.currentRotation)) + Math.abs(this.activeItem.depth * Math.sin(this.currentRotation)) : item.width;
			const d_active = this.activeItem ? Math.abs(this.activeItem.width * Math.sin(this.currentRotation)) + Math.abs(this.activeItem.depth * Math.cos(this.currentRotation)) : item.depth;

			if (mousePos.normal.y > 0.7) {
				// Clicked on a top face -> stack on top
				y = (placingItem && placingItem.id.startsWith('wall_')) ? 0.0 : targetPos.y + item.height;
			} else if (Math.abs(mousePos.normal.x) > 0.7) {
				// Clicked on side face X -> snap adjacent (no snapping on contact X axis)
				x = targetPos.x + (mousePos.normal.x > 0 ? w_clicked/2 + w_active/2 : -w_clicked/2 - w_active/2);
				y = (placingItem && placingItem.id.startsWith('wall_')) ? 0.0 : targetPos.y;
			} else if (Math.abs(mousePos.normal.z) > 0.7) {
				// Clicked on side face Z -> snap adjacent (no snapping on contact Z axis)
				z = targetPos.z + (mousePos.normal.z > 0 ? d_clicked/2 + d_active/2 : -d_clicked/2 - d_active/2);
				y = (placingItem && placingItem.id.startsWith('wall_')) ? 0.0 : targetPos.y;
			}
		}

		// Keep elements centered inside boundaries of table (gridMinX to gridMaxX)
		const gridMinX = this.gridMinX !== undefined ? this.gridMinX : -4;
		const gridMaxX = this.gridMaxX !== undefined ? this.gridMaxX : 4;
		const gridMinZ = this.gridMinZ !== undefined ? this.gridMinZ : -4;
		const gridMaxZ = this.gridMaxZ !== undefined ? this.gridMaxZ : 4;
		let wRotated = 0.5;
		let dRotated = 0.5;
		
		if (this.activeItem) {
			wRotated = Math.abs(this.activeItem.width * Math.cos(this.currentRotation)) + Math.abs(this.activeItem.depth * Math.sin(this.currentRotation));
			dRotated = Math.abs(this.activeItem.width * Math.sin(this.currentRotation)) + Math.abs(this.activeItem.depth * Math.cos(this.currentRotation));
		}
		
		const halfW = wRotated / 2;
		const halfD = dRotated / 2;
		x = Math.max(gridMinX + halfW, Math.min(gridMaxX - halfW, x));
		z = Math.max(gridMinZ + halfD, Math.min(gridMaxZ - halfD, z));
		y = Math.max(0.0, y);

		// SMART GUIDES ALIGNMENT SNAPPING
		this.clearGuides();
		if (this.activeItem) {
			const alignments = [];
			const SMART_SNAP_THRESHOLD = 0.15;
			
			const activeMinX = x - halfW;
			const activeMaxX = x + halfW;
			const activeCenterX = x;
			
			const activeMinZ = z - halfD;
			const activeMaxZ = z + halfD;
			const activeCenterZ = z;

			let snappedX = x;
			let snappedZ = z;
			let hasXSnap = false;
			let hasZSnap = false;

			this.dioramaGroup.children.forEach(mesh => {
				const otherItem = mesh.userData.catalogItem;
				if (!otherItem) return;

				// Skip currently dragging preview/selected object itself if moving
				if (this.selectedMesh && mesh === this.selectedMesh) return;

				const otherBox = new THREE.Box3().setFromObject(mesh);
				const otherMinX = otherBox.min.x;
				const otherMaxX = otherBox.max.x;
				const otherCenterX = (otherMinX + otherMaxX) / 2;

				const otherMinZ = otherBox.min.z;
				const otherMaxZ = otherBox.max.z;
				const otherCenterZ = (otherMinZ + otherMaxZ) / 2;

				// Check X alignments
				if (!hasXSnap) {
					if (Math.abs(activeCenterX - otherCenterX) < SMART_SNAP_THRESHOLD) {
						snappedX = otherCenterX;
						hasXSnap = true;
						alignments.push({ axis: 'x', value: otherCenterX });
					} else if (Math.abs(activeMinX - otherMinX) < SMART_SNAP_THRESHOLD) {
						snappedX = otherMinX + halfW;
						hasXSnap = true;
						alignments.push({ axis: 'x', value: otherMinX });
					} else if (Math.abs(activeMaxX - otherMaxX) < SMART_SNAP_THRESHOLD) {
						snappedX = otherMaxX - halfW;
						hasXSnap = true;
						alignments.push({ axis: 'x', value: otherMaxX });
					} else if (Math.abs(activeMinX - otherMaxX) < SMART_SNAP_THRESHOLD) {
						snappedX = otherMaxX + halfW;
						hasXSnap = true;
						alignments.push({ axis: 'x', value: otherMaxX });
					} else if (Math.abs(activeMaxX - otherMinX) < SMART_SNAP_THRESHOLD) {
						snappedX = otherMinX - halfW;
						hasXSnap = true;
						alignments.push({ axis: 'x', value: otherMinX });
					}
				}

				// Check Z alignments
				if (!hasZSnap) {
					if (Math.abs(activeCenterZ - otherCenterZ) < SMART_SNAP_THRESHOLD) {
						snappedZ = otherCenterZ;
						hasZSnap = true;
						alignments.push({ axis: 'z', value: otherCenterZ });
					} else if (Math.abs(activeMinZ - otherMinZ) < SMART_SNAP_THRESHOLD) {
						snappedZ = otherMinZ + halfD;
						hasZSnap = true;
						alignments.push({ axis: 'z', value: otherMinZ });
					} else if (Math.abs(activeMaxZ - otherMaxZ) < SMART_SNAP_THRESHOLD) {
						snappedZ = otherMaxZ - halfD;
						hasZSnap = true;
						alignments.push({ axis: 'z', value: otherMaxZ });
					} else if (Math.abs(activeMinZ - otherMaxZ) < SMART_SNAP_THRESHOLD) {
						snappedZ = otherMaxZ + halfD;
						hasZSnap = true;
						alignments.push({ axis: 'z', value: otherMaxZ });
					} else if (Math.abs(activeMaxZ - otherMinZ) < SMART_SNAP_THRESHOLD) {
						snappedZ = otherMinZ - halfD;
						hasZSnap = true;
						alignments.push({ axis: 'z', value: otherMinZ });
					}
				}
			});

			if (hasXSnap) x = snappedX;
			if (hasZSnap) z = snappedZ;

			// Draw the neon dashed guides
			alignments.forEach(align => {
				const points = [];
				if (align.axis === 'x') {
					points.push(new THREE.Vector3(align.value, 0.02, gridMinZ));
					points.push(new THREE.Vector3(align.value, 0.02, gridMaxZ));
				} else {
					points.push(new THREE.Vector3(gridMinX, 0.02, align.value));
					points.push(new THREE.Vector3(gridMaxX, 0.02, align.value));
				}

				const geo = new THREE.BufferGeometry().setFromPoints(points);
				const mat = new THREE.LineDashedMaterial({
					color: '#ff2d55', // hot neon pink
					dashSize: 0.15,
					gapSize: 0.1,
					linewidth: 1
				});
				const line = new THREE.Line(geo, mat);
				line.computeLineDistances();
				this.guidesGroup.add(line);
			});
		}



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
		this.clearGuides();

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
		this.clearGuides();
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
			this.clearGuides();
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

	getRotatedDimensions(mesh) {
		const item = mesh.userData.catalogItem;
		if (!item) return { width: 0.5, depth: 0.5 };
		const rot = mesh.rotation.y;
		const wRotated = Math.abs(item.width * Math.cos(rot)) + Math.abs(item.depth * Math.sin(rot));
		const dRotated = Math.abs(item.width * Math.sin(rot)) + Math.abs(item.depth * Math.cos(rot));
		return { width: wRotated, depth: dRotated };
	}

	setSelectedPosX(x) {
		if (!this.selectedMesh) return;
		const dims = this.getRotatedDimensions(this.selectedMesh);
		const halfW = dims.width / 2;
		const clampedX = Math.max(this.gridMinX + halfW, Math.min(this.gridMaxX - halfW, x));
		this.selectedMesh.position.x = clampedX;
		this.boxHelper.setFromObject(this.selectedMesh);
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	setSelectedPosZ(z) {
		if (!this.selectedMesh) return;
		const dims = this.getRotatedDimensions(this.selectedMesh);
		const halfD = dims.depth / 2;
		const clampedZ = Math.max(this.gridMinZ + halfD, Math.min(this.gridMaxZ - halfD, z));
		this.selectedMesh.position.z = clampedZ;
		this.boxHelper.setFromObject(this.selectedMesh);
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	nudgeSelectedPosX(amount) {
		if (!this.selectedMesh) return;
		const curX = this.selectedMesh.position.x;
		this.setSelectedPosX(curX + amount);
		audio.playPlaceWood();
		this.onSelectionChanged(this.selectedMesh.userData);
	}

	nudgeSelectedPosZ(amount) {
		if (!this.selectedMesh) return;
		const curZ = this.selectedMesh.position.z;
		this.setSelectedPosZ(curZ + amount);
		audio.playPlaceWood();
		this.onSelectionChanged(this.selectedMesh.userData);
	}

	setSelectedHeight(y) {
		if (!this.selectedMesh) return;
		const clampedY = Math.max(0.0, Math.min(5.0, y));
		this.selectedMesh.position.y = clampedY;
		this.boxHelper.setFromObject(this.selectedMesh);
		window.dispatchEvent(new CustomEvent('diorama-changed'));
	}

	nudgeSelectedHeight(amount) {
		if (!this.selectedMesh) return;
		const curY = this.selectedMesh.position.y;
		this.setSelectedHeight(curY + amount);
		audio.playPlaceWood();
		// Notify UI to refresh properties panel height display
		this.onSelectionChanged(this.selectedMesh.userData);
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
		const blocks = [];
		this.dioramaGroup.children.forEach(mesh => {
			const item = mesh.userData.catalogItem;
			blocks.push({
				id: item.id,
				x: mesh.position.x,
				y: mesh.position.y,
				z: mesh.position.z,
				rotation: mesh.rotation.y,
				color: mesh.userData.color,
				matType: mesh.userData.matType
			});
		});
		return JSON.stringify({
			gridMinX: this.gridMinX,
			gridMaxX: this.gridMaxX,
			gridMinZ: this.gridMinZ,
			gridMaxZ: this.gridMaxZ,
			blocks: blocks
		});
	}

	deserializeScene(dataJson) {
		try {
			const parsed = JSON.parse(dataJson);
			let blocks = [];
			let gridMinX = -4;
			let gridMaxX = 4;
			let gridMinZ = -4;
			let gridMaxZ = 4;

			if (Array.isArray(parsed)) {
				blocks = parsed;
			} else {
				blocks = parsed.blocks || [];
				if (parsed.gridMinX !== undefined) {
					gridMinX = parsed.gridMinX;
					gridMaxX = parsed.gridMaxX;
					gridMinZ = parsed.gridMinZ;
					gridMaxZ = parsed.gridMaxZ;
				} else {
					const baseSizeX = parsed.baseSizeX || parsed.baseSize || 8;
					const baseSizeZ = parsed.baseSizeZ || parsed.baseSize || 8;
					gridMinX = -baseSizeX / 2;
					gridMaxX = baseSizeX / 2;
					gridMinZ = -baseSizeZ / 2;
					gridMaxZ = baseSizeZ / 2;
				}
			}

			// Reconstruct the base size by triggering event
			window.dispatchEvent(new CustomEvent('baseplate-size-loaded', { detail: { minX: gridMinX, maxX: gridMaxX, minZ: gridMinZ, maxZ: gridMaxZ } }));

			this.clearScene();

			blocks.forEach(block => {
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

	adjustWallCorners() {
		// Find all walls in the diorama
		const walls = this.dioramaGroup.children.filter(mesh => {
			const item = mesh.userData.catalogItem;
			return item && item.id.startsWith('wall_');
		});

		// 1. Reset all walls to their exact snapped grid positions (centers do not shift)
		walls.forEach(mesh => {
			mesh.position.x = Math.round(mesh.position.x / 0.5) * 0.5;
			mesh.position.z = Math.round(mesh.position.z / 0.5) * 0.5;
		});

		// 2. Reset scale and local position of baseboard and crown moulding child meshes
		walls.forEach(mesh => {
			mesh.traverse(child => {
				if (child.name === 'baseboard' || child.name === 'crown_moulding') {
					child.scale.x = 1.0;
					child.position.x = 0.0;
				}
			});
		});

		// 3. For each wall, calculate the required adjustments at its endpoints
		walls.forEach(W => {
			const rotW = W.rotation.y;
			const isW_X = Math.abs(Math.cos(rotW)) > 0.7;

			// Direction along the length of the wall (local X in world space)
			const dirW = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotW);

			// Target local X coordinates for baseboard (bb) and crown moulding (cm)
			// Defaults match the initial mesh width of 4.02
			let L_bb_1 = -2.01;
			let L_bb_2 = 2.01;
			let L_cm_1 = -2.01;
			let L_cm_2 = 2.01;

			// Check both ends (End 1 at local X = -2, End 2 at local X = 2)
			for (let E = 1; E <= 2; E++) {
				const endSign = (E === 1 ? -1 : 1);
				const endPos_world = W.position.clone().addScaledVector(dirW, endSign * 2.0);

				// Look for perpendicular walls meeting this end
				walls.forEach(O => {
					if (O === W) return;

					const rotO = O.rotation.y;
					const isO_X = Math.abs(Math.cos(rotO)) > 0.7;

					if (isW_X !== isO_X) {
						// Perpendicular intersection check
						let intersects = false;
						if (isW_X) {
							// W is X-wall, O is Z-wall
							if (Math.abs(endPos_world.x - O.position.x) < 0.25 && Math.abs(endPos_world.z - O.position.z) <= 2.1) {
								intersects = true;
							}
						} else {
							// W is Z-wall, O is X-wall
							if (Math.abs(endPos_world.z - O.position.z) < 0.25 && Math.abs(endPos_world.x - O.position.x) <= 2.1) {
								intersects = true;
							}
						}

						if (intersects) {
							if (isW_X) {
								// X-wall is the outer wall (extends to outer face of Z-wall)
								if (E === 1) {
									L_cm_1 = -2.11;
									L_bb_1 = -2.10;
								} else {
									L_cm_2 = 2.11;
									L_bb_2 = 2.10;
								}
							} else {
								// Z-wall is the inner wall (stops at inner face of X-wall)
								if (E === 1) {
									L_cm_1 = -1.89;
									L_bb_1 = -1.90;
								} else {
									L_cm_2 = 1.89;
									L_bb_2 = 1.90;
								}
							}
						}
					}
				});
			}

			// Apply scaling and positioning to child meshes
			const W_cm = L_cm_2 - L_cm_1;
			const X_cm = (L_cm_1 + L_cm_2) / 2;
			const scale_cm = W_cm / 4.02;

			const W_bb = L_bb_2 - L_bb_1;
			const X_bb = (L_bb_1 + L_bb_2) / 2;
			const scale_bb = W_bb / 4.02;

			W.traverse(child => {
				if (child.name === 'crown_moulding') {
					child.scale.x = scale_cm;
					child.position.x = X_cm;
				} else if (child.name === 'baseboard') {
					child.scale.x = scale_bb;
					child.position.x = X_bb;
				}
			});
		});
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

			// Raycast handles first
			const rect = this.domElement.getBoundingClientRect();
			this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			this.raycaster.setFromCamera(this.mouse, this.camera);

			const handleIntersects = this.raycaster.intersectObjects(this.handlesGroup.children, true);
			if (handleIntersects.length > 0) {
				let hitHandle = handleIntersects[0].object;
				while (hitHandle.parent && !hitHandle.userData.isHandle) {
					hitHandle = hitHandle.parent;
				}
				if (hitHandle.userData.isHandle) {
					const dir = hitHandle.userData.direction;
					this.draggingHandle = dir;
					window.dispatchEvent(new CustomEvent('handle-drag-start'));
					audio.playClick();
				}
			}
		};

		const onPointerUp = (e) => {
			if (this.draggingHandle) {
				this.draggingHandle = null;
				window.dispatchEvent(new CustomEvent('handle-drag-end'));
				window.dispatchEvent(new CustomEvent('diorama-changed'));
				isMouseDown = false;
				return;
			}

			if (!isMouseDown) return;
			isMouseDown = false;

			// If mouse dragged (rotated camera), don't click/place
			const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
			if (dist > 5) return;

			// Raycast handles first (for standard click fallback)
			const rect = this.domElement.getBoundingClientRect();
			this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			this.raycaster.setFromCamera(this.mouse, this.camera);
			
			const handleIntersects = this.raycaster.intersectObjects(this.handlesGroup.children, true);
			if (handleIntersects.length > 0) {
				let hitHandle = handleIntersects[0].object;
				while (hitHandle.parent && !hitHandle.userData.isHandle) {
					hitHandle = hitHandle.parent;
				}
				if (hitHandle.userData.isHandle) {
					const dir = hitHandle.userData.direction;
					window.dispatchEvent(new CustomEvent('handle-resize-clicked', { detail: dir }));
					return; // Intercepted, do not place or select block!
				}
			}

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
			if (this.draggingHandle) {
				// Drag to resize logic
				const rect = this.domElement.getBoundingClientRect();
				this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
				this.raycaster.setFromCamera(this.mouse, this.camera);

				const intersectionPoint = new THREE.Vector3();
				this.raycaster.ray.intersectPlane(this.floorPlane, intersectionPoint);

				const dir = this.draggingHandle;
				let minX = this.gridMinX;
				let maxX = this.gridMaxX;
				let minZ = this.gridMinZ;
				let maxZ = this.gridMaxZ;

				if (dir === 'east') {
					maxX = Math.max(minX + 4, Math.min(minX + 24, Math.round(intersectionPoint.x / 2) * 2));
				} else if (dir === 'west') {
					minX = Math.min(maxX - 4, Math.max(maxX - 24, Math.round(intersectionPoint.x / 2) * 2));
				} else if (dir === 'north') {
					minZ = Math.min(maxZ - 4, Math.max(maxZ - 24, Math.round(intersectionPoint.z / 2) * 2));
				} else if (dir === 'south') {
					maxZ = Math.max(minZ + 4, Math.min(minZ + 24, Math.round(intersectionPoint.z / 2) * 2));
				}

				window.dispatchEvent(new CustomEvent('baseplate-resized-drag', { detail: { minX, maxX, minZ, maxZ } }));
				return;
			}

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
			} else if (key === 'arrowup') {
				if (this.selectedMesh) {
					e.preventDefault();
					if (e.shiftKey) {
						this.nudgeSelectedPosZ(-0.1);
					} else {
						this.nudgeSelectedHeight(0.1);
					}
				}
			} else if (key === 'arrowdown') {
				if (this.selectedMesh) {
					e.preventDefault();
					if (e.shiftKey) {
						this.nudgeSelectedPosZ(0.1);
					} else {
						this.nudgeSelectedHeight(-0.1);
					}
				}
			} else if (key === 'arrowleft') {
				if (this.selectedMesh) {
					e.preventDefault();
					this.nudgeSelectedPosX(-0.1);
				}
			} else if (key === 'arrowright') {
				if (this.selectedMesh) {
					e.preventDefault();
					this.nudgeSelectedPosX(0.1);
				}
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
		this.domElement.addEventListener('pointerleave', () => this.clearGuides());
		window.addEventListener('keydown', onKeyDown);
	}
}
