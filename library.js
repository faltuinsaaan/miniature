// Asset Library & Procedural 3D Model Builder for Miniature Studio
import * as THREE from 'three';

// --- Dynamic Canvas Texture Generators ---

// Cache textures to avoid rebuilding identical textures
const textureCache = {};

function getCachedTexture(key, drawFn) {
	if (textureCache[key]) return textureCache[key];
	
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');
	
	drawFn(ctx, canvas.width, canvas.height);
	
	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	textureCache[key] = texture;
	return texture;
}

// Generate wood planks texture
export function getWoodTexture(hexColor) {
	return getCachedTexture(`wood_${hexColor}`, (ctx, w, h) => {
		ctx.fillStyle = hexColor;
		ctx.fillRect(0, 0, w, h);
		
		// Wood planks separation lines
		ctx.strokeStyle = 'rgba(0,0,0,0.15)';
		ctx.lineWidth = 2;
		for (let x = 0; x <= w; x += 64) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		
		// Wood grains
		ctx.strokeStyle = 'rgba(0,0,0,0.06)';
		ctx.lineWidth = 1;
		for (let i = 0; i < 20; i++) {
			const x = Math.random() * w;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.bezierCurveTo(
				x + Math.sin(i) * 10, h * 0.25, 
				x - Math.sin(i) * 10, h * 0.75, 
				x + Math.random() * 5, h
			);
			ctx.stroke();
		}
	});
}

// Generate checkerboard texture
export function getCheckerTexture(color1, color2) {
	return getCachedTexture(`checker_${color1}_${color2}`, (ctx, w, h) => {
		const size = 64;
		for (let y = 0; y < h; y += size) {
			for (let x = 0; x < w; x += size) {
				ctx.fillStyle = ((x + y) / size) % 2 === 0 ? color1 : color2;
				ctx.fillRect(x, y, size, size);
				
				// Subtle tiles grout
				ctx.strokeStyle = 'rgba(0,0,0,0.1)';
				ctx.strokeRect(x, y, size, size);
			}
		}
	});
}

// Generate wallpaper (stripes)
export function getWallpaperTexture(baseColor, stripeColor) {
	return getCachedTexture(`wallpaper_${baseColor}_${stripeColor}`, (ctx, w, h) => {
		ctx.fillStyle = baseColor;
		ctx.fillRect(0, 0, w, h);
		
		// Stripes
		ctx.fillStyle = stripeColor;
		const stripeWidth = 16;
		for (let x = 0; x < w; x += stripeWidth * 2) {
			ctx.fillRect(x, 0, stripeWidth, h);
		}
		
		// Subtle vertical lines
		ctx.strokeStyle = 'rgba(255,255,255,0.05)';
		ctx.lineWidth = 1;
		for (let x = 0; x < w; x += 8) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
	});
}

// Generate Roman numerals clock face texture
export function getClockTexture() {
	return getCachedTexture('clock_face', (ctx, w, h) => {
		ctx.fillStyle = '#fcf8f2';
		ctx.fillRect(0, 0, w, h);
		
		const cx = w / 2;
		const cy = h / 2;
		const r = w * 0.4;
		
		// Outer gold rim
		ctx.strokeStyle = '#d4af37';
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.stroke();

		// Inner black rim
		ctx.strokeStyle = '#1a1a1a';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
		ctx.stroke();
		
		// Center dot
		ctx.fillStyle = '#1a1a1a';
		ctx.beginPath();
		ctx.arc(cx, cy, 6, 0, Math.PI * 2);
		ctx.fill();
		
		// Clock numbers (Roman)
		ctx.fillStyle = '#1a1a1a';
		ctx.font = 'bold 22px Times New Roman';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		
		const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
		for (let i = 0; i < 12; i++) {
			const angle = (i * 30 * Math.PI) / 180;
			const nx = cx + Math.sin(angle) * (r - 28);
			const ny = cy - Math.cos(angle) * (r - 28);
			ctx.fillText(numerals[i], nx, ny);
		}
		
		// Hands (pointing to 4 o'clock - tea time!)
		ctx.strokeStyle = '#1a1a1a';
		ctx.lineCap = 'round';
		
		// Hour hand
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		const hrAngle = (120 * Math.PI) / 180;
		ctx.lineTo(cx + Math.sin(hrAngle) * (r * 0.45), cy - Math.cos(hrAngle) * (r * 0.45));
		ctx.stroke();

		// Minute hand
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		const minAngle = (0 * Math.PI) / 180;
		ctx.lineTo(cx + Math.sin(minAngle) * (r * 0.65), cy - Math.cos(minAngle) * (r * 0.65));
		ctx.stroke();
	});
}


// --- Helper Materials Builder ---

export function createMaterial(type, color, texture = null) {
	const params = {
		roughness: 0.8,
		metalness: 0.1
	};
	
	if (texture) {
		params.map = texture;
	} else {
		params.color = new THREE.Color(color);
	}
	
	switch (type) {
		case 'wood':
			params.roughness = 0.6;
			params.metalness = 0.05;
			return new THREE.MeshStandardMaterial(params);
		case 'fabric':
			params.roughness = 0.95;
			params.metalness = 0.0;
			return new THREE.MeshStandardMaterial(params);
		case 'metallic':
			params.color = new THREE.Color(color);
			params.roughness = 0.25;
			params.metalness = 0.9;
			return new THREE.MeshStandardMaterial(params);
		case 'glass':
			return new THREE.MeshPhysicalMaterial({
				color: new THREE.Color(color),
				transparent: true,
				opacity: 0.4,
				transmission: 0.9,
				roughness: 0.1,
				ior: 1.5,
				thickness: 0.5
			});
		case 'glowing':
			return new THREE.MeshBasicMaterial({
				color: new THREE.Color(color),
				toneMapped: false
			});
		case 'matte':
		default:
			params.roughness = 0.75;
			params.metalness = 0.05;
			return new THREE.MeshStandardMaterial(params);
	}
}


// --- Procedural Asset Meshes ---

const geomCache = {};
function getBoxGeometry(w, h, d) {
	const key = `${w}_${h}_${d}`;
	if (!geomCache[key]) {
		geomCache[key] = new THREE.BoxGeometry(w, h, d);
	}
	return geomCache[key];
}

function getCylinderGeometry(rt, rb, h, s) {
	const key = `cyl_${rt}_${rb}_${h}_${s}`;
	if (!geomCache[key]) {
		geomCache[key] = new THREE.CylinderGeometry(rt, rb, h, s);
	}
	return geomCache[key];
}

// 1. Structure: Floors & Walls
function buildFloorWood(color, matType) {
	const group = new THREE.Group();
	const tex = getWoodTexture(color);
	
	// Large base board
	const geo = getBoxGeometry(4, 0.1, 4);
	const mat = createMaterial(matType, color, tex);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.position.y = 0.05;
	group.add(mesh);
	return group;
}

function buildFloorCheckered(color, matType) {
	const group = new THREE.Group();
	const color1 = color;
	const color2 = '#f5f0e6'; // Off-white checkers
	const tex = getCheckerTexture(color1, color2);
	
	const geo = getBoxGeometry(4, 0.1, 4);
	const mat = createMaterial('matte', color, tex);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.position.y = 0.05;
	group.add(mesh);
	return group;
}

