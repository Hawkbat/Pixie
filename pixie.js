let VERSION = 1
let MODES = { GBC: 0 }
let GBC_COLOR_SCALE = [0, 2, 4, 7, 12, 18, 25, 34, 42, 52, 62, 73, 85, 97, 109, 121, 134, 146, 158, 170, 182, 193, 203, 213, 221, 230, 237, 243, 248, 251, 253, 255]
let DATA_FLAGS = { EXPORT: 1 }

let contextMenu = null

let menuFileEle = document.getElementById('menu-file')
let menuEditEle = document.getElementById('menu-edit')
let menuViewEle = document.getElementById('menu-view')
let menuHelpEle = document.getElementById('menu-help')
let sectionHelpEle = document.getElementById('section-help')
let palListEle = document.getElementById('pal-list')
let setListEle = document.getElementById('set-list')
let mapListEle = document.getElementById('map-list')
let palInsertEle = document.getElementById('pal-insert')
let setInsertEle = document.getElementById('set-insert')
let mapInsertEle = document.getElementById('map-insert')
let palRemoveEle = document.getElementById('pal-remove')
let setRemoveEle = document.getElementById('set-remove')
let mapRemoveEle = document.getElementById('map-remove')
let palCanvasEle = document.getElementById('pal-canvas')
let setCanvasEle = document.getElementById('set-canvas')
let tileCanvasEle = document.getElementById('tile-canvas')
let mapCanvasEle = document.getElementById('map-canvas')
let setGridEle = document.getElementById('set-grid')
let tileGridEle = document.getElementById('tile-grid')
let mapGridEle = document.getElementById('map-grid')
let palSelectorEle = document.getElementById('pal-selector')
let setSelectorEle = document.getElementById('set-selector')
let colRRangeEle = document.getElementById('col-r-range')
let colGRangeEle = document.getElementById('col-g-range')
let colBRangeEle = document.getElementById('col-b-range')
let colRValueEle = document.getElementById('col-r-value')
let colGValueEle = document.getElementById('col-g-value')
let colBValueEle = document.getElementById('col-b-value')
let palNameEle = document.getElementById('pal-name')
let setNameEle = document.getElementById('set-name')
let mapNameEle = document.getElementById('map-name')
let projectNameEle = document.getElementById('project-name')
let projectModeEle = document.getElementById('project-mode')
let setTooltipEle = document.getElementById('set-tooltip')
let tileTooltipEle = document.getElementById('tile-tooltip')
let palTooltipEle = document.getElementById('pal-tooltip')
let mapTooltipEle = document.getElementById('map-tooltip')
let tooltipEle = document.getElementById('tooltip')
let palFlagsExportEle = document.getElementById('pal-flags-export')
let setFlagsExportEle = document.getElementById('set-flags-export')
let mapFlagsExportEle = document.getElementById('map-flags-export')

let palI = 0
let colI = 0
let setI = 0
let tileI = 0
let mapI = 0
let underMapI = -1

let projectName = ""
let projectMode = MODES.GBC
let pals = []
let sets = []
let maps = []

function clamp(v, min, max) {
	return Math.max(min, Math.min(max, v))
}

function pad(s, c, l) {
	while (s.length < l) s = c + s
	return s
}

function lerpInt(a, b, t) {
	return Math.round(a + (b - a) * t)
}

function toAscii(s) {
	return s.replace(/[^\x00-\x7F]/g, "")
}

function hexToByte(s) {
	return parseInt(s, 16)
}

function byteToHex(n) {
	return pad(n.toString(16).toUpperCase(), '0', 2)
}

function hexToRgb(s) {
	return [hexToByte(s.substr(1, 2)), hexToByte(s.substr(3, 2)), hexToByte(s.substr(5, 2))]
}

function rgbToHex(c) {
	return `#${byteToHex(c[0])}${byteToHex(c[1])}${byteToHex(c[2])}`
}

function rgbToInt(c) {
	return (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]
}

function intToRgb(n) {
	return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF]
}

function gbcToRgb(c) {
	r = GBC_COLOR_SCALE[c[0]]
	g = GBC_COLOR_SCALE[c[1]]
	b = GBC_COLOR_SCALE[c[2]]
	g = (g * 3 + b) / 4
	return [r, g, b]
}

function gbcToInt(c) {
	return rgbToInt(gbcToRgb(c))
}

