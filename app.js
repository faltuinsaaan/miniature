// Main Coordinator for the Miniature Studio App
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { catalog } from './library.js';
import { templates } from './templates.js';
import { DioramaBuilder } from './builder.js';
import * as audio from './audio.js';

// --- Global App Settings ---
let scene, camera, renderer, controls;
let builder;
let dirLight, ambientLight, deskMesh, gridHelper;

// Day/Night State Management
let isDayMode = true;
const lightingConfig = {
	day: {
		ambientColor: 0xffffff,
		ambientIntensity: 0.7,
		sunColor: 0xfffaf0,
		sunIntensity: 1.4,
		bgColor: '#e3ebe7',
		deskColor: '#a16a38',
		fogColor: 0xe3ebe7
	},
	night: {
		ambientColor: 0x1c2135,
		ambientIntensity: 0.25,
		sunColor: 0x3d4a7a,
		sunIntensity: 0.25,
		bgColor: '#090b11',
		deskColor: '#4a2c11',
		fogColor: 0x090b11
	}
};

// Target interpolation values for smooth transition animations
const currentLighting = {
	ambientIntensity: lightingConfig.day.ambientIntensity,
	sunIntensity: lightingConfig.day.sunIntensity,
	transitionProgress: 0.0
};

// --- Initialization ---

function init() {
	const container = document.getElementById('canvas-container');

	// 1. Scene & Render
	scene = new THREE.Scene();
	scene.background = new THREE.Color(lightingConfig.day.bgColor);
	scene.fog = new THREE.FogExp2(lightingConfig.day.fogColor, 0.04);

	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setSize(container.clientWidth, container.clientHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;
	container.appendChild(renderer.domElement);

	// 2. Camera Setup (Isometric Angle by Default)
	camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
	snapToIsometricView();

	// 3. Orbit Controls
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go under desk
	controls.minDistance = 3;
	controls.maxDistance = 25;

	// 4. Desk (Wooden table) Base
	const deskGeo = new THREE.BoxGeometry(10, 0.5, 10);
	const deskMat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(lightingConfig.day.deskColor),
		roughness: 0.6,
		metalness: 0.1
	});
	deskMesh = new THREE.Mesh(deskGeo, deskMat);
	deskMesh.position.y = -0.25;
	deskMesh.receiveShadow = true;
	scene.add(deskMesh);

	// Grid Helper for base boundary (8x8 grid)
	gridHelper = new THREE.GridHelper(8, 16, '#67a390', '#253d36');
	gridHelper.position.y = 0.001; // Slightly above desk
	scene.add(gridHelper);

	// 5. Lighting Setup
	ambientLight = new THREE.AmbientLight(lightingConfig.day.ambientColor, lightingConfig.day.ambientIntensity);
	scene.add(ambientLight);

	dirLight = new THREE.DirectionalLight(lightingConfig.day.sunColor, lightingConfig.day.sunIntensity);
	dirLight.position.set(6, 10, 5);
	dirLight.castShadow = true;
	dirLight.shadow.bias = -0.001;
	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;
	dirLight.shadow.camera.near = 0.5;
	dirLight.shadow.camera.far = 25;
	
	const d = 6;
	dirLight.shadow.camera.left = -d;
	dirLight.shadow.camera.right = d;
	dirLight.shadow.camera.top = d;
	dirLight.shadow.camera.bottom = -d;
	scene.add(dirLight);

	// 6. Initialize builder
	builder = new DioramaBuilder(
		scene, 
		camera, 
		renderer.domElement,
		onSelectionChanged, 
		onToolChanged
	);

	// Populate item library catalog sidebar
	buildCatalogUI();
	setupUIEvents();

	// Load Preset - Alice Tea Corner on start
	loadTemplate('alice');

	// Show onboarding welcome dialog
	const welcomeDialog = document.getElementById('welcome-dialog');
	welcomeDialog.showModal();

	// Start Render Loop
	animate();
}

// --- Animation Loop & Light Transitions ---

function animate() {
	requestAnimationFrame(animate);

	// Update controls damping
	controls.update();

	// Smoothly interpolate day/night lights
	updateLightTransition();

	// Render frame
	renderer.render(scene, camera);
}