function buildWallPlain(color, matType) {
	const group = new THREE.Group();
	const baseTexColor = '#f0e6d2'; // Cream base
	const tex = getWallpaperTexture(baseTexColor, color); // Color determines stripes
	
	// Wall body
	const geo = getBoxGeometry(4, 2.9, 0.15);
	const mat = createMaterial('fabric', color, tex);
	const mesh = new THREE.Mesh(geo, mat);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	mesh.position.y = 1.45;
	group.add(mesh);
	
	// Baseboard wood trim at bottom
	const bbGeo = getBoxGeometry(4.02, 0.15, 0.2);
	const bbMat = createMaterial('wood', '#5c3a21');
	const bbMesh = new THREE.Mesh(bbGeo, bbMat);
	bbMesh.castShadow = true;
	bbMesh.position.set(0, 0.075, 0);
	bbMesh.name = 'baseboard';
	group.add(bbMesh);

	// Crown moulding wood trim at top
	const cmGeo = getBoxGeometry(4.02, 0.1, 0.22);
	const cmMesh = new THREE.Mesh(cmGeo, bbMat);
	cmMesh.castShadow = true;
	cmMesh.position.set(0, 2.95, 0);
	cmMesh.name = 'crown_moulding';
	group.add(cmMesh);

	return group;
}

function buildWallWindow(color, matType) {
	const group = new THREE.Group();
	const wallColor = '#1d6c6e'; // Teal frame matching Alice tea store
	const woodMat = createMaterial('wood', wallColor);
	
	// Procedural frame with window cutout (constructed via boxes)
	// Left post
	const leftGeo = getBoxGeometry(0.8, 3, 0.15);
	const leftMesh = new THREE.Mesh(leftGeo, woodMat);
	leftMesh.position.set(-1.6, 1.5, 0);
	leftMesh.castShadow = true;
	leftMesh.receiveShadow = true;
	group.add(leftMesh);
	
	// Right post
	const rightMesh = leftMesh.clone();
	rightMesh.position.set(1.6, 1.5, 0);
	group.add(rightMesh);

	// Bottom panel
	const bottomGeo = getBoxGeometry(2.4, 0.8, 0.15);
	const bottomMesh = new THREE.Mesh(bottomGeo, woodMat);
	bottomMesh.position.set(0, 0.4, 0);
	bottomMesh.castShadow = true;
	bottomMesh.receiveShadow = true;
	group.add(bottomMesh);

	// Top panel
	const topGeo = getBoxGeometry(2.4, 0.6, 0.15);
	const topMesh = new THREE.Mesh(topGeo, woodMat);
	topMesh.position.set(0, 2.7, 0);
	topMesh.castShadow = true;
	topMesh.receiveShadow = true;
	group.add(topMesh);

	// Center mullions (crossbars)
	const vBarGeo = getBoxGeometry(0.08, 1.3, 0.1);
	const vBar = new THREE.Mesh(vBarGeo, woodMat);
	vBar.position.set(0, 1.65, 0);
	group.add(vBar);

	const hBarGeo = getBoxGeometry(2.4, 0.08, 0.1);
	const hBar = new THREE.Mesh(hBarGeo, woodMat);
	hBar.position.set(0, 1.65, 0);
	group.add(hBar);

	// Window pane glass
	const glassGeo = getBoxGeometry(2.4, 1.3, 0.02);
	const glassMat = createMaterial('glass', '#a6d8e6');
	const glassMesh = new THREE.Mesh(glassGeo, glassMat);
	glassMesh.position.set(0, 1.65, 0);
	group.add(glassMesh);

	// Window flower planter box on the exterior sill
	const boxGeo = getBoxGeometry(1.8, 0.25, 0.4);
	const boxMat = createMaterial('wood', '#5c3a21');
	const boxMesh = new THREE.Mesh(boxGeo, boxMat);
	boxMesh.position.set(0, 0.925, 0.25);
	boxMesh.castShadow = true;
	group.add(boxMesh);

	// Foliage inside box
	const folGeo = getBoxGeometry(1.7, 0.15, 0.3);
	const folMat = createMaterial('matte', '#2e5c1e');
	const folMesh = new THREE.Mesh(folGeo, folMat);
	folMesh.position.set(0, 1.05, 0.25);
	group.add(folMesh);

	// Small procedural roses in window box
	for (let i = -0.7; i <= 0.7; i += 0.35) {
		const roseGeo = new THREE.SphereGeometry(0.08, 4, 4);
		const roseMat = createMaterial('matte', i % 2 === 0 ? '#cc3366' : '#ff99aa');
		const rose = new THREE.Mesh(roseGeo, roseMat);
		rose.position.set(i + (Math.random() - 0.5) * 0.05, 1.15, 0.25 + (Math.random() - 0.5) * 0.05);
		group.add(rose);
	}

	// Baseboard wood trim at bottom
	const bbGeo = getBoxGeometry(4.02, 0.15, 0.2);
	const bbMat = createMaterial('wood', '#5c3a21');
	const bbMesh = new THREE.Mesh(bbGeo, bbMat);
	bbMesh.castShadow = true;
	bbMesh.position.set(0, 0.075, 0);
	bbMesh.name = 'baseboard';
	group.add(bbMesh);

	// Crown moulding wood trim at top
	const cmGeo = getBoxGeometry(4.02, 0.1, 0.22);
	const cmMesh = new THREE.Mesh(cmGeo, bbMat);
	cmMesh.castShadow = true;
	cmMesh.position.set(0, 2.95, 0);
	cmMesh.name = 'crown_moulding';
	group.add(cmMesh);

	return group;
}

// 2. Furniture: Tables, Chairs, Cabinets, Bookshelf
function buildTableDining(color, matType) {
	const group = new THREE.Group();
	const woodMat = createMaterial(matType, color);
	
	// Tabletop
	const topGeo = getBoxGeometry(1.8, 0.08, 1.2);
	const topMesh = new THREE.Mesh(topGeo, woodMat);
	topMesh.position.y = 0.76;
	topMesh.castShadow = true;
	topMesh.receiveShadow = true;
	group.add(topMesh);

	// Legs
	const legGeo = getCylinderGeometry(0.04, 0.03, 0.72, 8);
	for (let x of [-0.75, 0.75]) {
		for (let z of [-0.45, 0.45]) {
			const leg = new THREE.Mesh(legGeo, woodMat);
			leg.position.set(x, 0.36, z);
			leg.castShadow = true;
			group.add(leg);
		}
	}
	return group;
}

function buildChairDining(color, matType) {
	const group = new THREE.Group();
	const frameMat = createMaterial('wood', '#5c3a21');
	const cushionMat = createMaterial(matType, color); // Color applied to seat cushion
	
	// Seat Cushion
	const seatGeo = getBoxGeometry(0.55, 0.06, 0.55);
	const seat = new THREE.Mesh(seatGeo, cushionMat);
	seat.position.y = 0.43;
	seat.castShadow = true;
	seat.receiveShadow = true;
	group.add(seat);

	// Wood seat base border
	const baseGeo = getBoxGeometry(0.57, 0.04, 0.57);
	const base = new THREE.Mesh(baseGeo, frameMat);
	base.position.y = 0.39;
	base.castShadow = true;
	group.add(base);

	// Legs
	const legGeo = getCylinderGeometry(0.03, 0.02, 0.38, 8);
	for (let x of [-0.22, 0.22]) {
		for (let z of [-0.22, 0.22]) {
			const leg = new THREE.Mesh(legGeo, frameMat);
			leg.position.set(x, 0.19, z);
			leg.castShadow = true;
			group.add(leg);
		}
	}

	// Backrest frame
	const postGeo = getBoxGeometry(0.04, 0.5, 0.04);
	const leftPost = new THREE.Mesh(postGeo, frameMat);
	leftPost.position.set(-0.22, 0.65, -0.22);
	leftPost.castShadow = true;
	group.add(leftPost);

	const rightPost = leftPost.clone();
	rightPost.position.x = 0.22;
	group.add(rightPost);

	// Decorative back slatted rails
	const railGeo = getBoxGeometry(0.02, 0.4, 0.02);
	for (let rx of [-0.11, 0, 0.11]) {
		const rail = new THREE.Mesh(railGeo, frameMat);
		rail.position.set(rx, 0.6, -0.22);
		rail.castShadow = true;
		group.add(rail);
	}

	// Backrest top curve headrest
	const topHeadGeo = getBoxGeometry(0.48, 0.1, 0.06);
	const topHead = new THREE.Mesh(topHeadGeo, frameMat);
	topHead.position.set(0, 0.85, -0.22);
	topHead.castShadow = true;
	group.add(topHead);

	return group;
}