function lerpColor(a, b, t) {
	return [lerpInt(a[0], b[0], t), lerpInt(a[1], b[1], t), lerpInt(a[2], b[2], t)]
}

function printColor(c) {
	return `R: $${byteToHex(c[0])}\nG: $${byteToHex(c[1])}\nB: $${byteToHex(c[2])}`
}

function serializeProject() {
	let len = 0
	len += 1 // version
	len += 1 + projectName.length
	len += 1 // project mode
	len += 1 // palette count
	for (let pal of pals) {
		len += 1 + pal.name.length
		len += 1 // export flags
		for (let color of pal.colors) {
			len += 3 // color RGB
		}
	}
	len += 1 // set count
	for (let set of sets) {
		len += 1 + set.name.length
		len += 1 // export flags
		for (let tile of set.tiles) {
			len += 1 // palette index
			len += 64 / 2 // color indices
		}
	}
	len += 1 // map count
	for (let map of maps) {
		len += 1 + map.name.length
		len += 1 // export flags
		len += 1 // tileset index
		for (let tile of map.tiles) {
			len += 1 // tile index
			len += 1 // palette index
		}
	}

	let a = new Uint8Array(len)
	let i = 0

	a[i++] = VERSION
	a[i++] = projectName.length
	a.set(new TextEncoder().encode(projectName), i)
	i += projectName.length
	a[i++] = projectMode
	a[i++] = pals.length
	for (let pal of pals) {
		a[i++] = pal.name.length
		a.set(new TextEncoder().encode(pal.name), i)
		i += pal.name.length
		a[i++] = pal.flags
		for (let color of pal.colors) {
			a[i++] = color[0]
			a[i++] = color[1]
			a[i++] = color[2]
		}
	}
	a[i++] = sets.length
	for (let set of sets) {
		a[i++] = set.name.length
		a.set(new TextEncoder().encode(set.name), i)
		i += set.name.length
		a[i++] = set.flags
		for (let tile of set.tiles) {
			a[i++] = tile.pal
			for (let j = 0; j < 64; j += 2) {
				a[i++] = tile.colors[j + 0] | (tile.colors[j + 1] << 4)
			}
		}
	}
	a[i++] = maps.length
	for (let map of maps) {
		a[i++] = map.name.length
		a.set(new TextEncoder().encode(map.name), i)
		i += map.name.length
		a[i++] = map.flags
		a[i++] = map.set
		for (let tile of map.tiles) {
			a[i++] = tile.tile
			a[i++] = tile.pal
		}
	}
	if (i != a.byteLength) alert('Lengths did not match; expected ' + a.byteLength + ' but got ' + i)
	return a
}

function deserializeProject(a) {
	let i = 0
	let len = 0
	let count = 0

	clearProject()

	// header
	let version = a[i++]
	if (version != VERSION) {
		alert('Project version not recognized')
		return
	}
	len = a[i++]
	projectName = new TextDecoder().decode(new DataView(a.buffer, i, len))
	i += len
	projectMode = a[i++]

	// palettes
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let pal = new Palette(j)
		len = a[i++]
		pal.name = new TextDecoder().decode(new DataView(a.buffer, i, len))
		i += len
		pal.updateLabel()
		pal.flags = a[i++]
		for (let k = 0; k < 4; k++) {
			pal.colors[k][0] = a[i++]
			pal.colors[k][1] = a[i++]
			pal.colors[k][2] = a[i++]
		}
		pals.push(pal)
	}

	// tilesets
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let set = new Tileset(j)
		len = a[i++]
		set.name = new TextDecoder().decode(new DataView(a.buffer, i, len))
		i += len
		set.updateLabel()
		set.flags = a[i++]
		for (let k = 0; k < 128; k++) {
			let tile = set.tiles[k]
			tile.pal = a[i++]
			for (let l = 0; l < 64; l += 2) {
				let p = a[i++]
				tile.colors[l + 0] = p & 0x0F
				tile.colors[l + 1] = (p & 0xF0) >> 4
			}
		}
		sets.push(set)
	}

	// maps
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let map = new Tilemap(j)
		len = a[i++]
		map.name = new TextDecoder().decode(new DataView(a.buffer, i, len))
		i += len
		map.updateLabel()
		map.flags = a[i++]
		map.set = a[i++]
		for (let k = 0; k < 1024; k++) {
			let tile = map.tiles[k]
			tile.tile = a[i++]
			tile.pal = a[i++]
		}
		maps.push(map)
	}

	refreshProject()

	if (i != a.byteLength) alert('Lengths did not match; expected ' + a.byteLength + ' but got ' + i)
}

