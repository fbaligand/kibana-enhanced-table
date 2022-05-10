import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
const dbconf = require('../dbconfig.json');

const mongoURI = dbconf.db.type+'://'+dbconf.db.host+':'+dbconf.db.port;
const mongoOptions = dbconf.db.mongoOptions;
const dbName = dbconf.db.dbName;
const collectionName = dbconf.db.collection;
const collectionNameFiles = dbconf.db.collection+'.files';

export default class MongoConnector {

  mongoURI;
  mongoOptions;
  dbName;
  collectionName;
  bucket;
  db;
  collection;

  constructor() {
    this.mongoURI = mongoURI;
    this.mongoOptions = mongoOptions;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  connect() {
    MongoClient.connect(this.mongoURI, this.mongoOptions).then((client) => {
      this.db = client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      this.bucket = new GridFSBucket(this.db, {
        chunkSizeBytes: 1024,
        bucketName: this.collectionName
      });
    }).catch(err => console.error(err));
  }

  async downloadStream(documentId) {
    const stream = this.bucket.openDownloadStream(new ObjectId(documentId));
    return await this.streamReadable(stream);
  }

  findOneDocument(documentId){
      return this.db.collection(collectionNameFiles).findOne({'_id': new ObjectId(documentId)});
  }

  streamReadable(stream) {
    stream.pause();
    return new Promise((resolve, reject) => {
      stream.once('error', reject);
      stream.once('readable', () => resolve(stream));
    });
  }
}
