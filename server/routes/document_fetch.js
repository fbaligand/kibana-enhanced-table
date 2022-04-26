import { schema } from '@kbn/config-schema';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';

const dbconf = require('../dbconfig.json');

const mongoURI = dbconf.db.type+'://'+dbconf.db.host+':'+dbconf.db.port;
const mongoOptions = dbconf.db.mongoOptions;
const dbName = dbconf.db.dbName;
const collectionName = dbconf.db.collection;
const collectionNameFiles = dbconf.db.collection+'.files';
let bucket;
let db;
let collection;

const streamReadable = stream => {
  stream.pause();
  return new Promise((resolve, reject) => {
    stream.once('error', reject);
    stream.once('readable', () => resolve(stream));
  });
};

MongoClient.connect(mongoURI, mongoOptions).then((client) => {
  db = client.db(dbName);
  collection = db.collection(collectionName);
  bucket = new GridFSBucket(db, {
    chunkSizeBytes: 1024,
    bucketName: collectionName
  });
}).catch(err => console.error(err));

export default function (router) {
  const validate = {
    params: schema.object({
      documentId: schema.string(),
    }),
  };

  router.get({
      path: '/api/kibana-enhanced-table/datafetch/{documentId}/stream',
      validate,
    },
    async (context, req, res) => {
      const stream = bucket.openDownloadStream(new ObjectId(req.params.documentId));
      const readyStream = await streamReadable(stream);
      return res.ok({
        body: readyStream,
        headers: {
          'content-type': req.query.contentType
        }
      });
    },
  );

  router.get({
      path: '/api/kibana-enhanced-table/datafetch/{documentId}/find',
      validate,
    },
    (context, req, res) => {

      return new Promise((resolve, reject) => {
        db.collection(collectionNameFiles).findOne({'_id': new ObjectId(req.params.documentId)}).then((resp, err) => {
          if (err) return reject(err);
          if (resp == null) resp = { message: 'File not found!' };
          resolve(res.ok({ body: resp }));
        }).catch(err => {
          reject(console.error(err));
        });
      }).catch((err) => {
        console.error(err);
      });
    }
  );
  router.get({
      path: '/api/kibana-enhanced-table/datafetch/{documentId}/download',
      validate,
    },
    async (context, req, res) => {
      const stream = bucket.openDownloadStream(new ObjectId(req.params.documentId));
      const readyStream = await streamReadable(stream);
      return res.ok({
        body: readyStream,
        headers: {
          'Content-Disposition': 'attachment; filename="'+req.query.filename+'"',
          'content-type': 'application/octet-stream'
        }
      });
    }
  );
}