function updatePaletteCanvas() {
	let ctx = palCanvasEle.getContext('2d')
	let imgData = ctx.getImageData(0, 0, 4, 1)
	let data = new Uint32Array(imgData.data.buffer)
	data[0] = gbcToInt(pals[palI].colors[0])
	data[1] = gbcToInt(pals[palI].colors[1])
	data[2] = gbcToInt(pals[palI].colors[2])
	data[3] = gbcToInt(pals[palI].colors[3])
	ctx.putImageData(imgData, 0, 0)
}

function updateSetCanvas() {
	let ctx = setCanvasEle.getContext('2d')
	let imgData = ctx.getImageData(0, 0, 128, 64)
	let data = new Uint32Array(imgData.data.buffer)
	for (let ty = 0; ty < 8; ty++) {
		for (let tx = 0; tx < 16; tx++) {
			let ti = ty * 16 + tx
			let tile = sets[setI].tiles[ti]
			let pal = pals[tile.pal]
			for (let px = 0; px < 8; px++) {
				for (let py = 0; py < 8; py++) {
					let pi = py * 8 + px
					let y = ty * 8 + py
					let x = tx * 8 + px
					let i = y * 128 + x
					data[i] = gbcToInt(pal.colors[tile.colors[pi]])
				}
			}
		}
	}
	ctx.putImageData(imgData, 0, 0)
}

function updateTileCanvas() {
	let ctx = tileCanvasEle.getContext('2d')
	let imgData = ctx.getImageData(0, 0, 8, 8)
	let data = new Uint32Array(imgData.data.buffer)
	let set = sets[setI]
	let tile = set.tiles[tileI]
	let pal = pals[tile.pal]
	for (let x = 0; x < 8; x++) {
		for (let y = 0; y < 8; y++) {
			let i = y * 8 + x
			data[i] = gbcToInt(pal.colors[tile.colors[i]])
		}
	}
	ctx.putImageData(imgData, 0, 0)
}

function updateMapCanvas() {
	let ctx = mapCanvasEle.getContext('2d')
	let imgData = ctx.getImageData(0, 0, 256, 256)
	let data = new Uint32Array(imgData.data.buffer)

	let map = maps[underMapI >= 0 ? underMapI : mapI]
	let set = sets[map.set]
	for (let ty = 0; ty < 32; ty++) {
		for (let tx = 0; tx < 32; tx++) {
			let ti = ty * 32 + tx
			let tile = map.tiles[ti]
			let pal = pals[tile.pal]
			let src = set.tiles[tile.tile]
			for (let px = 0; px < 8; px++) {
				for (let py = 0; py < 8; py++) {
					let pi = py * 8 + px
					let y = ty * 8 + py
					let x = tx * 8 + px
					let i = y * 256 + x
					data[i] = gbcToInt(pal.colors[src.colors[pi]])
				}
			}
		}
	}
	if (underMapI >= 0) {
		let map = maps[mapI]
		let set = sets[map.set]
		for (let ty = 0; ty < 32; ty++) {
			for (let tx = 0; tx < 32; tx++) {
				let ti = ty * 32 + tx
				let tile = map.tiles[ti]
				let pal = pals[tile.pal]
				let src = set.tiles[tile.tile]
				for (let px = 0; px < 8; px++) {
					for (let py = 0; py < 8; py++) {
						let pi = py * 8 + px
						let y = ty * 8 + py
						let x = tx * 8 + px
						let i = y * 256 + x
						if (src.colors[pi] > 0) {
							let oc = intToRgb(data[i])
							let nc = gbcToRgb(pal.colors[src.colors[pi]])
							let c = lerpColor(oc, nc, 0.5)
							data[i] = rgbToInt(c)
						}
					}
				}
			}
		}
	}
	ctx.putImageData(imgData, 0, 0)
}

