// Predefined Scene Templates for Miniature Studio

export const templates = {
	// 1. Empty Desk
	empty: [],

	// 2. Alice's Tea Corner (Based on the Alice Tea Store image)
	alice: [
		// Flooring: 4 tiles of size 4x4, creating an 8x8 room diorama
		{ id: 'floor_checkered', x: -2, y: 0, z: -2, rotation: 0, color: '#1d6c6e', matType: 'matte' },
		{ id: 'floor_checkered', x: 2, y: 0, z: -2, rotation: 0, color: '#1d6c6e', matType: 'matte' },
		{ id: 'floor_checkered', x: -2, y: 0, z: 2, rotation: 0, color: '#1d6c6e', matType: 'matte' },
		{ id: 'floor_checkered', x: 2, y: 0, z: 2, rotation: 0, color: '#1d6c6e', matType: 'matte' },

		// Walls along the back (Z = -4) and left side (X = -4)
		{ id: 'wall_window', x: -2, y: 0, z: -4, rotation: 0, color: '#1d6c6e', matType: 'wood' },
		{ id: 'wall_plain', x: 2, y: 0, z: -4, rotation: 0, color: '#67a390', matType: 'fabric' },
		{ id: 'wall_plain', x: -4, y: 0, z: -2, rotation: Math.PI / 2, color: '#67a390', matType: 'fabric' },
		{ id: 'wall_window', x: -4, y: 0, z: 2, rotation: Math.PI / 2, color: '#1d6c6e', matType: 'wood' },

		// Furniture - Tea Cabinet (the main display stand)
		{ id: 'cabinet_tea', x: -1.2, y: 0.05, z: -3.0, rotation: 0, color: '#1d6c6e', matType: 'wood' },

		// Furniture - Bookshelf against the left wall
		{ id: 'bookshelf_tall', x: -3.5, y: 0.05, z: -1.5, rotation: Math.PI / 2, color: '#4a2c11', matType: 'wood' },

		// Furniture - Table and Chairs in the center
		{ id: 'table_dining', x: 1.2, y: 0.05, z: 0.5, rotation: 0, color: '#8a5a36', matType: 'wood' },
		{ id: 'chair_dining', x: 1.2, y: 0.05, z: -0.5, rotation: 0, color: '#c27b40', matType: 'fabric' },
		{ id: 'chair_dining', x: 1.2, y: 0.05, z: 1.5, rotation: Math.PI, color: '#c27b40', matType: 'fabric' },

		// Decor - Table items (Teapot & Teacup)
		{ id: 'teapot_glass', x: 1.0, y: 0.83, z: 0.5, rotation: -0.5, color: '#ffb3c1', matType: 'glass' },
		{ id: 'teacup_saucer', x: 1.4, y: 0.83, z: 0.3, rotation: 0, color: '#faf6f0', matType: 'matte' },
		{ id: 'teacup_saucer', x: 1.4, y: 0.83, z: 0.7, rotation: Math.PI / 2, color: '#faf6f0', matType: 'matte' },

		// Decor - Cabinet items
		{ id: 'flower_vase', x: -0.6, y: 0.8, z: -3.0, rotation: 0, color: '#cc3366', matType: 'glass' },

		// Decor - Painting on wall
		{ id: 'wall_painting', x: 2.0, y: 1.2, z: -3.9, rotation: 0, color: '#faf6f0', matType: 'matte' },

		// Figures - Cozy Lights (LED Lanterns)
		{ id: 'glowing_lamp', x: -1.8, y: 0.8, z: -3.0, rotation: 0, color: '#cfa74e', matType: 'metallic' },
		{ id: 'glowing_lamp', x: -3.5, y: 2.05, z: -1.5, rotation: Math.PI / 2, color: '#cfa74e', matType: 'metallic' },

		// Figures - White Rabbit character standing near the table/counter
		{ id: 'rabbit_figure', x: -0.8, y: 0.05, z: 1.2, rotation: Math.PI / 5, color: '#a12b2b', matType: 'fabric' }
	],

	// 3. Cozy Reading Nook (Study area)
	reading: [
		// Flooring: 4 wood tiles
		{ id: 'floor_wood', x: -2, y: 0, z: -2, rotation: 0, color: '#8b5a2b', matType: 'wood' },
		{ id: 'floor_wood', x: 2, y: 0, z: -2, rotation: 0, color: '#8b5a2b', matType: 'wood' },
		{ id: 'floor_wood', x: -2, y: 0, z: 2, rotation: 0, color: '#8b5a2b', matType: 'wood' },
		{ id: 'floor_wood', x: 2, y: 0, z: 2, rotation: 0, color: '#8b5a2b', matType: 'wood' },

		// Walls: Plain striped warm wall colors
		{ id: 'wall_plain', x: -2, y: 0, z: -4, rotation: 0, color: '#9e2a2b', matType: 'fabric' },
		{ id: 'wall_window', x: 2, y: 0, z: -4, rotation: 0, color: '#5c3a21', matType: 'wood' },
		{ id: 'wall_plain', x: -4, y: 0, z: -2, rotation: Math.PI / 2, color: '#9e2a2b', matType: 'fabric' },
		{ id: 'wall_plain', x: -4, y: 0, z: 2, rotation: Math.PI / 2, color: '#9e2a2b', matType: 'fabric' },

		// Bookshelves: Two bookshelves lining the back corner
		{ id: 'bookshelf_tall', x: -3.5, y: 0.05, z: -3.5, rotation: 0, color: '#4a2c11', matType: 'wood' },
		{ id: 'bookshelf_tall', x: -2.3, y: 0.05, z: -3.5, rotation: 0, color: '#4a2c11', matType: 'wood' },

		// Study Table & Chairs
		{ id: 'table_dining', x: 0.8, y: 0.05, z: -1.2, rotation: Math.PI / 2, color: '#5c3a21', matType: 'wood' },
		{ id: 'chair_dining', x: 0.8, y: 0.05, z: 0.1, rotation: 0, color: '#457b9d', matType: 'fabric' },

		// Table Lamp
		{ id: 'glowing_lamp', x: 0.8, y: 0.83, z: -1.6, rotation: 0, color: '#cfa74e', matType: 'metallic' },

		// Small Items on Table
		{ id: 'teapot_glass', x: 0.8, y: 0.83, z: -0.8, rotation: 0, color: '#83c5be', matType: 'glass' },
		{ id: 'teacup_saucer', x: 0.8, y: 0.83, z: -1.1, rotation: 0, color: '#faf6f0', matType: 'matte' },

		// Rabbit sitting on the other side
		{ id: 'rabbit_figure', x: -1.2, y: 0.05, z: 1.5, rotation: Math.PI / 4, color: '#3e5c76', matType: 'fabric' }
	]
};
