const Busboy = require('busboy');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

const storage = new Storage();

exports.uploadFile = (req, res) => {
  if (req.method !== 'POST') {
    return res.sendStatus(405);
  }

  const busboy = new Busboy({headers: req.headers});


  const fileWrites = [];
  busboy.on('file', (fieldname, file, filename) => {
    const writeStream = storage.bucket('my-test-bucket-123').file(uuidv4()).createWriteStream({
      contentType: 'image/jpeg',
    });

    file.pipe(writeStream);

    fileWrites.push(new Promise((resolve, reject) => {
      file.on('end', () => writeStream.end());
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    }));
    
  });

  busboy.on('finish', async () => {
    await Promise.all(fileWrites);
    return res.sendStatus(201);
  });
  
  busboy.end(req.rawBody);
};