function buildCabinetTeaStore(color, matType) {
	const group = new THREE.Group();
	const baseMat = createMaterial('wood', color); // Teal cabinet color
	const darkWoodMat = createMaterial('wood', '#4a2c11'); // Dark brown top
	const goldMat = createMaterial('metallic', '#e5c158');

	// Cabinet base carcass
	const carcassGeo = getBoxGeometry(1.8, 0.75, 0.7);
	const carcass = new THREE.Mesh(carcassGeo, baseMat);
	carcass.position.y = 0.375;
	carcass.castShadow = true;
	carcass.receiveShadow = true;
	group.add(carcass);

	// Cabinet top board (overhanging slightly)
	const topGeo = getBoxGeometry(1.86, 0.05, 0.74);
	const topMesh = new THREE.Mesh(topGeo, darkWoodMat);
	topMesh.position.y = 0.775;
	topMesh.castShadow = true;
	group.add(topMesh);

	// Front decorative drawers (inset details)
	const drawerGeo = getBoxGeometry(0.75, 0.26, 0.03);
	const handleGeo = new THREE.SphereGeometry(0.025, 8, 8);
	
	// Left door
	const leftDoor = new THREE.Mesh(drawerGeo, baseMat);
	leftDoor.position.set(-0.4, 0.45, 0.355);
	leftDoor.scale.set(0.9, 0.9, 1);
	leftDoor.castShadow = true;
	group.add(leftDoor);

	// Left handle
	const handleL = new THREE.Mesh(handleGeo, goldMat);
	handleL.position.set(-0.1, 0.45, 0.375);
	group.add(handleL);

	// Right door
	const rightDoor = leftDoor.clone();
	rightDoor.position.x = 0.4;
	group.add(rightDoor);

	// Right handle
	const handleR = handleL.clone();
	handleR.position.x = 0.1;
	group.add(handleR);

	// Bottom drawers
	const bDrawerGeo = getBoxGeometry(0.75, 0.18, 0.03);
	
	const bDrawerL = new THREE.Mesh(bDrawerGeo, baseMat);
	bDrawerL.position.set(-0.4, 0.18, 0.355);
	bDrawerL.scale.set(0.9, 0.9, 1);
	bDrawerL.castShadow = true;
	group.add(bDrawerL);

	const bHandleL = new THREE.Mesh(handleGeo, goldMat);
	bHandleL.position.set(-0.4, 0.18, 0.375);
	group.add(bHandleL);

	const bDrawerR = bDrawerL.clone();
	bDrawerR.position.x = 0.4;
	group.add(bDrawerR);

	const bHandleR = bHandleL.clone();
	bHandleR.position.x = 0.4;
	group.add(bHandleR);

	// Glass display showcase counter topper
	const glFrameGeo = getBoxGeometry(0.8, 0.4, 0.5);
	const glFrameMat = createMaterial('glass', '#ffffff');
	const glFrame = new THREE.Mesh(glFrameGeo, glFrameMat);
	glFrame.position.set(-0.4, 1.0, 0.0);
	glFrame.castShadow = true;
	group.add(glFrame);

	// Gold frame outlines for display shelf
	const goldTrimH = new THREE.Mesh(getBoxGeometry(0.81, 0.02, 0.02), goldMat);
	goldTrimH.position.set(-0.4, 1.2, 0.25);
	group.add(goldTrimH);
	const goldTrimH2 = goldTrimH.clone();
	goldTrimH2.position.z = -0.25;
	group.add(goldTrimH2);

	const goldTrimV1 = new THREE.Mesh(getBoxGeometry(0.02, 0.4, 0.02), goldMat);
	goldTrimV1.position.set(-0.8, 1.0, 0.25);
	group.add(goldTrimV1);
	const goldTrimV2 = goldTrimV1.clone();
	goldTrimV2.position.x = 0.0;
	group.add(goldTrimV2);

	// Procedural mini cake stand inside the showcase!
	const standBase = new THREE.Mesh(getCylinderGeometry(0.06, 0.08, 0.02, 8), goldMat);
	standBase.position.set(-0.4, 0.81, 0);
	group.add(standBase);
	const standRod = new THREE.Mesh(getCylinderGeometry(0.01, 0.01, 0.22, 6), goldMat);
	standRod.position.set(-0.4, 0.92, 0);
	group.add(standRod);
	const standTier1 = new THREE.Mesh(getCylinderGeometry(0.18, 0.18, 0.01, 10), glFrameMat);
	standTier1.position.set(-0.4, 0.9, 0);
	group.add(standTier1);
	const standTier2 = new THREE.Mesh(getCylinderGeometry(0.12, 0.12, 0.01, 10), glFrameMat);
	standTier2.position.set(-0.4, 1.02, 0);
	group.add(standTier2);

	// Tiny colorful cakes on the stand!
	for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
		const cakeGeo = getCylinderGeometry(0.025, 0.025, 0.03, 6);
		const cakeMat = createMaterial('matte', angle % 2 === 0 ? '#ffb3c1' : '#ffe5ec');
		const cake = new THREE.Mesh(cakeGeo, cakeMat);
		cake.position.set(
			-0.4 + Math.cos(angle) * 0.11,
			0.915,
			Math.sin(angle) * 0.11
		);
		group.add(cake);
	}

	return group;
}

function buildBookshelf(color, matType) {
	const group = new THREE.Group();
	const baseMat = createMaterial(matType, color);
	
	// Carcass outer walls
	const backGeo = getBoxGeometry(1.2, 2.0, 0.1);
	const back = new THREE.Mesh(backGeo, baseMat);
	back.position.set(0, 1.0, -0.15);
	back.castShadow = true;
	back.receiveShadow = true;
	group.add(back);

	const sideLGeo = getBoxGeometry(0.1, 2.0, 0.35);
	const sideL = new THREE.Mesh(sideLGeo, baseMat);
	sideL.position.set(-0.55, 1.0, 0);
	sideL.castShadow = true;
	group.add(sideL);

	const sideR = sideL.clone();
	sideR.position.x = 0.55;
	group.add(sideR);

	// Horizontal shelves
	const shelfGeo = getBoxGeometry(1.0, 0.05, 0.33);
	const shelfMat = createMaterial('wood', '#5c3a21');
	const shelfHeights = [0.1, 0.55, 1.0, 1.45, 1.9];
	for (let h of shelfHeights) {
		const shelf = new THREE.Mesh(shelfGeo, shelfMat);
		shelf.position.set(0, h, 0);
		shelf.castShadow = true;
		shelf.receiveShadow = true;
		group.add(shelf);
	}

	// Populate bookshelf with random colorful books!
	const bookMatColors = ['#9e2a2b', '#3e5c76', '#2b2d42', '#adc178', '#a8dadc', '#e76f51', '#f4a261', '#457b9d'];
	const bookGeo = getBoxGeometry(0.04, 0.32, 0.24);
	
	for (let sy = 0; sy < shelfHeights.length - 1; sy++) {
		const sh = shelfHeights[sy] + 0.025 + 0.16; // resting height
		const count = 7 + Math.floor(Math.random() * 6);
		let startX = -0.42;

		for (let i = 0; i < count; i++) {
			const col = bookMatColors[Math.floor(Math.random() * bookMatColors.length)];
			const mat = createMaterial('fabric', col);
			const book = new THREE.Mesh(bookGeo, mat);
			
			// randomize slant angle or alignment
			if (i === count - 1 && Math.random() > 0.5) {
				book.rotation.z = -0.3; // leaning book!
				book.position.set(startX + 0.05, sh - 0.02, 0);
			} else {
				book.position.set(startX, sh, 0.02 * (Math.random() - 0.5));
			}
			book.castShadow = true;
			group.add(book);
			startX += 0.07;
			if (startX > 0.42) break;
		}
	}

	return group;
}

