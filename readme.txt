    ____  _      _    
   / __ \(_)  __(_)__ 
  / /_/ / / |/_/ / _ \
 / ____/ />  </ /  __/
/_/   /_/_/|_/_/\___/ 
                      

Pixie is a graphics application for creating sprites, palettes, tilesets, and tile maps for the Gameboy and Gameboy Color. It outputs project files which can then be converted into binary blobs and RGBDS-style assembly include files. 


* Quickstart *

1. Start a new project (File > New Project)
2. Name your project in the Project Options section (upper left)
3. Create and edit tilesets, palettes, and maps as desired
4. Save your project somewhere (File > Save Project...)
5. File > Download Conversion Script
6. Run the script with the command:
    `node pixie-convert.js -o "path/to/whatever.bin" -i "path/to/includes/whatever.inc" "path/to/yourProject.pixie-project"`
    (change the paths and filenames to match your ASM project's structure)
7. TBD (project implementation steps)


* Key Concepts *

Palette: an array of four RGB colors, limited to valid GBC colors. You can add up to 256 palettes per project.

Tile: an 8x8 pixel image within a tileset whose colors are defined relative to a palette.

Tileset: a 16x8 group of tiles used to paint maps with. You can add up to 256 tilesets per project.

Map: a 32x32 group of tile and palette indices, drawn from a single tileset and up to 8 palettes. You can add up to 256 maps per project.

