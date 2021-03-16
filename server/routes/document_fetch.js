const mongodb = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const dbconf = require('../dbconfig.json').db;

const user = dbconf.auth.name;
const password = dbconf.auth.password;
const mongoURI = dbconf.type+"://"+dbconf.host+":"+dbconf.port;
const dbName = dbconf.dbName;
const collectionName = dbconf.collection;
const collectionNameFiles = dbconf.collection+'.files';
let bucket;
let db;
let collection;

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  db: { authSource: dbName },
  auth: {
    user: user,
    password: password
  }
}

const streamReadable = stream => {
  stream.pause();
  return new Promise((resolve, reject) => {
    stream.once('error', reject);
    stream.once('readable', () => resolve(stream));
  });
};

try {
  mongodb.MongoClient.connect(mongoURI, mongoOptions, function(err, client) {
    if(err) {
      throw err;
    }
    db = client.db(dbName);
    collection = db.collection(collectionName);
    bucket = new mongodb.GridFSBucket(db, {
      chunkSizeBytes: 1024,
      bucketName: collectionName
    });
  });
} catch (err) {
  console.error(err);
}

export default function (server) {
  server.route([
    {
      path: '/api/kibana-enhanced-table/datafetch/{documentId}/stream',
      method: ['GET'],
      handler: async (req, reply) => {
        const stream = bucket.openDownloadStream(new ObjectId(req.params.documentId));
        const readyStream = await streamReadable(stream);
        return reply.response(readyStream).type(req.query.contentType);
      },
    },
    {
      path: '/api/kibana-enhanced-table/datafetch/{documentId}/find',
      method: ['GET'],
      handler: (req, reply) => {
        return new Promise((resolve, reject) => {
          db.collection(collectionNameFiles).findOne({'_id': new ObjectId(req.params.documentId)}).then((res, err) => {
            if (err) return reject(err);
            if (res == null) res = { message: "File not found!" };
            resolve(reply.response(res));
          });
        }).catch((err) => { reply.response(err)});
      }
    },
    {
      path: '/api/kibana-enhanced-table/datafetch/{documentId}/download',
      method: ['GET'],
      handler: async (req, reply) => {
        const stream = bucket.openDownloadStream(new ObjectId(req.params.documentId));
        const readyStream = await streamReadable(stream);
        return reply.response(readyStream).type('application/octet-stream').header('Content-Disposition','attachment; filename=\"'+req.query.filename+'\"');
      },
    }
    ]);
}