// 3. Decor: Teapot, Teacup, Wall painting, Flower vase
function buildTeapot(color, matType) {
	const group = new THREE.Group();
	const bodyMat = createMaterial('glass', color); // glass or ceramic color
	const goldMat = createMaterial('metallic', '#d4af37');

	// Teapot body globe
	const bodyGeo = new THREE.SphereGeometry(0.18, 12, 12);
	const body = new THREE.Mesh(bodyGeo, bodyMat);
	body.position.y = 0.18;
	body.castShadow = true;
	group.add(body);

	// Lid
	const lidGeo = getCylinderGeometry(0.1, 0.12, 0.04, 8);
	const lid = new THREE.Mesh(lidGeo, bodyMat);
	lid.position.y = 0.36;
	group.add(lid);
	const knobGeo = new THREE.SphereGeometry(0.03, 8, 8);
	const knob = new THREE.Mesh(knobGeo, goldMat);
	knob.position.y = 0.395;
	group.add(knob);

	// Spout
	const spoutGeo = getCylinderGeometry(0.03, 0.04, 0.18, 8);
	const spout = new THREE.Mesh(spoutGeo, bodyMat);
	spout.position.set(0.18, 0.22, 0);
	spout.rotation.z = -Math.PI / 4;
	spout.castShadow = true;
	group.add(spout);

	// Handle
	const handleGeo = new THREE.TorusGeometry(0.1, 0.025, 8, 16);
	const handle = new THREE.Mesh(handleGeo, goldMat);
	handle.position.set(-0.18, 0.22, 0);
	group.add(handle);

	// Stand coaster base
	const baseGeo = getCylinderGeometry(0.12, 0.12, 0.02, 8);
	const base = new THREE.Mesh(baseGeo, goldMat);
	base.position.y = 0.01;
	group.add(base);

	return group;
}

function buildTeacup(color, matType) {
	const group = new THREE.Group();
	const cupMat = createMaterial('matte', color);
	const teaMat = createMaterial('matte', '#8B4513'); // Tea liquid
	
	// Cup Body
	const cupGeo = getCylinderGeometry(0.08, 0.05, 0.09, 8);
	const cup = new THREE.Mesh(cupGeo, cupMat);
	cup.position.y = 0.045;
	cup.castShadow = true;
	group.add(cup);

	// Cup tea inside
	const teaGeo = getCylinderGeometry(0.07, 0.06, 0.01, 8);
	const tea = new THREE.Mesh(teaGeo, teaMat);
	tea.position.y = 0.08;
	group.add(tea);

	// Saucer plate
	const saucerGeo = getCylinderGeometry(0.12, 0.08, 0.015, 8);
	const saucer = new THREE.Mesh(saucerGeo, cupMat);
	saucer.position.y = 0.007;
	saucer.castShadow = true;
	group.add(saucer);

	// Tiny handle
	const handleGeo = new THREE.TorusGeometry(0.03, 0.01, 6, 12);
	const handle = new THREE.Mesh(handleGeo, cupMat);
	handle.position.set(-0.07, 0.05, 0);
	group.add(handle);

	return group;
}

function buildWallPainting(color, matType) {
	const group = new THREE.Group();
	const goldMat = createMaterial('metallic', '#d4af37'); // Ornate gold frame
	
	// Frame outer
	const frameGeo = getBoxGeometry(1.1, 1.4, 0.06);
	const frame = new THREE.Mesh(frameGeo, goldMat);
	frame.position.z = -0.01;
	frame.castShadow = true;
	group.add(frame);

	// Dial clock or decorative pattern texture
	const canvasTex = getClockTexture();
	const artGeo = getBoxGeometry(0.9, 1.2, 0.08);
	const artMat = createMaterial('matte', color, canvasTex);
	const art = new THREE.Mesh(artGeo, artMat);
	art.receiveShadow = true;
	group.add(art);

	return group;
}

function buildFlowerVase(color, matType) {
	const group = new THREE.Group();
	const glassMat = createMaterial('glass', '#e3f2fd');
	const waterMat = createMaterial('glass', '#b3e5fc');
	const leafMat = createMaterial('matte', '#4caf50');
	const roseMat = createMaterial('fabric', color);

	// Vase body (fluted shape)
	const bottomVase = new THREE.Mesh(getCylinderGeometry(0.12, 0.08, 0.35, 10), glassMat);
	bottomVase.position.y = 0.175;
	bottomVase.castShadow = true;
	group.add(bottomVase);

	// Water level
	const water = new THREE.Mesh(getCylinderGeometry(0.11, 0.085, 0.2, 8), waterMat);
	water.position.y = 0.1;
	group.add(water);

	// Green stems
	const stemGeo = getCylinderGeometry(0.01, 0.01, 0.5, 6);
	for (let angle of [-0.2, 0, 0.2]) {
		const stem = new THREE.Mesh(stemGeo, leafMat);
		stem.position.set(angle * 0.4, 0.3, 0);
		stem.rotation.z = angle;
		group.add(stem);
	}

	// Tiny rose spheres
	const roseGeo = new THREE.SphereGeometry(0.065, 5, 5);
	const positions = [
		[-0.09, 0.52, 0.02],
		[0.0, 0.56, 0.0],
		[0.09, 0.51, -0.02]
	];
	for (let pos of positions) {
		const rose = new THREE.Mesh(roseGeo, roseMat);
		rose.position.set(pos[0], pos[1], pos[2]);
		rose.castShadow = true;
		group.add(rose);
	}

	return group;
}

