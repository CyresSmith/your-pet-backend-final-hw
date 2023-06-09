const { Notice, User } = require('../schemas');
const { httpError, ctrlWrapper, skipPages, totalPages } = require('../helpers');

/**
 * ============================ Все объявления
 */
const listAllNotice = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await Notice.find({}, '-createdAt -updatedAt', {
    skip: skipPages(page, limit),
    limit,
  }).populate(
    'owner',
    '-token -password -favorite -verify -verifycationToken -createdAt -updatedAt'
  );

  const total = await Notice.countDocuments();

  if (!result) {
    throw httpError(404, `Notices not found`);
  }

  res.json({
    data: result,
    currentPage: page,
    totalPages: totalPages(total, limit),
  });
};

/**
 * ============================ Поиск объявлений
 */
const findNotices = async (req, res) => {
  const { query = null, category = null, page = 1, limit = 10 } = req.query;

  if (!query || !category) {
    throw httpError(400, 'Query and category parameters required');
  }

  const result = await Notice.find(
    { category, $text: { $search: query } },
    '-createdAt -updatedAt',
    {
      skip: skipPages(page, limit),
      limit,
    }
  ).populate(
    'owner',
    '-token -password -favorite -verify -verifycationToken -createdAt -updatedAt'
  );

  const total = await Notice.countDocuments({
    category,
    $text: { $search: query },
  });

  if (result.length === 0) {
    throw httpError(404, `Notices not found`);
  }

  res.status(200).json({
    data: result,
    currentPage: page,
    totalPages: totalPages(total, limit),
  });
};

/**
 * ============================ Получение всех объявлений по категории
 */
const getNoticeByCategory = async (req, res) => {
  const { category } = req.params;
  const {
    page = 1,
    limit = 10,
    sex = null,
    minage = null,
    maxage = null,
  } = req.query;

  const today = new Date();
  const minBirthday = new Date();
  const maxBirthday = new Date();

  minBirthday.setMonth(today.getMonth() - parseInt(minage) * 12);
  maxBirthday.setMonth(today.getMonth() - parseInt(maxage) * 12);

  const filters = { category };

  if (sex) {
    filters.sex = sex;
  }

  const birthday = {};

  if (maxage) {
    birthday.$gte = maxBirthday;
  }

  if (minage) {
    birthday.$lte = minBirthday;
  }

  if (minage || maxage) {
    filters.birthday = birthday;
  }

  const result = await Notice.find(filters, '-createdAt -updatedAt', {
    skip: skipPages(page, limit),
    limit,
  }).populate(
    'owner',
    '-token -password -favorite -verify -verifycationToken -createdAt -updatedAt'
  );

  const total = await Notice.countDocuments(filters);

  if (!category) {
    throw httpError(400, `Category required`);
  }

  if (result === []) {
    throw httpError(404, 'Notices with the given parameters were not found');
  }

  if (!result) {
    throw httpError(404);
  }

  res.json({
    data: result,
    currentPage: page,
    totalPages: totalPages(total, limit),
  });
};

/**
 * ============================ Получение объявления по id
 */
const getNoticeById = async (req, res) => {
  const { id: _id } = req.params;

  const result = await Notice.findById(_id, '-createdAt -updatedAt').populate(
    'owner',
    '-token -password -favorite -verify -verifycationToken -createdAt -updatedAt'
  );

  if (!result) {
    throw httpError(404, `${_id} not found`);
  }

  res.json(result);
};

/**
 * ============================ Добавление в favorite
 */
const addToFavorite = async (req, res) => {
  const { id } = req.params;
  const { _id, favorite } = req.user;

  if (favorite.includes(id)) {
    throw httpError(400, `Notice already in favorite`);
  }

  const result = await User.findByIdAndUpdate(_id, { $push: { favorite: id } });

  if (!result) {
    throw httpError(404, `Notice with id:${id} not found`);
  }

  res.status(200).json({ message: `${id} Successfully added to favorite` });
};

/**
 * ============================ Удаление из favorite
 */
const removeFromFavorite = async (req, res) => {
  const { id } = req.params;
  const { _id, favorite } = req.user;

  if (!favorite.includes(id)) {
    throw httpError(400, `Notice not in favorite`);
  }

  const result = await User.findByIdAndUpdate(_id, { $pull: { favorite: id } });

  if (!result) {
    throw httpError(404, `Notice with id:${id} not found`);
  }

  res.status(200).json({ message: `Successfully removed from favorite` });
};

/**
 * ============================ Получение всех favorite
 */
const allFavorite = async (req, res) => {
  const { _id } = req.user;

  const result = await User.findById(_id, '', {
    fields: {
      favorite: 1,
    },
  }).populate({
    path: 'favorite',
    model: Notice,
    select: '-createdAt -updatedAt',
    populate: {
      path: 'owner',
      model: User,
      select:
        '-token -password -favorite -verify -verifycationToken -createdAt -updatedAt',
    },
  });

  if (result.favorite.length === 0) {
    throw httpError(404, `Favorite notices list is empty`);
  }

  if (!result) {
    throw httpError(404, `Favorite notices list is empty`);
  }

  res.json(result.favorite);
};

/**
 * ============================ Добавление объявления
 */
const addNotice = async (req, res) => {
  const { _id: owner } = req.user;

  const result = await Notice.create({
    ...req.body,
    owner,
    noticeImage: req.file.path,
  });

  if (!req.body || req.body === {}) {
    throw httpError(400);
  }
  if (!result) {
    throw httpError(404, `Image not found`);
  }

  res.status(201).json(result);
};

/**
 * ============================ Удаление объявления
 */
const deleteNotice = async (req, res) => {
  const { id: _id } = req.params;
  const { _id: owner } = req.user;

  const result = await Notice.findByIdAndDelete({ _id });

  if (!result) {
    throw httpError(404, `Notice not found`);
  }

  res.json({
    message: `Notice successfully deleted`,
  });
};

/**
 * ============================ Мои объявления
 */
const myNotices = async (req, res) => {
  const { _id: owner } = req.user;
  const { page = 1, limit = 10, query = null } = req.query;

  const filter = () => {
    if (query === null) {
      return { owner };
    }

    return { owner, $text: { $search: query } };
  };

  const result = await Notice.find(filter(), '-createdAt -updatedAt', {
    skip: skipPages(page, limit),
    limit,
  });

  const total = await Notice.countDocuments(filter());

  if (result.length === 0) {
    throw httpError(404, `User did not create notices`);
  }

  if (!result) {
    throw httpError(404, `Notice not found`);
  }

  res.json({
    data: result,
    currentPage: page,
    totalPages: totalPages(total, limit),
  });
};

module.exports = {
  listAllNotice: ctrlWrapper(listAllNotice),
  findNotices: ctrlWrapper(findNotices),
  getNoticeByCategory: ctrlWrapper(getNoticeByCategory),
  getNoticeById: ctrlWrapper(getNoticeById),
  addToFavorite: ctrlWrapper(addToFavorite),
  removeFromFavorite: ctrlWrapper(removeFromFavorite),
  allFavorite: ctrlWrapper(allFavorite),
  addNotice: ctrlWrapper(addNotice),
  deleteNotice: ctrlWrapper(deleteNotice),
  myNotices: ctrlWrapper(myNotices),
};
