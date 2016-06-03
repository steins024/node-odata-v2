export default (req, MongooseModel) => new Promise((resolve, reject) => {
  MongooseModel.find({id: req.params.id})
    .then(entity => {
      if (!entity) {
        return reject({status: 404}, {text: 'Not found.'});
      }
      return resolve({ entity });
    })
    .catch(err => {
      return reject(err);
    });
});