// 4. Special Figures: White Rabbit
function buildWhiteRabbit(color, matType) {
	const group = new THREE.Group();
	const whiteMat = createMaterial('matte', '#fafafa'); // fluffy white rabbit
	const pinkMat = createMaterial('matte', '#ffccd5'); // ears pink inside
	const coatMat = createMaterial('fabric', color); // Coat color (red or royal blue)
	const blackMat = createMaterial('matte', '#1a1a1a'); // eyes
	const goldMat = createMaterial('metallic', '#e5c158'); // trumpet

	// Body globe
	const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), coatMat);
	body.position.y = 0.3;
	body.scale.set(1, 1.2, 1);
	body.castShadow = true;
	body.receiveShadow = true;
	group.add(body);

	// White collar ruffle disc
	const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), whiteMat);
	collar.position.y = 0.46;
	collar.rotation.x = Math.PI / 2;
	group.add(collar);

	// Head globe
	const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), whiteMat);
	head.position.y = 0.62;
	head.castShadow = true;
	group.add(head);

	// Cheeks muzzle
	const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), whiteMat);
	muzzle.position.set(0, 0.58, 0.14);
	group.add(muzzle);
	
	const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), pinkMat);
	nose.position.set(0, 0.61, 0.18);
	group.add(nose);

	// Eyes (tiny beads)
	const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), blackMat);
	eye.position.set(-0.06, 0.65, 0.14);
	group.add(eye);
	const eyeR = eye.clone();
	eyeR.position.x = 0.06;
	group.add(eyeR);

	// Ears (long capsules)
	const earOuterGeo = getBoxGeometry(0.06, 0.28, 0.04);
	const earInnerGeo = getBoxGeometry(0.04, 0.22, 0.01);

	// Left Ear Group
	const earLGroup = new THREE.Group();
	const earLOuter = new THREE.Mesh(earOuterGeo, whiteMat);
	earLOuter.castShadow = true;
	const earLInner = new THREE.Mesh(earInnerGeo, pinkMat);
	earLInner.position.z = 0.021;
	earLGroup.add(earLOuter, earLInner);
	earLGroup.position.set(-0.07, 0.82, -0.02);
	earLGroup.rotation.z = 0.15;
	group.add(earLGroup);

	// Right Ear Group
	const earRGroup = new THREE.Group();
	const earROuter = new THREE.Mesh(earOuterGeo, whiteMat);
	earROuter.castShadow = true;
	const earRInner = new THREE.Mesh(earInnerGeo, pinkMat);
	earRInner.position.z = 0.021;
	earRGroup.add(earROuter, earRInner);
	earRGroup.position.set(0.07, 0.82, -0.02);
	earRGroup.rotation.z = -0.15;
	group.add(earRGroup);

	// White Rabbit Tail fluff
	const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), whiteMat);
	tail.position.set(0, 0.22, -0.22);
	group.add(tail);

	// Little gold herald trumpet in his hand!
	const trumpTube = new THREE.Mesh(getCylinderGeometry(0.015, 0.015, 0.35, 6), goldMat);
	trumpTube.position.set(0.12, 0.46, 0.18);
	trumpTube.rotation.set(Math.PI / 3, 0.1, -Math.PI / 6);
	trumpTube.castShadow = true;
	group.add(trumpTube);

	const trumpBell = new THREE.Mesh(getCylinderGeometry(0.06, 0.015, 0.08, 8), goldMat);
	trumpBell.position.copy(trumpTube.position).add(new THREE.Vector3(0.05, 0.085, 0.14));
	trumpBell.rotation.copy(trumpTube.rotation);
	trumpBell.castShadow = true;
	group.add(trumpBell);

	// Arms (paws) holding the horn
	const armL = new THREE.Mesh(getBoxGeometry(0.06, 0.16, 0.06), whiteMat);
	armL.position.set(-0.16, 0.42, 0.08);
	armL.rotation.set(-0.2, 0.2, 0);
	group.add(armL);

	const armR = new THREE.Mesh(getBoxGeometry(0.06, 0.16, 0.06), whiteMat);
	armR.position.set(0.12, 0.44, 0.08);
	armR.rotation.set(-0.5, -0.5, 0);
	group.add(armR);

	// Feet
	const footGeo = getBoxGeometry(0.09, 0.06, 0.18);
	const footL = new THREE.Mesh(footGeo, whiteMat);
	footL.position.set(-0.1, 0.03, 0.06);
	footL.castShadow = true;
	group.add(footL);

	const footR = footL.clone();
	footR.position.x = 0.1;
	group.add(footR);

	return group;
}

// 5. Lights: Glowing Desk Sconce / Miniature Lantern
function buildGlowingLamp(color, matType) {
	const group = new THREE.Group();
	const brassMat = createMaterial('metallic', '#cfa74e');
	const glowMat = createMaterial('glowing', '#ffeaad'); // warm bulb
	const glassMat = createMaterial('glass', '#ffffff');

	// Lantern base stand
	const baseGeo = getCylinderGeometry(0.18, 0.18, 0.04, 8);
	const base = new THREE.Mesh(baseGeo, brassMat);
	base.position.y = 0.02;
	base.castShadow = true;
	group.add(base);

	// Stent/Pole
	const poleGeo = getCylinderGeometry(0.02, 0.02, 0.45, 6);
	const pole = new THREE.Mesh(poleGeo, brassMat);
	pole.position.y = 0.245;
	pole.castShadow = true;
	group.add(pole);

	// Lantern top lid dome
	const topCapGeo = getCylinderGeometry(0.2, 0.2, 0.03, 8);
	const topCap = new THREE.Mesh(topCapGeo, brassMat);
	topCap.position.y = 0.475;
	topCap.castShadow = true;
	group.add(topCap);
	
	const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 12), brassMat);
	topRing.position.y = 0.51;
	group.add(topRing);

	// Glass enclosure cylinder
	const glassGeo = getCylinderGeometry(0.12, 0.12, 0.2, 8);
	const glass = new THREE.Mesh(glassGeo, glassMat);
	glass.position.y = 0.36;
	group.add(glass);

	// Internal glowing bulb
	const bulbGeo = new THREE.SphereGeometry(0.06, 8, 8);
	const bulb = new THREE.Mesh(bulbGeo, glowMat);
	bulb.position.y = 0.36;
	group.add(bulb);

	// Thin vertical protective metal wires
	const wireGeo = getCylinderGeometry(0.008, 0.008, 0.2, 4);
	for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
		const wire = new THREE.Mesh(wireGeo, brassMat);
		wire.position.set(
			Math.cos(angle) * 0.13,
			0.36,
			Math.sin(angle) * 0.13
		);
		group.add(wire);
	}

	return group;
}

// Opened Vintage Book (Scholar Family)
function buildOpenedBook(color, matType) {
	const group = new THREE.Group();
	const coverMat = createMaterial('wood', color);
	const pageMat = createMaterial('matte', '#faf5eb');
	const ribbonMat = createMaterial('fabric', '#b31b1b');

	// Spine cylinder
	const spine = new THREE.Mesh(getCylinderGeometry(0.04, 0.04, 0.45, 8), coverMat);
	spine.rotation.x = Math.PI / 2;
	spine.position.y = 0.03;
	group.add(spine);

	// Left cover slant
	const coverL = new THREE.Mesh(getBoxGeometry(0.24, 0.02, 0.45), coverMat);
	coverL.position.set(-0.13, 0.03, 0);
	coverL.rotation.z = -0.08;
	coverL.castShadow = true;
	coverL.receiveShadow = true;
	group.add(coverL);

	// Right cover slant
	const coverR = new THREE.Mesh(getBoxGeometry(0.24, 0.02, 0.45), coverMat);
	coverR.position.set(0.13, 0.03, 0);
	coverR.rotation.z = 0.08;
	coverR.castShadow = true;
	coverR.receiveShadow = true;
	group.add(coverR);

	// Left layered pages
	for (let i = 0; i < 3; i++) {
		const page = new THREE.Mesh(getBoxGeometry(0.22, 0.015, 0.43), pageMat);
		page.position.set(-0.12, 0.045 + i * 0.012, 0);
		page.rotation.z = -0.08 + i * 0.01;
		page.castShadow = true;
		group.add(page);
	}

	// Right layered pages
	for (let i = 0; i < 3; i++) {
		const page = new THREE.Mesh(getBoxGeometry(0.22, 0.015, 0.43), pageMat);
		page.position.set(0.12, 0.045 + i * 0.012, 0);
		page.rotation.z = 0.08 - i * 0.01;
		page.castShadow = true;
		group.add(page);
	}

	// Book ribbon
	const ribbon = new THREE.Mesh(getBoxGeometry(0.024, 0.01, 0.46), ribbonMat);
	ribbon.position.set(0.04, 0.075, 0.01);
	ribbon.rotation.z = 0.05;
	group.add(ribbon);

	return group;
}