function insertPalette(index) {
	if (pals.length == 256) return
	let pal = new Palette(index)
	pals.splice(index, 0, pal)
	for (let i = pals.length - 1; i > index; i--) {
		for (let set of sets) {
			for (let tile of set.tiles) {
				if (tile.pal == pals[i].index) tile.pal = i
			}
		}
		for (let map of maps) {
			for (let tile of map.tiles) {
				if (tile.pal == pals[i].index) tile.pal = i
			}
		}
		pals[i].index = i
		pals[i].updateSpan()
	}
	selectPalette(palI)
}

function insertSet(index) {
	if (sets.length == 256) return
	let set = new Tileset(index)
	sets.splice(index, 0, set)
	for (let i = sets.length - 1; i > index; i--) {
		for (let map of maps) {
			if (map.set == sets[i].index) map.set = i
		}
		sets[i].index = i
		sets[i].updateSpan()
	}
	selectSet(setI)
}

function insertMap(index) {
	if (maps.length == 256) return
	let map = new Tilemap(index)
	maps.splice(index, 0, map)
	for (let i = maps.length - 1; i > index; i--) {
		maps[i].index = i
		maps[i].updateSpan()
	}
	selectMap(mapI)
}

function removePalette(index) {
	if (pals.length == 1) return
	pals[index].div.remove()
	pals.splice(index, 1)
	for (let i = index; i < pals.length; i++) {
		for (let set of sets) {
			for (let tile of set.tiles) {
				if (tile.pal == pals[i].index) tile.pal = i
				tile.pal = clamp(tile.pal, 0, pals.length - 1)
			}
		}
		for (let map of maps) {
			for (let tile of map.tiles) {
				if (tile.pal == pals[i].index) tile.pal = i
				tile.pal = clamp(tile.pal, 0, pals.length - 1)
			}
		}
		pals[i].index = i
		pals[i].updateSpan()
	}
	selectPalette(clamp(palI, 0, pals.length - 1))
	updateTileCanvas()
	updateSetCanvas()
	updateMapCanvas()
}

function removeSet(index) {
	if (sets.length == 1) return
	sets[index].div.remove()
	sets.splice(index, 1)
	for (let i = sets.length - 1; i >= index; i--) {
		for (let map of maps) {
			if (map.set >= sets.length) map.set = sets.length - 1
			if (map.set == sets[i].index) map.set = i
		}
		sets[i].index = i
		sets[i].updateSpan()
	}
	selectSet(clamp(setI, 0, sets.length - 1))
	updateTileCanvas()
	updateMapCanvas()
}

function removeMap(index) {
	if (maps.length == 1) return
	maps[index].div.remove()
	maps.splice(index, 1)
	for (let i = maps.length - 1; i >= index; i--) {
		maps[i].index = i
		maps[i].updateSpan()
	}
	selectMap(clamp(mapI, 0, maps.length - 1))
	updateMapCanvas()
}

function clearProject() {
	projectName = ''
	projectMode = MODES.GBC
	for (let pal of pals) pal.div.remove()
	pals = []
	for (let set of sets) set.div.remove()
	sets = []
	for (let map of maps) map.div.remove()
	maps = []

	palI = 0
	colI = 0
	setI = 0
	tileI = 0
	mapI = 0
	underMapI = -1
}

function refreshProject() {
	projectNameEle.value = projectName
	projectModeEle.value = projectMode

	selectPalette(palI)
	selectColor(colI)
	selectSet(setI)
	selectTile(tileI)
	selectMap(mapI)
}

function selectColor(index) {
	colI = index
	palSelectorEle.style.left = `${32 * index}px`
	colRRangeEle.value = colRValueEle.value = pals[palI].colors[colI][0]
	colGRangeEle.value = colGValueEle.value = pals[palI].colors[colI][1]
	colBRangeEle.value = colBValueEle.value = pals[palI].colors[colI][2]
}

function selectPalette(index) {
	for (let ele of document.querySelectorAll('.pal.selected')) {
		ele.classList.remove('selected')
	}
	if (index >= 0 && index < pals.length) {
		pals[index].div.classList.add('selected')
	}
	palI = index
	palNameEle.value = pals[index].name
	palFlagsExportEle.checked = (pals[index].flags & DATA_FLAGS.EXPORT) != 0
	selectColor(colI)
	updatePaletteCanvas()
}

