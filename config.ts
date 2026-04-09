import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url as string);
const __dirname = path.dirname(__filename);





global.owner = [] 












global.mainOwner = '628xxxxxxxxxx'; 

global.prefa = ['', '!', '.', ',', '🐤', '🗿'];
global.prefix = '.';   




global.thumbnail    = null; 
global.thumbnailUrl = 'https://api.deline.web.id/lWF5z2DXzM.png';

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
});
