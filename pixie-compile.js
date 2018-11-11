/* Compiles a Pixie project file into a set of files usable from RGBDS ASM */

let path = require('path')
let fs = require('fs')

let args = process.argv.slice(2)

let srcPath = ''
let binPath = ''
let incPath = ''

for (let i = 0; i < args.length; i++) {
	if (args[i] == '-o' || args[i] == '--out') {
		binPath = args[++i]
	} else if (args[i] == '-i' || args[i] == '--inc') {
		incPath = args[++i]
	} else {
		srcPath = args[i]
	}
}
if (srcPath)
	srcPath = path.resolve(process.cwd(), srcPath)
else {
	console.error('No source project specified, aborting')
	process.exit(1)
}

if (binPath)
	binPath = path.resolve(process.cwd(), binPath)
else
	binPath = path.join(path.dirname(srcPath), path.basename(srcPath, path.extname(srcPath)) + '.bin')

if (incPath)
	incPath = path.resolve(process.cwd(), incPath)
else
	incPath = path.join(path.dirname(binPath), path.basename(binPath, path.extname(binPath)) + '.inc')

function decodeString(buf, index, len) {
	let s = ''
	for (let i = index; i < index + len; i++) s += String.fromCharCode(buf[i] & 0xFF)
	return s
}

fs.readFile(srcPath, (err, a) => {
	if (err) throw err

	let PAL_SIZE = 4 * 2
	let SET_SIZE = 128 * (64 / 4)
	let MAP_SIZE = 32 * 32

	let VERSION = 1
	let MODES = { GBC: 0 }
	let DATA_FLAGS = { EXPORT: 1 }

	let bin = []
	let inc = ''

	let projectName = ""
	let projectMode = MODES.GBC
	let pals = []
	let sets = []
	let maps = []

	let i = 0
	let len = 0
	let count = 0

	// header
	let version = a[i++]
	if (version != VERSION) {
		console.error('Project version not supported; expected ' + VERSION + ' but got ' + version + '. You may need a newer version of this script. Aborting')
		process.exit(1)
	}
	len = a[i++]
	projectName = decodeString(a, i, len)
	i += len
	projectMode = a[i++]
	if (projectMode != MODES.GBC) {
		console.error('Project mode not supported. You may need a newer version of this script. Aborting')
		process.exit(1)
	}

	// palettes
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let pal = { name: '', flags: 0, colors: [] }
		len = a[i++]
		pal.name = decodeString(a, i, len)
		i += len
		pal.flags = a[i++]
		for (let k = 0; k < 4; k++) {
			let color = [a[i++], a[i++], a[i++]]
			pal.colors.push(color)
		}
		pals.push(pal)
	}

	// tilesets
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let set = { name: '', flags: 0, tiles: [] }
		len = a[i++]
		set.name = decodeString(a, i, len)
		i += len
		set.flags = a[i++]
		for (let k = 0; k < 128; k++) {
			let tile = { pal: 0, colors: [] }
			tile.pal = a[i++]
			for (let l = 0; l < 64; l += 2) {
				let p = a[i++]
				tile.colors[l + 0] = p & 0x0F
				tile.colors[l + 1] = (p & 0xF0) >> 4
			}
			set.tiles.push(tile)
		}
		sets.push(set)
	}

	// maps
	count = a[i++]
	for (let j = 0; j < count; j++) {
		let map = { name: '', flags: 0, set: 0, tiles: [] }
		len = a[i++]
		map.name = decodeString(a, i, len)
		i += len
		map.flags = a[i++]
		map.set = a[i++]
		for (let k = 0; k < 1024; k++) {
			let tile = { tile: 0, pal: 0 }
			tile.tile = a[i++]
			tile.pal = a[i++]
			map.tiles.push(tile)
		}
		maps.push(map)
	}

	inc += ';\n'
	inc += '; Auto-generated file; any changes will be overwritten\n'
	inc += '; Exported from Pixie project "' + projectName + '"\n'
	inc += ';\n'

	for (let pal of pals) {
		if ((pal.flags & DATA_FLAGS.EXPORT) == 0) continue
		let label = pal.name.replace(/\s/g, '')
		inc += '\nsection "Palette - ' + pal.name + '", romX\n'
		inc += 'PAL_' + label + ': incbin "' + path.basename(binPath) + '", ' + bin.length + ', ' + PAL_SIZE + '\n'
		for (let c of pal.colors) {
			let v = c[0] | c[1] << 5 | c[2] << 10
			bin.push((v & 0x00FF) >> 0)
			bin.push((v & 0xFF00) >> 8)
		}
		inc += 'PAL_' + label + '_END:\n'
	}

	for (let set of sets) {
		if ((set.flags & DATA_FLAGS.EXPORT) == 0) continue
		let label = set.name.replace(/\s/g, '')
		inc += '\nsection "Tileset - ' + set.name + '", romX\n'
		inc += 'SET_' + label + ': incbin "' + path.basename(binPath) + '", ' + bin.length + ', ' + SET_SIZE + '\n'
		for (let t of set.tiles) {
			for (let i = 0; i < 64; i += 8) {
				let l = 0
				l |= (t.colors[i + 0] & 0b01) << 7
				l |= (t.colors[i + 1] & 0b01) << 6
				l |= (t.colors[i + 2] & 0b01) << 5
				l |= (t.colors[i + 3] & 0b01) << 4
				l |= (t.colors[i + 4] & 0b01) << 3
				l |= (t.colors[i + 5] & 0b01) << 2
				l |= (t.colors[i + 6] & 0b01) << 1
				l |= (t.colors[i + 7] & 0b01) << 0
				bin.push(l)
				let h = 0
				h |= (t.colors[i + 0] & 0b10) << 6
				h |= (t.colors[i + 1] & 0b10) << 5
				h |= (t.colors[i + 2] & 0b10) << 4
				h |= (t.colors[i + 3] & 0b10) << 3
				h |= (t.colors[i + 4] & 0b10) << 2
				h |= (t.colors[i + 5] & 0b10) << 1
				h |= (t.colors[i + 6] & 0b10) << 0
				h |= (t.colors[i + 7] & 0b10) >>> 1
				bin.push(h)
			}
		}
		inc += 'SET_' + label + '_END:\n'
		inc += 'SET_ATTRS_' + label + ': incbin "' + path.basename(binPath) + '", ' + bin.length + ', ' + MAP_SIZE + '\n'
		let palList = set.tiles.map(t => t.pal).filter((v, i, a) => a.indexOf(v) == i)
		for (let t of set.tiles) bin.push(palList.indexOf(t.pal) & 0b00000111)
		inc += 'SET_ATTRS_' + label + '_END:\n'
		inc += 'SET_PALS_' + label + ':\n'
		for (let p of palList) {
			if ((pals[p].flags & DATA_FLAGS.EXPORT) == 0) {
				inc += '\tdw PAL_' + pals[0].name.replace(/\s/g, '') + '\n'
			} else {
				inc += '\tdw PAL_' + pals[p].name.replace(/\s/g, '') + '\n'
			}
		}
		inc += '\tdw 0\n'
		inc += 'SET_PALS_' + label + '_END:\n'
	}

	for (let map of maps) {
		if ((map.flags & DATA_FLAGS.EXPORT) == 0) continue
		let label = map.name.replace(/\s/g, '')
		inc += '\nsection "Map - ' + map.name + '", romX\n'
		inc += 'MAP_' + label + ': incbin "' + path.basename(binPath) + '", ' + bin.length + ', ' + MAP_SIZE + '\n'
		for (let t of map.tiles) bin.push(0x80 + t.tile)
		inc += 'MAP_' + label + '_END:\n'
		inc += 'MAP_ATTRS_' + label + ': incbin "' + path.basename(binPath) + '", ' + bin.length + ', ' + MAP_SIZE + '\n'
		let palList = map.tiles.map(t => t.pal).filter((v, i, a) => a.indexOf(v) == i)
		for (let t of map.tiles) bin.push(palList.indexOf(t.pal) & 0b00000111)
		inc += 'MAP_ATTRS_' + label + '_END:\n'
		inc += 'MAP_PALS_' + label + ':\n'
		for (let p of palList) {
			if ((pals[p].flags & DATA_FLAGS.EXPORT) == 0) {
				inc += '\tdw PAL_' + pals[0].name.replace(/\s/g, '') + '\n'
			} else {
				inc += '\tdw PAL_' + pals[p].name.replace(/\s/g, '') + '\n'
			}
		}
		inc += '\tdw 0\n'
		inc += 'MAP_PALS_' + label + '_END:\n'
	}

	fs.writeFile(binPath, Buffer.from(bin), err => {
		if (err) throw err
	})
	fs.writeFile(incPath, inc, 'utf8', err => {
		if (err) throw err
	})
})