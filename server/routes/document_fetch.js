const mongodb = require('mongodb');
const ObjectId = require('mongodb').ObjectID;

const mongoURI = 'mongodb://Matus:strongPassword@localhost:27017';
const dbName = 'mongouploads';
const collection = 'uploads';
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  db: { authSource: dbName }
}
let bucket

const streamReadable = stream => {
  stream.pause();
  return new Promise((resolve, reject) => {
    stream.once('error', reject);
    stream.once('readable', () => resolve(stream));
  });
};


mongodb.MongoClient.connect(mongoURI+"/"+dbName, mongoOptions, function(err, client) {
  if(err) {
    throw err;
  }
  const db = client.db(dbName);
  bucket = new mongodb.GridFSBucket(db, {
    chunkSizeBytes: 1024,
    bucketName: collection
  });
});



export default function (server) {
  server.route({
    path: '/api/kibana-enhanced-table/datafetch/{documentId}',
    method: ['GET'],
    handler: async (req, reply) => {
      // const documentId = req.query.docId.toString();
      // console.log(documentId);
      const stream = bucket.openDownloadStream(new ObjectId(req.params.documentId));
      const readyStream = await streamReadable(stream);
      return reply.response(readyStream);
      // return response;
      // reply(bucket.openDownloadStream(req.query.docId));
      // bucket.openDownloadStream(req.query.docId).pipe(reply.response());
      // return "Hello";
    },
  });
}