// Hanging Ivy Plant (Nature Family)
function buildHangingIvy(color, matType) {
	const group = new THREE.Group();
	const woodMat = createMaterial('wood', '#5c3a21');
	const potMat = createMaterial('matte', '#d27d2d');
	const vineMat = createMaterial('fabric', color);
	const stringMat = createMaterial('matte', '#8e7966');

	// Bracket base
	const backplate = new THREE.Mesh(getBoxGeometry(0.06, 0.35, 0.04), woodMat);
	backplate.position.set(0, 0.8, -0.18);
	backplate.castShadow = true;
	group.add(backplate);

	// Peg extending forward
	const peg = new THREE.Mesh(getCylinderGeometry(0.015, 0.015, 0.22, 6), woodMat);
	peg.rotation.x = Math.PI / 2;
	peg.position.set(0, 0.9, -0.08);
	peg.castShadow = true;
	group.add(peg);

	// Hanging pot
	const pot = new THREE.Mesh(getCylinderGeometry(0.1, 0.07, 0.14, 8), potMat);
	pot.position.set(0, 0.65, 0);
	pot.castShadow = true;
	group.add(pot);

	// Supporting ropes
	const ropeL = new THREE.Mesh(getCylinderGeometry(0.004, 0.004, 0.26, 4), stringMat);
	ropeL.position.set(-0.06, 0.78, 0);
	ropeL.rotation.z = -0.22;
	group.add(ropeL);

	const ropeR = new THREE.Mesh(getCylinderGeometry(0.004, 0.004, 0.26, 4), stringMat);
	ropeR.position.set(0.06, 0.78, 0);
	ropeR.rotation.z = 0.22;
	group.add(ropeR);

	// Cascading organic leaf spheres
	const leavesCount = 14;
	for (let i = 0; i < leavesCount; i++) {
		const progress = i / (leavesCount - 1);
		const y = 0.62 - progress * 0.7;
		const x = Math.sin(i * 1.5) * 0.08 * (1.0 - progress * 0.5);
		const z = 0.05 + Math.cos(i * 1.5) * 0.04 + progress * 0.06;
		const size = 0.07 * (1.1 - progress * 0.6) * (0.8 + Math.random() * 0.4);
		
		const leaf = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), vineMat);
		leaf.position.set(x, y, z);
		leaf.castShadow = true;
		group.add(leaf);
	}

	return group;
}

// Mechanical Grandfather Clock (Mechanical Family)
function buildGearClock(color, matType) {
	const group = new THREE.Group();
	const woodMat = createMaterial('wood', color);
	const goldMat = createMaterial('metallic', '#d4af37');
	const faceMat = new THREE.MeshBasicMaterial({ map: getClockTexture() });
	const glassMat = createMaterial('glass', '#ffffff');

	// Bottom cabinet block
	const base = new THREE.Mesh(getBoxGeometry(0.7, 0.25, 0.42), woodMat);
	base.position.y = 0.125;
	base.castShadow = true;
	base.receiveShadow = true;
	group.add(base);

	// Middle column frame
	const body = new THREE.Mesh(getBoxGeometry(0.58, 1.15, 0.36), woodMat);
	body.position.y = 0.825;
	body.castShadow = true;
	body.receiveShadow = true;
	group.add(body);

	// Gold Pendulum
	const penStand = new THREE.Mesh(getCylinderGeometry(0.01, 0.01, 0.65, 4), goldMat);
	penStand.position.set(0, 0.85, 0.1);
	group.add(penStand);

	const penBob = new THREE.Mesh(getCylinderGeometry(0.08, 0.08, 0.02, 8), goldMat);
	penBob.rotation.x = Math.PI / 2;
	penBob.position.set(0, 0.55, 0.1);
	penBob.castShadow = true;
	group.add(penBob);

	// Front door glass
	const glass = new THREE.Mesh(getBoxGeometry(0.42, 0.9, 0.02), glassMat);
	glass.position.set(0, 0.85, 0.185);
	group.add(glass);

	// Hood block
	const hood = new THREE.Mesh(getBoxGeometry(0.64, 0.55, 0.4), woodMat);
	hood.position.y = 1.675;
	hood.castShadow = true;
	hood.receiveShadow = true;
	group.add(hood);

	// Top trim crown
	const crown = new THREE.Mesh(getBoxGeometry(0.68, 0.08, 0.44), woodMat);
	crown.position.y = 1.95;
	crown.castShadow = true;
	group.add(crown);

	const crownSphere = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), goldMat);
	crownSphere.position.set(0, 2.03, 0.1);
	crownSphere.castShadow = true;
	group.add(crownSphere);

	// Clock face disc
	const dial = new THREE.Mesh(getCylinderGeometry(0.21, 0.21, 0.02, 16), faceMat);
	dial.rotation.x = Math.PI / 2;
	dial.position.set(0, 1.675, 0.201);
	dial.castShadow = true;
	group.add(dial);

	return group;
}

// Tailor's Dress Form (Craft Family)
function buildDressForm(color, matType) {
	const group = new THREE.Group();
	const woodMat = createMaterial('wood', '#5c3a21');
	const metalMat = createMaterial('metallic', '#9e9e9e');
	const fabricMat = createMaterial('fabric', color);

	// Wooden stand base
	const base = new THREE.Mesh(getCylinderGeometry(0.18, 0.18, 0.04, 8), woodMat);
	base.position.y = 0.02;
	base.castShadow = true;
	base.receiveShadow = true;
	group.add(base);

	const feet1 = new THREE.Mesh(getBoxGeometry(0.06, 0.06, 0.35), woodMat);
	feet1.position.set(0, 0.03, 0);
	feet1.castShadow = true;
	group.add(feet1);

	const feet2 = new THREE.Mesh(getBoxGeometry(0.35, 0.06, 0.06), woodMat);
	feet2.position.set(0, 0.03, 0);
	feet2.castShadow = true;
	group.add(feet2);

	// Stand rod
	const post = new THREE.Mesh(getCylinderGeometry(0.015, 0.015, 0.95, 6), metalMat);
	post.position.y = 0.5;
	post.castShadow = true;
	group.add(post);

	// Torso fabric form (Hips, Waist, Chest)
	const hips = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), fabricMat);
	hips.position.y = 0.95;
	hips.scale.set(1.05, 0.8, 1);
	hips.castShadow = true;
	group.add(hips);

	const waist = new THREE.Mesh(getCylinderGeometry(0.11, 0.15, 0.28, 10), fabricMat);
	waist.position.y = 1.15;
	waist.castShadow = true;
	group.add(waist);

	const chest = new THREE.Mesh(new THREE.SphereGeometry(0.165, 12, 12), fabricMat);
	chest.position.y = 1.34;
	chest.scale.set(1.15, 0.95, 0.85);
	chest.castShadow = true;
	group.add(chest);

	// Neck details
	const neck = new THREE.Mesh(getCylinderGeometry(0.045, 0.045, 0.1, 8), woodMat);
	neck.position.y = 1.48;
	neck.castShadow = true;
	group.add(neck);

	const neckFinial = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), woodMat);
	neckFinial.position.set(0, 1.54, 0);
	neckFinial.castShadow = true;
	group.add(neckFinial);

	return group;
}