// Linearly interpolate lighting variables for gorgeous transition effect
function updateLightTransition() {
	const speed = 0.05; // transition step speed
	const target = isDayMode ? lightingConfig.day : lightingConfig.night;
	
	// Smooth float transitions
	currentLighting.ambientIntensity += (target.ambientIntensity - currentLighting.ambientIntensity) * speed;
	currentLighting.sunIntensity += (target.sunIntensity - currentLighting.sunIntensity) * speed;

	// Set intensities
	ambientLight.intensity = currentLighting.ambientIntensity;
	dirLight.intensity = currentLighting.sunIntensity;

	// Color interpolations
	ambientLight.color.lerp(new THREE.Color(target.ambientColor), speed);
	dirLight.color.lerp(new THREE.Color(target.sunColor), speed);
	scene.background.lerp(new THREE.Color(target.bgColor), speed);
	scene.fog.color.lerp(new THREE.Color(target.fogColor), speed);
	deskMesh.material.color.lerp(new THREE.Color(target.deskColor), speed);

	// Interpolate active pointlight values inside diorama
	const lampIntensity = isDayMode ? 0.0 : 2.2;
	builder.dioramaGroup.children.forEach(mesh => {
		if (mesh.userData && mesh.userData.light) {
			mesh.userData.light.intensity += (lampIntensity - mesh.userData.light.intensity) * speed;
		}
	});
}

// --- Helper Functions ---

function snapToIsometricView() {
	// Classic 45/30 degree angles for isometric style
	camera.position.set(8, 8, 8);
	camera.lookAt(0, 0, 0);
	if (controls) {
		controls.target.set(0, 0, 0);
	}
}

function onToolChanged(toolName) {
	const indicator = document.getElementById('current-tool-indicator');
	indicator.innerHTML = `<span>Tool: ${toolName}</span>`;
}

// Right Properties Panel Updates
function onSelectionChanged(userData) {
	const propPanel = document.getElementById('properties-panel');
	const emptyState = document.getElementById('no-selection-message');
	const selectDetails = document.getElementById('selection-details');
	
	if (!userData) {
		propPanel.hidden = true;
		emptyState.style.display = 'block';
		selectDetails.style.display = 'none';
		return;
	}

	propPanel.hidden = false;
	emptyState.style.display = 'none';
	selectDetails.style.display = 'flex';

	const item = userData.catalogItem;
	document.getElementById('prop-title').textContent = item.name;
	
	const badge = document.getElementById('prop-category');
	badge.textContent = item.category;
	badge.className = `badge category-${item.category}`;

	// Set properties inputs
	const colorInput = document.getElementById('prop-color');
	colorInput.value = userData.color;
	document.getElementById('prop-color-hex').textContent = userData.color.toUpperCase();

	// Select mat type
	const matSelect = document.getElementById('prop-material');
	matSelect.value = userData.matType;
}

// --- UI Catalog Builders ---

function buildCatalogUI() {
	const catalogContainer = document.getElementById('catalog-list');
	catalogContainer.innerHTML = '';

	const activeTab = document.querySelector('.catalog-tabs .tab-btn.active').dataset.category;

	// Add a default Selection pointer tool
	if (activeTab === 'structure') {
		const selectItem = document.createElement('div');
		selectItem.className = 'catalog-item select-tool-card';
		selectItem.innerHTML = `
			<div class="catalog-item-icon">🫵</div>
			<div class="catalog-item-name">Select Mode</div>
			<div class="catalog-item-size">Inspect/Delete</div>
		`;
		selectItem.addEventListener('click', () => {
			audio.playClick();
			document.querySelectorAll('.catalog-item').forEach(c => c.classList.remove('active'));
			selectItem.classList.add('active');
			builder.setSelectMode();
		});
		catalogContainer.appendChild(selectItem);
	}

	const filtered = catalog.filter(item => item.category === activeTab);
	filtered.forEach(item => {
		const card = document.createElement('div');
		card.className = 'catalog-item';
		card.dataset.id = item.id;
		card.innerHTML = `
			<div class="catalog-item-icon">${item.icon}</div>
			<div class="catalog-item-name">${item.name}</div>
			<div class="catalog-item-size">${item.width}x${item.depth} Grid</div>
		`;

		card.addEventListener('click', () => {
			audio.playClick();
			document.querySelectorAll('.catalog-item').forEach(c => c.classList.remove('active'));
			card.classList.add('active');
			builder.setPlaceMode(item.id);
		});

		catalogContainer.appendChild(card);
	});
}

// --- Save / Load & Templates ---

function loadTemplate(templateKey) {
	const data = templates[templateKey];
	if (!data) return;

	builder.clearScene();
	builder.deserializeScene(JSON.stringify(data));
	audio.playChime();
}

// --- Connect Event Listeners ---

