const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.js')) {
      babel.transformFileSync(full, {
        presets: ['babel-preset-expo'],
        babelrc: false,
        configFile: false,
      });
      console.log(path.relative(process.cwd(), full));
    }
  }
}

walk(path.join(process.cwd(), 'src'));
console.log('syntax ok');
