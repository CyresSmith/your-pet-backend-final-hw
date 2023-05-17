const { Notice, User } = require('../schemas');

const { httpError, ctrlWrapper } = require('../helpers');

const listAllNotice = async (req, res) => {
  const result = await Notice.find({}, '-createdAt -updatedAt');

  if (!result) {
    throw httpError(404, `Notices not found`);
  }

  res.json(result);
};

const getNoticeByCategory = async (req, res) => {
  const { category } = req.params;

  const result = await Notice.find({ category });

  if (!result) {
    throw httpError(404, `${category} not found`);
  }

  res.json(result);
};

const getNoticeById = async (req, res) => {
  const { id } = req.params;

  const result = await Notice.findById(id);

  if (!result) {
    throw httpError(404, `${id} not found`);
  }

  res.json(result);
};

const addNotice = async (req, res) => {
  const { _id: owner } = req.user;

  const result = await Notice.create({
    ...req.body,
    owner,
    noticeImageURL: req.file.path,
  });

  if (!result) {
    throw httpError(404, `Image not found`);
  }

  res.status(201).json(result);
};

// const deleteNotice = async (req, res) => {
//   const { id } = req.params;
//   const result = await Notice.findByIdAndDelete(id);
//   if (!result) {
//     throw httpError(404, `Notice with id:${id} not found`);
//   }
//   res.json({
//     message: `Notice with id:${id} deleted`,
//   });
// };

const updateFavorite = async (req, res) => {
  const { _id, favorite } = req.user;
  const { id } = req.params;

  const updFavorite = () => {
    if (favorite.includes(id)) {
      return { $pull: { favorite: id } };
    }
    return { $push: { favorite: id } };
  };

  const result = await User.findByIdAndUpdate(_id, updFavorite(), {
    new: true,
  });

  if (!result) {
    throw httpError(404, `Notice with id:${id} not found`);
  }

  res.status(200).json(result);
};

const findNoticeByQuery = async (req, res) => {
  const { query = null } = req.query;

  if (!query) {
    throw httpError(400, 'Query parameter required');
  }

  const result = await Notice.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });

  if (!result) {
    throw httpError(404);
  }

  res.status(200).json(result);
};

// const updateFavoriteDelete = async (req, res) => {
//   const { id } = req.params;
//   const result = await Notice.findByIdAndUpdate(id, req.body, { new: false });
//   if (!result) {
//     throw httpError(404, `Notice with id:${id} not found`);
//   }
//   res.json(result);
// };

// const deleteOwnerAdded = async (req, res) => {
//   const { id } = req.params;
//   const result = await Notice.findByIdAndUpdate(id, req.body, { new: false });
//   if (!result) {
//     throw httpError(404, `Notice with id:${id} not found`);
//   }
//   res.json(result);
// };

// const litsOwnerAdded = async (req, res) => {
//   console.log('Owner added');
//   const { _id: owner } = req.user;
//   const result = await Notice.find({ owner }).populate('owner');
//   res.json(result);
// };

// const litsOwnerFavorite = async (req, res) => {
//   const { _id: owner } = req.user;
//   const result = await Notice.find({ owner });
//   if (!result) {
//     throw httpError(404, `Favorite notices list is empty`);
//   }
//   res.json(result);
// };

module.exports = {
  listAllNotice: ctrlWrapper(listAllNotice),
  getNoticeByCategory: ctrlWrapper(getNoticeByCategory),
  addNotice: ctrlWrapper(addNotice),
  // deleteNotice: ctrlWrapper(deleteNotice),
  // litsOwnerFavorite: ctrlWrapper(litsOwnerFavorite),
  updateFavorite: ctrlWrapper(updateFavorite),
  getNoticeById: ctrlWrapper(getNoticeById),
  findNoticeByQuery: ctrlWrapper(findNoticeByQuery),
  // litsOwnerAdded: ctrlWrapper(litsOwnerAdded),
  // deleteOwnerAdded: ctrlWrapper(deleteOwnerAdded),
};
