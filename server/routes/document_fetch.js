import { schema } from '@kbn/config-schema';
import MongoConnector from "../connector/mongo_client";

const mongoConnector = new MongoConnector();
mongoConnector.connect();

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
      const readyStream = await mongoConnector.downloadStream(req.params.documentId);
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
        mongoConnector.findOneDocument(req.params.documentId).then((resp, err) => {
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
      const readyStream = await mongoConnector.downloadStream(req.params.documentId);
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