function selectTile(index) {
	tileI = index
	setSelectorEle.style.left = `${32 * (index % 16)}px`
	setSelectorEle.style.top = `${32 * Math.floor(index / 16)}px`
	selectPalette(sets[setI].tiles[tileI].pal)
	updateTileCanvas()
}

function selectSet(index) {
	for (let ele of document.querySelectorAll('.set.selected')) {
		ele.classList.remove('selected')
	}
	if (index >= 0 && index < sets.length) {
		sets[index].div.classList.add('selected')
	}
	setI = index
	setNameEle.value = sets[index].name
	setFlagsExportEle.checked = (sets[index].flags & DATA_FLAGS.EXPORT) != 0
	selectTile(tileI)
	updateSetCanvas()
}

function selectMap(index) {
	for (let ele of document.querySelectorAll('.map.selected')) {
		ele.classList.remove('selected')
	}
	if (index >= 0 && index < maps.length) {
		maps[index].div.classList.add('selected')
	}
	mapI = index
	mapNameEle.value = maps[index].name
	mapFlagsExportEle.checked = (maps[index].flags & DATA_FLAGS.EXPORT) != 0
	selectSet(maps[index].set)
	selectUnderMap(-1)
	updateMapCanvas()
}

function selectUnderMap(index) {
	for (let ele of document.querySelectorAll('.map.highlighted')) {
		ele.classList.remove('highlighted')
	}
	if (index >= 0 && index < maps.length) {
		maps[index].div.classList.add('highlighted')
	}
	underMapI = index
	updateMapCanvas()
}