function buildRoadCobble(color, matType) {
	const group = new THREE.Group();
	
	// Dirt/Grout Base
	const baseColor = '#4a3d31'; // Earthy dark brown/grey dirt grout
	const baseMat = createMaterial('matte', baseColor);
	const baseGeo = getBoxGeometry(4, 0.08, 4);
	const base = new THREE.Mesh(baseGeo, baseMat);
	base.position.y = 0.04;
	base.receiveShadow = true;
	group.add(base);

	// Let's place cobblestones in a running bond pattern (offset rows)
	const stoneColor = new THREE.Color(color);
	
	let seed = 77;
	function random() {
		let x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	}

	const rows = 8;
	const cols = 8;
	const spacingX = 4.0 / cols;
	const spacingZ = 4.0 / rows;

	const stoneSphereGeo = new THREE.SphereGeometry(0.5, 8, 6);

	for (let r = 0; r < rows; r++) {
		const rowOffset = (r % 2 === 0) ? spacingX * 0.5 : 0;
		for (let c = 0; c < cols + 1; c++) {
			const px = -2.0 + c * spacingX - rowOffset + (random() - 0.5) * 0.08;
			const pz = -2.0 + r * spacingZ + (random() - 0.5) * 0.08;

			if (px < -1.95 || px > 1.95 || pz < -1.95 || pz > 1.95) continue;

			const radX = spacingX * (0.38 + random() * 0.14);
			const radZ = spacingZ * (0.38 + random() * 0.14);
			const radY = 0.06 + random() * 0.04;

			const shade = 0.85 + random() * 0.3;
			const cColor = stoneColor.clone().multiplyScalar(shade);
			
			cColor.r = Math.max(0, Math.min(1, cColor.r + (random() - 0.5) * 0.08));
			cColor.g = Math.max(0, Math.min(1, cColor.g + (random() - 0.5) * 0.08));
			cColor.b = Math.max(0, Math.min(1, cColor.b + (random() - 0.5) * 0.08));

			const sMat = createMaterial('matte', '#' + cColor.getHexString());
			const stone = new THREE.Mesh(stoneSphereGeo, sMat);
			
			stone.scale.set(radX * 2.0, radY * 2.0, radZ * 2.0);
			stone.position.set(px, 0.08, pz);
			stone.rotation.y = (random() - 0.5) * 0.3;
			
			stone.castShadow = true;
			stone.receiveShadow = true;
			group.add(stone);
		}
	}

	// Add tiny moss/grass patches in the cracks for that premium handcrafted touch!
	const mossMat = createMaterial('fabric', '#5c8043');
	const mossGeo = new THREE.SphereGeometry(0.2, 5, 4);

	for (let i = 0; i < 20; i++) {
		const mx = (random() - 0.5) * 3.6;
		const mz = (random() - 0.5) * 3.6;
		
		const moss = new THREE.Mesh(mossGeo, mossMat);
		const size = 0.4 + random() * 0.6;
		moss.scale.set(size, 0.05 + random() * 0.05, size);
		moss.position.set(mx, 0.08, mz);
		
		moss.castShadow = true;
		group.add(moss);
	}

	return group;
}

function buildPathStepping(color, matType) {
	const group = new THREE.Group();
	
	const baseColor = '#3b4f2c'; // Mossy green
	const baseMat = createMaterial('fabric', baseColor);
	const baseGeo = getBoxGeometry(1.6, 0.02, 4);
	const base = new THREE.Mesh(baseGeo, baseMat);
	base.position.y = 0.01;
	base.receiveShadow = true;
	group.add(base);

	const stones = [
		{ z: -1.6, x: -0.2, r: 0.4 },
		{ z: -0.9, x: 0.2, r: 0.45 },
		{ z: -0.1, x: -0.1, r: 0.38 },
		{ z: 0.7, x: 0.3, r: 0.42 },
		{ z: 1.5, x: -0.2, r: 0.44 }
	];
	
	let seed = 100;
	function random() {
		let x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	}

	stones.forEach((s, idx) => {
		const stoneGeo = getCylinderGeometry(s.r, s.r * 0.95, 0.04, 7);
		
		const shade = 0.8 + random() * 0.4;
		const cColor = new THREE.Color(color).clone().multiplyScalar(shade);
		const cMat = createMaterial('matte', '#' + cColor.getHexString());
		
		const stone = new THREE.Mesh(stoneGeo, cMat);
		stone.position.set(s.x, 0.02 + 0.02, s.z);
		stone.rotation.y = random() * Math.PI * 2;
		stone.rotation.x = (random() - 0.5) * 0.05;
		stone.rotation.z = (random() - 0.5) * 0.05;
		
		stone.castShadow = true;
		stone.receiveShadow = true;
		group.add(stone);
	});
	
	return group;
}

function buildBridgeArch(color, matType) {
	const group = new THREE.Group();
	const woodMat = createMaterial(matType, color);
	const stoneMat = createMaterial('matte', '#4a4a4a');
	const ropeColor = '#8c704f';
	const ropeMat = createMaterial('matte', ropeColor);

	const endGeo = getBoxGeometry(1.8, 0.2, 0.5);
	const end1 = new THREE.Mesh(endGeo, stoneMat);
	end1.position.set(0, 0.1, -1.8);
	end1.castShadow = true;
	end1.receiveShadow = true;
	group.add(end1);

	const end2 = end1.clone();
	end2.position.set(0, 0.1, 1.8);
	group.add(end2);

	const numPlanks = 12;
	const planksGroup = new THREE.Group();
	
	for (let i = 0; i <= numPlanks; i++) {
		const t = i / numPlanks;
		const z = -1.8 + t * 3.6;
		const y = 0.18 + 0.38 * (1.0 - Math.pow((z / 1.8), 2));
		
		const plankGeo = getBoxGeometry(1.6, 0.06, 0.26);
		const plank = new THREE.Mesh(plankGeo, woodMat);
		plank.position.set(0, y, z);
		
		const slope = -0.76 * z / 3.24;
		plank.rotation.x = Math.atan(slope);
		
		plank.castShadow = true;
		plank.receiveShadow = true;
		planksGroup.add(plank);
	}
	group.add(planksGroup);

	const sideX = 0.76;
	const postZPositions = [-1.7, -0.6, 0.6, 1.7];
	const postsGroup = new THREE.Group();
	
	const postGeo = getCylinderGeometry(0.04, 0.04, 0.7, 8);

	const leftPosts = [];
	const rightPosts = [];

	postZPositions.forEach(z => {
		const y_base = 0.18 + 0.38 * (1.0 - Math.pow((z / 1.8), 2));
		const y_post = y_base + 0.35;

		const lp = new THREE.Mesh(postGeo, woodMat);
		lp.position.set(-sideX, y_post, z);
		lp.castShadow = true;
		postsGroup.add(lp);
		leftPosts.push(new THREE.Vector3(-sideX, y_base + 0.58, z));

		const rp = new THREE.Mesh(postGeo, woodMat);
		rp.position.set(sideX, y_post, z);
		rp.castShadow = true;
		postsGroup.add(rp);
		rightPosts.push(new THREE.Vector3(sideX, y_base + 0.58, z));
	});
	group.add(postsGroup);

	for (let i = 0; i < postZPositions.length - 1; i++) {
		const p1_l = leftPosts[i];
		const p2_l = leftPosts[i+1];
		addRailSegment(planksGroup, p1_l, p2_l, ropeMat);

		const p1_r = rightPosts[i];
		const p2_r = rightPosts[i+1];
		addRailSegment(planksGroup, p1_r, p2_r, ropeMat);
	}

	return group;
}

