const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'dist');

fs.readdir(directory, (err, files) => {
  if (err) {
    console.error('Error listing directory contents.', err);
    return;
  }

  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(directory, file);
      const newFilePath = filePath.replace('.js', '.mjs');

      fs.rename(filePath, newFilePath, err => {
        if (err) {
          console.error(`Error renaming file: ${file}`, err);
        } else {
          console.log(`Renamed ${file} to ${path.basename(newFilePath)}`);
        }
      });
    }
  });
});