function setupUIEvents() {
	// Sidebar Catalog Category Tabs
	document.querySelectorAll('.catalog-tabs .tab-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			audio.playClick();
			document.querySelectorAll('.catalog-tabs .tab-btn').forEach(b => b.classList.remove('active'));
			e.target.classList.add('active');
			buildCatalogUI();
		});
	});

	// Day / Night Toggle
	const btnDaynight = document.getElementById('btn-daynight');
	btnDaynight.addEventListener('click', () => {
		isDayMode = !isDayMode;
		btnDaynight.classList.toggle('active', !isDayMode);
		
		const iconSpan = btnDaynight.querySelector('.icon');
		const labelSpan = btnDaynight.querySelector('.label');

		if (isDayMode) {
			iconSpan.textContent = '☀️';
			labelSpan.textContent = 'Day Mode';
		} else {
			iconSpan.textContent = '🌙';
			labelSpan.textContent = 'Night Mode';
		}

		audio.playChime();
	});

	// Grid Helper Toggle
	const btnGrid = document.getElementById('btn-grid');
	btnGrid.addEventListener('click', () => {
		builder.gridEnabled = !builder.gridEnabled;
		gridHelper.visible = builder.gridEnabled;
		btnGrid.classList.toggle('active', builder.gridEnabled);
		audio.playClick();
	});

	// Isometric Cam snap
	document.getElementById('btn-camera-iso').addEventListener('click', () => {
		snapToIsometricView();
		audio.playClick();
	});

	// Template select changes
	document.getElementById('template-select').addEventListener('change', (e) => {
		loadTemplate(e.target.value);
	});

	// Manual Save / Load / Clear
	document.getElementById('btn-save').addEventListener('click', () => {
		const json = builder.serializeScene();
		localStorage.setItem('diorama_saved_scene', json);
		audio.playChime();
		alert("Scene saved successfully! 🌿");
	});

	document.getElementById('btn-load').addEventListener('click', () => {
		const json = localStorage.getItem('diorama_saved_scene');
		if (json) {
			builder.deserializeScene(json);
			audio.playChime();
		} else {
			alert("No saved scene found in this browser.");
		}
	});

	document.getElementById('btn-clear').addEventListener('click', () => {
		if (confirm("Reset current diorama baseplate?")) {
			builder.clearScene();
			audio.playDelete();
		}
	});

	// Selected Properties Adjustments
	const propColor = document.getElementById('prop-color');
	propColor.addEventListener('input', (e) => {
		const val = e.target.value;
		document.getElementById('prop-color-hex').textContent = val.toUpperCase();
		builder.updateSelectedColor(val);
	});

	document.getElementById('prop-material').addEventListener('change', (e) => {
		builder.updateSelectedMatType(e.target.value);
	});

	document.getElementById('btn-prop-rotate').addEventListener('click', () => {
		builder.rotateActiveBlock();
	});

	document.getElementById('btn-prop-delete').addEventListener('click', () => {
		builder.deleteSelected();
	});

	// Snapshot rendering photo overlays
	const snapshotDialog = document.getElementById('snapshot-dialog');
	const btnSnapshot = document.getElementById('btn-snapshot');

	btnSnapshot.addEventListener('click', () => {
		// Hide outline helpers temporarily
		builder.boxHelper.visible = false;
		gridHelper.visible = false;
		
		// Hide active placement preview
		builder.previewGroup.visible = false;

		// Force complete lighting calculations render
		renderer.render(scene, camera);

		// Grab image data URL
		const dataUrl = renderer.domElement.toDataURL('image/png');

		// Restore original state
		if (builder.selectedMesh) builder.boxHelper.visible = true;
		if (builder.gridEnabled) gridHelper.visible = true;
		if (builder.activeItem) builder.previewGroup.visible = true;

		// Pop photo modal
		document.getElementById('snapshot-preview').src = dataUrl;
		document.getElementById('snapshot-date').textContent = new Date().toLocaleDateString(undefined, { 
			year: 'numeric', month: 'long', day: 'numeric' 
		});

		audio.playChime();
		snapshotDialog.showModal();
	});

	// Download snapshot handler
	document.getElementById('btn-download-snapshot').addEventListener('click', () => {
		const img = document.getElementById('snapshot-preview');
		const link = document.createElement('a');
		link.download = 'cozy-miniature-diorama.png';
		link.href = img.src;
		link.click();
		audio.playClick();
	});

	// Close Snapshot modals
	const closeSnapshot = () => {
		snapshotDialog.close();
		audio.playClick();
	};
	document.getElementById('btn-close-snapshot').addEventListener('click', closeSnapshot);
	document.getElementById('btn-close-snapshot-foot').addEventListener('click', closeSnapshot);

	// Auto-save diorama state on change
	window.addEventListener('diorama-changed', () => {
		const json = builder.serializeScene();
		localStorage.setItem('diorama_autosave', json);
	});
}

// Window resizing
window.addEventListener('resize', () => {
	const container = document.getElementById('canvas-container');
	if (camera && renderer && container) {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(container.clientWidth, container.clientHeight);
	}
});

// Run Init
window.addEventListener('DOMContentLoaded', init);