function addRailSegment(group, p1, p2, material) {
	const distance = p1.distanceTo(p2);
	const railGeo = new THREE.CylinderGeometry(0.025, 0.025, distance, 6);
	const rail = new THREE.Mesh(railGeo, material);
	
	const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
	rail.position.copy(midpoint);
	
	const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
	const up = new THREE.Vector3(0, 1, 0);
	rail.quaternion.setFromUnitVectors(up, direction);
	
	rail.castShadow = true;
	group.add(rail);
}


// --- Library Catalog Manifest ---

export const catalog = [
	// 1. Structure
	{
		id: 'floor_wood',
		name: 'Plank Wood Floor',
		category: 'structure',
		icon: '🪵',
		width: 4, height: 0.1, depth: 4,
		materialType: 'wood',
		defaultColor: '#a16a38',
		sound: 'wood',
		createMesh: buildFloorWood
	},
	{
		id: 'floor_checkered',
		name: 'Tile Checker Floor',
		category: 'structure',
		icon: '🏁',
		width: 4, height: 0.1, depth: 4,
		materialType: 'matte',
		defaultColor: '#1d6c6e',
		sound: 'wood',
		createMesh: buildFloorCheckered
	},
	{
		id: 'wall_plain',
		name: 'Stripe Wall Panel',
		category: 'structure',
		icon: '🧱',
		width: 4, height: 3.0, depth: 0.15,
		materialType: 'fabric',
		defaultColor: '#67a390',
		sound: 'wood',
		createMesh: buildWallPlain
	},
	{
		id: 'wall_window',
		name: 'Garden Window Wall',
		category: 'structure',
		icon: '🪟',
		width: 4, height: 3.0, depth: 0.15,
		materialType: 'wood',
		defaultColor: '#1d6c6e',
		sound: 'wood',
		createMesh: buildWallWindow
	},
	{
		id: 'road_cobble',
		name: 'Cobblestone Road Tile',
		category: 'structure',
		icon: '🛣️',
		width: 4, height: 0.15, depth: 4,
		materialType: 'matte',
		defaultColor: '#7a7a7a',
		sound: 'wood',
		createMesh: buildRoadCobble
	},
	{
		id: 'path_stepping',
		name: 'Stepping Stone Pathway',
		category: 'structure',
		icon: '👣',
		width: 1.6, height: 0.05, depth: 4,
		materialType: 'matte',
		defaultColor: '#a3a3a3',
		sound: 'wood',
		createMesh: buildPathStepping
	},
	{
		id: 'bridge_arch',
		name: 'Handcrafted Arch Bridge',
		category: 'structure',
		icon: '🌉',
		width: 2.0, height: 1.2, depth: 4.0,
		materialType: 'wood',
		defaultColor: '#8a5a36',
		sound: 'wood',
		createMesh: buildBridgeArch
	},

	// 2. Furniture
	{
		id: 'table_dining',
		name: 'Wooden Table',
		category: 'furniture',
		icon: '🪵',
		width: 1.8, height: 0.8, depth: 1.2,
		materialType: 'wood',
		defaultColor: '#8a5a36',
		sound: 'wood',
		createMesh: buildTableDining
	},
	{
		id: 'chair_dining',
		name: 'Tea-Party Chair',
		category: 'furniture',
		icon: '🪑',
		width: 0.6, height: 0.9, depth: 0.6,
		materialType: 'fabric',
		defaultColor: '#a16a38',
		sound: 'wood',
		createMesh: buildChairDining
	},
	{
		id: 'cabinet_tea',
		name: 'Display Cabinet',
		category: 'furniture',
		icon: '🧳',
		width: 1.8, height: 1.2, depth: 0.7,
		materialType: 'wood',
		defaultColor: '#1d6c6e',
		sound: 'wood',
		createMesh: buildCabinetTeaStore
	},
	{
		id: 'bookshelf_tall',
		name: 'Cozy Bookshelf',
		category: 'furniture',
		icon: '📚',
		width: 1.2, height: 2.0, depth: 0.35,
		materialType: 'wood',
		defaultColor: '#5c3a21',
		sound: 'wood',
		createMesh: buildBookshelf
	},
	{
		id: 'gear_clock',
		name: 'Grandfather Clock',
		category: 'furniture',
		icon: '🕰️',
		width: 0.8, height: 2.2, depth: 0.5,
		materialType: 'wood',
		defaultColor: '#7a4f30',
		sound: 'wood',
		createMesh: buildGearClock
	},
	{
		id: 'dress_form',
		name: 'Mannequin Dress Form',
		category: 'furniture',
		icon: '🧍',
		width: 0.6, height: 1.6, depth: 0.6,
		materialType: 'fabric',
		defaultColor: '#e0cda9',
		sound: 'wood',
		createMesh: buildDressForm
	},

	// 3. Decor
	{
		id: 'teapot_glass',
		name: 'Miniature Teapot',
		category: 'decor',
		icon: '🫖',
		width: 0.4, height: 0.4, depth: 0.4,
		materialType: 'glass',
		defaultColor: '#ff99aa',
		sound: 'glass',
		createMesh: buildTeapot
	},
	{
		id: 'teacup_saucer',
		name: 'Teacup & Saucer',
		category: 'decor',
		icon: '☕',
		width: 0.25, height: 0.12, depth: 0.25,
		materialType: 'matte',
		defaultColor: '#faf6f0',
		sound: 'glass',
		createMesh: buildTeacup
	},
	{
		id: 'wall_painting',
		name: 'Vintage Clock Art',
		category: 'decor',
		icon: '🖼️',
		width: 1.1, height: 1.4, depth: 0.08,
		materialType: 'matte',
		defaultColor: '#faf6f0',
		sound: 'wood',
		createMesh: buildWallPainting
	},
	{
		id: 'flower_vase',
		name: 'Floral Rose Vase',
		category: 'decor',
		icon: '🏺',
		width: 0.25, height: 0.6, depth: 0.25,
		materialType: 'glass',
		defaultColor: '#cc3366',
		sound: 'glass',
		createMesh: buildFlowerVase
	},
	{
		id: 'opened_book',
		name: 'Opened Vintage Book',
		category: 'decor',
		icon: '📖',
		width: 0.6, height: 0.15, depth: 0.45,
		materialType: 'wood',
		defaultColor: '#8a2b2b',
		sound: 'wood',
		createMesh: buildOpenedBook
	},
	{
		id: 'hanging_ivy',
		name: 'Hanging Ivy Plant',
		category: 'decor',
		icon: '🌿',
		width: 0.6, height: 1.2, depth: 0.4,
		materialType: 'fabric',
		defaultColor: '#3b6e4c',
		sound: 'wood',
		createMesh: buildHangingIvy
	},

	// 4. Special & Figures
	{
		id: 'rabbit_figure',
		name: 'White Rabbit Figure',
		category: 'figures',
		icon: '🐇',
		width: 0.6, height: 0.9, depth: 0.6,
		materialType: 'fabric',
		defaultColor: '#a12b2b', // coat color
		sound: 'wood',
		createMesh: buildWhiteRabbit
	},
	{
		id: 'glowing_lamp',
		name: 'Warm LED Lantern',
		category: 'figures', // placed in figures/lights tab
		icon: '💡',
		width: 0.4, height: 0.55, depth: 0.4,
		materialType: 'metallic',
		defaultColor: '#cfa74e',
		sound: 'glass',
		createMesh: buildGlowingLamp
	}
];