function cloneColor(i) {
	let c = pals[palI].colors[colI]
	pals[palI].colors[i] = [...c]
	updatePaletteCanvas()
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function cloneTile(i) {
	let src = sets[setI].tiles[tileI]
	sets[setI].tiles[i] = { pal: src.pal, colors: [...src.colors] }
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function setColorR(n) {
	pals[palI].colors[colI][0] = n
	colRRangeEle.value = n
	colRValueEle.value = n
	updatePaletteCanvas()
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function setColorG(n) {
	pals[palI].colors[colI][1] = n
	colGRangeEle.value = n
	colGValueEle.value = n
	updatePaletteCanvas()
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function setColorB(n) {
	pals[palI].colors[colI][2] = n
	colBRangeEle.value = n
	colBValueEle.value = n
	updatePaletteCanvas()
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function setTileColor(i, ci) {
	sets[setI].tiles[tileI].colors[i] = ci
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function fillTileColor(i, ci) {
	let q = [i]
	let cols = sets[setI].tiles[tileI].colors
	let fi = cols[i]
	if (fi == ci) return
	while (q.length > 0) {
		let i = q.pop()
		let x = i % 8
		let y = Math.floor(i / 8)
		cols[i] = ci
		if (x > 0 && cols[i - 1] == fi) q.push(i - 1)
		if (x < 7 && cols[i + 1] == fi) q.push(i + 1)
		if (y > 0 && cols[i - 8] == fi) q.push(i - 8)
		if (y < 7 && cols[i + 8] == fi) q.push(i + 8)
	}
	updateSetCanvas()
	updateTileCanvas()
	updateMapCanvas()
}

function setTilePalette(i) {
	sets[setI].tiles[tileI].pal = i
}

function setMapTile(i, ti) {
	maps[mapI].tiles[i].tile = ti
	updateMapCanvas()
}

function setMapPalette(i, pi) {
	maps[mapI].tiles[i].pal = pi
	updateMapCanvas()
}

function fillMapTileAndPalette(i, ti, pi) {
	let q = [i]
	let tiles = maps[mapI].tiles
	let fti = tiles[i].tile
	let fpi = tiles[i].pal
	if (fti == ti && fpi == pi) return
	while (q.length > 0) {
		let i = q.pop()
		let x = i % 32
		let y = Math.floor(i / 32)
		tiles[i].tile = ti
		tiles[i].pal = pi
		if (x > 0 && tiles[i - 1].tile == fti && tiles[i - 1].pal == fpi) q.push(i - 1)
		if (x < 31 && tiles[i + 1].tile == fti && tiles[i + 1].pal == fpi) q.push(i + 1)
		if (y > 0 && tiles[i - 32].tile == fti && tiles[i - 32].pal == fpi) q.push(i - 32)
		if (y < 31 && tiles[i + 32].tile == fti && tiles[i + 32].pal == fpi) q.push(i + 32)
	}
	updateMapCanvas()
}

function setMapSet(i) {
	maps[mapI].set = i
	updateMapCanvas()
}

function setPalName(s) {
	pals[palI].name = toAscii(s)
	pals[palI].updateLabel()
	palNameEle.value = pals[palI].name
}

function setSetName(s) {
	sets[setI].name = toAscii(s)
	sets[setI].updateLabel()
	setNameEle.value = sets[setI].name
}

function setMapName(s) {
	maps[mapI].name = toAscii(s)
	maps[mapI].updateLabel()
	mapNameEle.value = maps[mapI].name
}

function setProjectName(s) {
	projectName = toAscii(s)
	projectNameEle.value = projectName
}

function setPalExport(b) {
	if (b) pals[palI].flags |= DATA_FLAGS.EXPORT
	else pals[palI].flags &= ~DATA_FLAGS.EXPORT
	palFlagsExportEle.checked = (pals[palI].flags & DATA_FLAGS.EXPORT) != 0
}

function setSetExport(b) {
	if (b) sets[setI].flags |= DATA_FLAGS.EXPORT
	else sets[setI].flags &= ~DATA_FLAGS.EXPORT
	setFlagsExportEle.checked = (sets[setI].flags & DATA_FLAGS.EXPORT) != 0
}

function setMapExport(b) {
	if (b) maps[mapI].flags |= DATA_FLAGS.EXPORT
	else maps[mapI].flags &= ~DATA_FLAGS.EXPORT
	mapFlagsExportEle.checked = (maps[mapI].flags & DATA_FLAGS.EXPORT) != 0
}

class ContextMenu {
	constructor(parent) {
		this.parent = parent
		parent.addEventListener('click', e => {
			if (!this.isOpen()) {
				if (contextMenu) contextMenu.close()
				this.open()
				e.stopPropagation()
			}
		})
		document.body.addEventListener('click', e => {
			if (this.isOpen()) this.close()
		})
		this.ele = document.createElement('menu')
		let rect = parent.getBoundingClientRect()
		let x = rect.left
		let y = rect.top + rect.height
		this.ele.style.left = `${x}px`
		this.ele.style.top = `${y}px`
	}
	option(label, kbd, cb) {
		let ele = document.createElement('li')
		ele.addEventListener('click', ev => {
			cb()
			this.close()
		})
		window.addEventListener('keydown', ev => {
			if (ev.target == document.body && ev.key.toLowerCase() == kbd.toLowerCase()) {
				cb()
				this.close()
				ev.preventDefault()
			}
		})
		ele.innerHTML = `<span>${label}</span><span>${kbd}</span>`
		this.ele.appendChild(ele)
		return this
	}
	spacer() {
		this.ele.appendChild(document.createElement('hr'))
		return this
	}
	open() {
		this.parent.classList.add('active')
		document.body.appendChild(this.ele)
		contextMenu = this
		return this
	}
	close() {
		this.parent.classList.remove('active')
		this.ele.remove()
		contextMenu = null
		return this
	}
	isOpen() {
		return this == contextMenu
	}
}

class Palette {
	constructor(index) {
		this.index = index
		this.name = ''
		this.flags = DATA_FLAGS.EXPORT
		this.colors = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]
		this.div = document.createElement('div')
		this.div.className = 'pal'
		this.div.addEventListener('click', e => selectPalette(this.index))
		this.span = document.createElement('span')
		this.div.appendChild(this.span)
		this.label = document.createElement('label')
		this.div.appendChild(this.label)
		if (index >= palListEle.children.length) palListEle.appendChild(this.div)
		else {
			let c = palListEle.children[index]
			palListEle.insertBefore(this.div, c)
		}
		this.updateSpan()
		this.updateLabel()
	}
	updateSpan() {
		this.span.textContent = byteToHex(this.index)
	}
	updateLabel() {
		if (this.name) this.label.textContent = this.name
		else this.label.innerHTML = '<i>Untitled</i>'
	}
}

class Tileset {
	constructor(index) {
		this.index = index
		this.name = ''
		this.flags = DATA_FLAGS.EXPORT
		this.tiles = []
		for (let i = 0; i < 128; i++) {
			let tile = { pal: 0, colors: [] }
			for (let j = 0; j < 64; j++) tile.colors.push(0)
			this.tiles.push(tile)
		}
		this.div = document.createElement('div')
		this.div.className = 'set'
		this.div.addEventListener('click', e => selectSet(this.index))
		this.span = document.createElement('span')
		this.div.appendChild(this.span)
		this.label = document.createElement('label')
		this.div.appendChild(this.label)
		if (index >= setListEle.children.length) setListEle.appendChild(this.div)
		else {
			let c = setListEle.children[index]
			setListEle.insertBefore(this.div, c)
		}
		this.updateSpan()
		this.updateLabel()
	}
	updateSpan() {
		this.span.textContent = byteToHex(this.index)
	}
	updateLabel() {
		if (this.name) this.label.textContent = this.name
		else this.label.innerHTML = '<i>Untitled</i>'
	}
}

class Tilemap {
	constructor(index) {
		this.index = index
		this.name = ''
		this.flags = DATA_FLAGS.EXPORT
		this.set = 0
		this.tiles = []
		for (let i = 0; i < 1024; i++) this.tiles.push({ tile: 0, pal: 0 })
		this.div = document.createElement('div')
		this.div.className = 'map'
		this.div.addEventListener('mousedown', e => {
			if (e.buttons & 1) selectMap(this.index)
			if (e.buttons & 2) selectUnderMap(this.index)
		})
		this.span = document.createElement('span')
		this.div.appendChild(this.span)
		this.label = document.createElement('label')
		this.div.appendChild(this.label)
		if (index >= setListEle.children.length) mapListEle.appendChild(this.div)
		else {
			let c = mapListEle.children[index]
			mapListEle.insertBefore(this.div, c)
		}
		this.updateSpan()
		this.updateLabel()
	}
	updateSpan() {
		this.span.textContent = byteToHex(this.index)
	}
	updateLabel() {
		if (this.name) this.label.textContent = this.name
		else this.label.innerHTML = '<i>Untitled</i>'
	}
}

document.addEventListener('contextmenu', e => {
	e.preventDefault()
	return false
})

palInsertEle.addEventListener('click', e => insertPalette(palI + 1))
setInsertEle.addEventListener('click', e => insertSet(setI + 1))
mapInsertEle.addEventListener('click', e => insertMap(mapI + 1))
palRemoveEle.addEventListener('click', e => removePalette(palI))
setRemoveEle.addEventListener('click', e => removeSet(setI))
mapRemoveEle.addEventListener('click', e => removeMap(mapI))

function onPalMouseEvt(e) {
	let i = clamp(Math.floor(e.offsetX / 32), 0, 3)
	if (e.buttons != 0) {
		if (e.buttons & 1) selectColor(i)
		if (e.buttons & 2) cloneColor(i)
	}
	palTooltipEle.textContent = 'Cursor: $' + byteToHex(i) + '\n' + printColor(pals[palI].colors[i])
}
palCanvasEle.addEventListener('mousedown', e => onPalMouseEvt(e))
palCanvasEle.addEventListener('mousemove', e => onPalMouseEvt(e))

function onSetMouseEvt(e) {
	let x = clamp(Math.floor(e.offsetX / 32), 0, 15)
	let y = clamp(Math.floor(e.offsetY / 32), 0, 7)
	let i = y * 16 + x
	if (e.buttons != 0) {
		if (e.buttons & 1) selectTile(i)
		if (e.buttons & 2) cloneTile(i)
	}
	setTooltipEle.textContent = 'Cursor: $' + byteToHex(i) + ' (Low) or $' + byteToHex(i + 128) + ' (High) ($' + byteToHex(x) + ', $' + byteToHex(y) + ')'
}
setCanvasEle.addEventListener('mousedown', e => onSetMouseEvt(e))
setCanvasEle.addEventListener('mousemove', e => onSetMouseEvt(e))

function onTileMouseEvt(e) {
	let x = clamp(Math.floor(e.offsetX / 32), 0, 7)
	let y = clamp(Math.floor(e.offsetY / 32), 0, 7)
	let i = y * 8 + x
	if (e.buttons != 0) {
		if (e.buttons & 4) {
			setTilePalette(palI)
			fillTileColor(i, colI)
		}
		if (e.buttons & 1) {
			setTilePalette(palI)
			setTileColor(i, colI)
		}
		if (e.buttons & 2) selectColor(sets[setI].tiles[tileI].colors[i])
	}
	tileTooltipEle.textContent = 'Cursor: $' + byteToHex(i) + ' ($' + byteToHex(x) + ', $' + byteToHex(y) + ')'
}
tileCanvasEle.addEventListener('mousedown', e => onTileMouseEvt(e))
tileCanvasEle.addEventListener('mousemove', e => onTileMouseEvt(e))

function onMapMouseEvt(e) {
	let x = clamp(Math.floor(e.offsetX / 32), 0, 31)
	let y = clamp(Math.floor(e.offsetY / 32), 0, 31)
	let i = y * 32 + x
	if (e.buttons != 0) {
		if (e.buttons & 4) {
			setMapSet(setI)
			fillMapTileAndPalette(i, tileI, palI)
		}
		if (e.buttons & 1) {
			setMapSet(setI)
			setMapTile(i, tileI)
			setMapPalette(i, palI)
		}
		if (e.buttons & 2) {
			selectTile(maps[mapI].tiles[i].tile)
			selectPalette(maps[mapI].tiles[i].pal)
		}
	}
	mapTooltipEle.textContent = 'Cursor: $' + byteToHex(i) + ' ($' + byteToHex(x) + ', $' + byteToHex(y) + ')'
}
mapCanvasEle.addEventListener('mousedown', e => onMapMouseEvt(e))
mapCanvasEle.addEventListener('mousemove', e => onMapMouseEvt(e))

colRRangeEle.addEventListener('input', e => setColorR(e.target.value))
colGRangeEle.addEventListener('input', e => setColorG(e.target.value))
colBRangeEle.addEventListener('input', e => setColorB(e.target.value))
colRValueEle.addEventListener('input', e => setColorR(e.target.value))
colGValueEle.addEventListener('input', e => setColorG(e.target.value))
colBValueEle.addEventListener('input', e => setColorB(e.target.value))

palNameEle.addEventListener('input', e => setPalName(e.target.value))
setNameEle.addEventListener('input', e => setSetName(e.target.value))
mapNameEle.addEventListener('input', e => setMapName(e.target.value))
projectNameEle.addEventListener('input', e => setProjectName(e.target.value))

palFlagsExportEle.addEventListener('change', e => setPalExport(e.target.checked))
setFlagsExportEle.addEventListener('change', e => setSetExport(e.target.checked))
mapFlagsExportEle.addEventListener('change', e => setMapExport(e.target.checked))

clearProject()
insertPalette(0)
insertSet(0)
insertMap(0)

new ContextMenu(menuFileEle).option('New Project', 'N', () => {
	clearProject()
	insertPalette(0)
	insertSet(0)
	insertMap(0)
}).option('Open Project...', 'O', () => {
	let input = document.createElement('input')
	input.type = 'file'
	input.onchange = () => {
		let file = input.files[0]
		if (file) {
			let reader = new FileReader()
			reader.readAsArrayBuffer(file)
			reader.onload = (evt) => {
				let data = new Uint8Array(reader.result)
				deserializeProject(data)
			}
		}
	}
	document.body.appendChild(input)
	input.click()
	input.remove()
}).option('Save Project...', 'S', () => {
	let data = serializeProject()
	let blob = new Blob([data.buffer], { type: 'application/octet-stream' })
	let objUrl = URL.createObjectURL(blob)
	let a = document.createElement('a')
	a.href = objUrl
	a.setAttribute('download', projectName.replace(/\s+/g, '-') + '.pixie-project')
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(objUrl)
}).spacer().option('Download Conversion Script', '', () => {
	let a = document.createElement('a')
	a.href = 'pixie-convert.js'
	a.target = '_blank'
	a.setAttribute('download', 'pixie-convert.js')
	document.body.appendChild(a)
	a.click()
	a.remove()
}).spacer().option('Reload Window', '', () => {
	window.location.reload()
})

new ContextMenu(menuViewEle).option('Toggle Grid', 'G', () => {
	setGridEle.hidden = !setGridEle.hidden
	tileGridEle.hidden = !tileGridEle.hidden
	mapGridEle.hidden = !mapGridEle.hidden
}).option('Toggle Help', '?', () => {
	sectionHelpEle.classList.toggle('hide')
})

new ContextMenu(menuHelpEle).option('Toggle Help', '', () => {
	sectionHelpEle.classList.toggle('hide')
})